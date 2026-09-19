import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import dgram from 'dgram';

declare global {
  var __sg_samp_manager: SampManager | undefined;
}

export class SampManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private rconPassword = '';
  private rconPort = 7777;
  private serverPath: string;
  private pidFilePath: string;
  private activeCwd: string | null = null;
  private logTailFd: number | null = null;
  private logTailInterval: NodeJS.Timeout | null = null;
  private logTailPos: number = 0;
  private constructor() {
    super();
    this.serverPath = path.join(process.cwd(), 'samp-server');
    this.pidFilePath = path.join(this.serverPath, 'server.pid');
  }

  public static getInstance(): SampManager {
    if (!globalThis.__sg_samp_manager) {
      globalThis.__sg_samp_manager = new SampManager();
    }
    return globalThis.__sg_samp_manager;
  }

  public getPlatform(): string {
    return process.platform;
  }

  public getPid(): number | null {
    if (this.process?.pid) return this.process.pid;
    if (fs.existsSync(this.pidFilePath)) {
      try {
        const raw = fs.readFileSync(this.pidFilePath, 'utf8').trim();
        const pid = parseInt(raw, 10);
        if (!isNaN(pid) && pid > 0) {
          try {
            process.kill(pid, 0); // Check if process is alive
            return pid;
          } catch {
            // Stale PID file
            fs.unlinkSync(this.pidFilePath);
          }
        }
      } catch {}
    }
    return null;
  }

  public isRunning(): boolean {
    return this.getPid() !== null;
  }

  public detectDefaultExecutable(): string {
    const isWindows = process.platform === 'win32';
    if (!fs.existsSync(this.serverPath)) {
      return isWindows ? 'omp-server.exe' : './omp-server';
    }

    if (isWindows) {
      if (fs.existsSync(path.join(this.serverPath, 'omp-server.exe'))) return 'omp-server.exe';
      if (fs.existsSync(path.join(this.serverPath, 'samp-server.exe'))) return 'samp-server.exe';
      if (fs.existsSync(path.join(this.serverPath, 'wins', 'omp-server.exe'))) return 'wins/omp-server.exe';
      if (fs.existsSync(path.join(this.serverPath, 'wins', 'samp-server.exe'))) return 'wins/samp-server.exe';
      return 'omp-server.exe';
    } else {
      // Linux / Debian
      if (fs.existsSync(path.join(this.serverPath, 'omp-server'))) return './omp-server';
      if (fs.existsSync(path.join(this.serverPath, 'start.sh'))) return './start.sh';
      if (fs.existsSync(path.join(this.serverPath, 'samp03svr'))) return './samp03svr';
      if (fs.existsSync(path.join(this.serverPath, 'linux', 'omp-server'))) return 'linux/omp-server';
      if (fs.existsSync(path.join(this.serverPath, 'linux', 'samp03svr'))) return 'linux/samp03svr';
      return './omp-server';
    }
  }

  public async startServer(customExecutable?: string): Promise<{ pid: number; executable: string }> {
    if (this.isRunning()) {
      throw new Error(`Server is already running (PID: ${this.getPid()}). Stop it first.`);
    }

    if (!fs.existsSync(this.serverPath)) {
      fs.mkdirSync(this.serverPath, { recursive: true });
    }

    const isWindows = process.platform === 'win32';
    let executable = customExecutable && customExecutable.trim() !== ''
      ? customExecutable.trim()
      : this.detectDefaultExecutable();

    const parts = executable.split(/\s+/);
    let cmd = parts[0];
    const args = parts.slice(1);
    let execCwd = this.serverPath;

    // Resolve full path if relative or contained
    let fullCmdPath = cmd;
    if (cmd.startsWith('./') || cmd.startsWith('.\\') || (!cmd.includes('/') && !cmd.includes('\\'))) {
      const cleanName = cmd.replace(/^(\.\/|\.\\)/, '');
      fullCmdPath = path.join(this.serverPath, cleanName);
    } else if (path.isAbsolute(cmd)) {
      fullCmdPath = cmd;
    } else {
      fullCmdPath = path.resolve(this.serverPath, cmd);
    }

    if (fs.existsSync(fullCmdPath)) {
      execCwd = path.dirname(fullCmdPath);
    }

    this.activeCwd = execCwd;
    this.extractRconConfig();
    this.updateMysqlConfig();

    // Linux / Debian preparations
    let spawnCmd = fullCmdPath;
    let spawnArgs = args;

    if (!isWindows) {
      if (fs.existsSync(fullCmdPath)) {
        try {
          fs.chmodSync(fullCmdPath, 0o755);
        } catch (e) {
          console.warn('[SampManager] Could not chmod executable:', e);
        }

        // If it's a bash script, sanitize CRLF -> LF and invoke with /bin/bash
        if (fullCmdPath.endsWith('.sh')) {
          try {
            const scriptContent = fs.readFileSync(fullCmdPath, 'utf8');
            if (scriptContent.includes('\r\n')) {
              fs.writeFileSync(fullCmdPath, scriptContent.replace(/\r\n/g, '\n'), 'utf8');
            }
          } catch {}

          spawnCmd = '/bin/bash';
          spawnArgs = [fullCmdPath, ...args];
        }
      }
    }

    console.log(`[SampManager] Launching: ${spawnCmd} in ${execCwd}`);

    const logFileName = this.getLogFileName(execCwd);
    const logFd = fs.openSync(path.join(execCwd, logFileName), 'a');

    const env = { ...process.env };
    if (!isWindows) {
      env.LD_LIBRARY_PATH = `${execCwd}:${env.LD_LIBRARY_PATH || ''}`;
    }

    this.process = spawn(spawnCmd, spawnArgs, {
      cwd: execCwd,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false,
      env
    });

    if (this.process.stdout) {
      this.process.stdout.on('data', (data) => {
        try { fs.writeSync(logFd, data); } catch {}
      });
    }
    if (this.process.stderr) {
      this.process.stderr.on('data', (data) => {
        try { fs.writeSync(logFd, Buffer.concat([Buffer.from('[STDERR] '), data])); } catch {}
      });
    }

    // Unref so the child process can live independently of the Node event loop
    this.process.unref();

    const activePid = this.process.pid;
    if (activePid) {
      fs.writeFileSync(this.pidFilePath, String(activePid), 'utf8');
    }

    this.process.on('close', (code) => {
      try { fs.closeSync(logFd); } catch {}
      this.process = null;
      this.stopLogTail();
      try {
        if (fs.existsSync(this.pidFilePath)) fs.unlinkSync(this.pidFilePath);
      } catch {}
      this.emit('stopped', code);
    });

    this.process.on('error', (err) => {
      this.emit('error_log', `Failed to start process: ${err.message}`);
      this.process = null;
      this.stopLogTail();
      try {
        if (fs.existsSync(this.pidFilePath)) fs.unlinkSync(this.pidFilePath);
      } catch {}
      this.emit('stopped', -1);
    });

    this.startLogTail(execCwd);

    this.emit('started');
    return { pid: activePid || 0, executable };
  }

  public async stopServer(): Promise<boolean> {
    const pid = this.getPid();
    this.stopLogTail();

    if (!pid) {
      this.process = null;
      try {
        if (fs.existsSync(this.pidFilePath)) fs.unlinkSync(this.pidFilePath);
      } catch {}
      return false;
    }

    const isWindows = process.platform === 'win32';

    try {
      if (isWindows) {
        const { execSync } = require('child_process');
        try {
          execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
        } catch (e) {
          console.warn(`[SampManager] taskkill failed, fallback to process.kill: ${e}`);
          process.kill(pid, 'SIGKILL');
        }
      } else {
        // Kill the whole process group on Linux/Debian
        try {
          process.kill(-pid, 'SIGTERM');
        } catch {
          process.kill(pid, 'SIGTERM');
        }
      }
    } catch (e: any) {
      console.warn(`[SampManager] kill failed: ${e.message}`);
    }

    if (!isWindows) {
      // Wait up to 1.5 seconds for clean exit on linux, otherwise SIGKILL
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        process.kill(pid, 0); // Check if still alive
        // Still alive -> force kill
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {
          process.kill(pid, 'SIGKILL');
        }
      } catch {
        // Process already terminated cleanly
      }
    }

    this.process = null;
    try {
      if (fs.existsSync(this.pidFilePath)) fs.unlinkSync(this.pidFilePath);
    } catch {}

    this.emit('stopped', 0);
    return true;
  }

  public async restartServer(customExecutable?: string): Promise<{ pid: number; executable: string }> {
    await this.stopServer();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.startServer(customExecutable);
  }

  public ensureLogTail() {
    if (this.isRunning() && !this.logTailInterval) {
      this.startLogTail(this.activeCwd || this.serverPath);
    }
  }

  private getLogFileName(execCwd: string): string {
    let logFileName = 'server_log.txt';
    try {
      const configPath = path.join(execCwd, 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (configData?.logging?.file) {
          logFileName = configData.logging.file;
        }
      }
    } catch (e) {
      // fallback
    }
    return logFileName;
  }

  private startLogTail(execCwd: string) {
    this.stopLogTail();
    
    const logFileName = this.getLogFileName(execCwd);
    const logPath = path.join(execCwd, logFileName);
    
    // Create it if it doesn't exist so we can watch it
    if (!fs.existsSync(logPath)) {
      try { fs.writeFileSync(logPath, ''); } catch {}
    }

    try {
      this.logTailFd = fs.openSync(logPath, 'r');
      const stats = fs.fstatSync(this.logTailFd);
      this.logTailPos = stats.size; // start tailing from current end
      
      this.logTailInterval = setInterval(() => {
        if (this.logTailFd === null) return;
        try {
          const currentStats = fs.fstatSync(this.logTailFd);
          if (currentStats.size > this.logTailPos) {
            const length = currentStats.size - this.logTailPos;
            const buf = Buffer.alloc(length);
            fs.readSync(this.logTailFd, buf, 0, length, this.logTailPos);
            this.logTailPos = currentStats.size;
            this.emit('log', buf.toString('utf8'));
          } else if (currentStats.size < this.logTailPos) {
            this.logTailPos = currentStats.size; // file truncated
          }
        } catch (e) {
          // Ignore read errors
        }
      }, 500);
    } catch (e) {
      console.warn('[SampManager] Could not open server_log.txt for tailing:', e);
    }
  }

  private stopLogTail() {
    if (this.logTailInterval) {
      clearInterval(this.logTailInterval);
      this.logTailInterval = null;
    }
    if (this.logTailFd !== null) {
      try { fs.closeSync(this.logTailFd); } catch {}
      this.logTailFd = null;
    }
  }

  public async sendRconCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.rconPassword) {
        this.extractRconConfig();
      }

      const client = dgram.createSocket('udp4');
      client.on('error', (err) => {
        client.close();
        reject(err);
      });

      let responseData = '';
      const timeout = setTimeout(() => {
        client.close();
        resolve(responseData || 'Command sent (no response received)');
      }, 1200);

      client.on('message', (msg) => {
        // SA-MP RCON UDP response format:
        // 4 bytes 'SAMP', 4 bytes IP, 2 bytes port, 1 byte opcode ('x'), 2 bytes length, string message
        if (msg.length >= 14 && msg.toString('ascii', 0, 4) === 'SAMP') {
          const len = msg.readUInt16LE(11);
          if (msg.length >= 13 + len) {
            responseData += msg.toString('ascii', 13, 13 + len) + '\n';
          }
        }
      });

      const ipParts = '127.0.0.1'.split('.');
      const passBuf = Buffer.from(this.rconPassword || 'changeme', 'ascii');
      const cmdBuf = Buffer.from(command, 'ascii');

      const packet = Buffer.alloc(11 + 2 + passBuf.length + 2 + cmdBuf.length);
      packet.write('SAMP', 0, 'ascii');
      packet.writeUInt8(parseInt(ipParts[0]), 4);
      packet.writeUInt8(parseInt(ipParts[1]), 5);
      packet.writeUInt8(parseInt(ipParts[2]), 6);
      packet.writeUInt8(parseInt(ipParts[3]), 7);
      packet.writeUInt16LE(this.rconPort, 8);
      packet.write('x', 10, 'ascii');
      packet.writeUInt16LE(passBuf.length, 11);
      passBuf.copy(packet, 13);
      packet.writeUInt16LE(cmdBuf.length, 13 + passBuf.length);
      cmdBuf.copy(packet, 15 + passBuf.length);

      client.send(packet, this.rconPort, '127.0.0.1');
    });
  }

  private updateMysqlConfig(): void {
    const dir = this.activeCwd || this.serverPath;
    const cfgPath = path.join(dir, 'mysql.cfg');
    if (!fs.existsSync(cfgPath)) return;

    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl.startsWith('mysql://')) return;

    try {
      const url = new URL(dbUrl);
      const host = url.hostname;
      const user = url.username;
      const pass = url.password;
      const db = url.pathname.slice(1);

      let cfgContent = fs.readFileSync(cfgPath, 'utf8');
      if (host) cfgContent = cfgContent.replace(/^HOST=.*$/m, `HOST=${host}`);
      if (user) cfgContent = cfgContent.replace(/^USER=.*$/m, `USER=${user}`);
      if (pass !== undefined) cfgContent = cfgContent.replace(/^PASS=.*$/m, `PASS=${pass}`);
      if (db) cfgContent = cfgContent.replace(/^DB=.*$/m, `DB=${db}`);

      fs.writeFileSync(cfgPath, cfgContent, 'utf8');
      console.log('[SampManager] Updated mysql.cfg with DATABASE_URL credentials.');
    } catch (e: any) {
      console.error('[SampManager] Failed to update mysql.cfg:', e.message);
    }
  }

  private extractRconConfig(): void {
    const dir = this.activeCwd || this.serverPath;
    const jsonPath = path.join(dir, 'config.json');
    const cfgPath = path.join(dir, 'server.cfg');

    if (fs.existsSync(jsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data?.rcon?.password) this.rconPassword = data.rcon.password;
        if (data?.network?.port) this.rconPort = data.network.port;
      } catch (e) {
        console.warn('[SampManager] Failed to parse config.json:', e);
      }
      return;
    }

    if (!fs.existsSync(cfgPath)) return;

    try {
      const lines = fs.readFileSync(cfgPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === 'rcon_password' && parts.length > 1) {
          this.rconPassword = parts[1];
        }
        if (parts[0] === 'port' && parts.length > 1) {
          this.rconPort = parseInt(parts[1], 10);
        }
      }
    } catch {}
  }
}
