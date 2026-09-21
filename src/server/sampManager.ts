import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import dgram from 'dgram';

declare global {
  var __sg_samp_manager: SampManager | undefined;
}

export class SampManager extends EventEmitter {
  private rconPassword = '';
  private rconPort = 7777;
  private serverPath: string;
  private logTailFd: number | null = null;
  private logTailInterval: NodeJS.Timeout | null = null;
  private logTailPos: number = 0;
  private sidecarUrl: string;
  private apiKey: string;

  private constructor() {
    super();
    this.serverPath = path.join(process.cwd(), 'samp-server');
    this.sidecarUrl = 'http://samp:24002/api';
    this.apiKey = process.env.SAMP_API_KEY || process.env.AUTH_SECRET || '';
  }

  public static getInstance(): SampManager {
    if (!globalThis.__sg_samp_manager) {
      globalThis.__sg_samp_manager = new SampManager();
    }
    return globalThis.__sg_samp_manager;
  }

  public getPlatform(): string {
    return 'docker'; // Always containerized now
  }

  private async fetchSidecar(endpoint: string, method = 'GET'): Promise<any> {
    try {
      const res = await fetch(`${this.sidecarUrl}${endpoint}`, {
        method,
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        cache: 'no-store'
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Sidecar offline' };
    }
  }

  public async getPid(): Promise<number | null> {
    const data = await this.fetchSidecar('/status');
    if (data && data.isRunning) {
      return data.pid;
    }
    return null;
  }

  public async isRunning(): Promise<boolean> {
    return (await this.getPid()) !== null;
  }

  public detectDefaultExecutable(): string {
    return './omp-server';
  }

  public async startServer(customExecutable?: string): Promise<{ pid: number; executable: string }> {
    this.extractRconConfig();

    const res = await this.fetchSidecar('/start', 'POST');
    if (!res.success) {
      throw new Error(res.error || 'Failed to start server');
    }

    this.startLogTail();
    this.emit('started');
    return { pid: res.pid, executable: customExecutable || this.detectDefaultExecutable() };
  }

  public async stopServer(): Promise<boolean> {
    this.stopLogTail();

    try {
      if (this.rconPassword && this.rconPassword !== 'changeme') {
        await this.sendRconCommand('exit').catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {}

    const res = await this.fetchSidecar('/stop', 'POST');
    this.emit('stopped', 0);
    return res.success;
  }

  public async restartServer(customExecutable?: string): Promise<{ pid: number; executable: string }> {
    await this.stopServer();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.startServer(customExecutable);
  }

  public ensureLogTail() {
    this.isRunning().then(running => {
      if (running && !this.logTailInterval) {
        this.startLogTail();
      }
    });
  }

  private getLogFileName(): string {
    let logFileName = 'server_log.txt';
    try {
      const configPath = path.join(this.serverPath, 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (configData?.logging?.file) {
          logFileName = configData.logging.file;
        }
      }
    } catch (e) {}
    return logFileName;
  }

  private startLogTail() {
    this.stopLogTail();
    
    const logFileName = this.getLogFileName();
    const logPath = path.join(this.serverPath, logFileName);
    
    if (!fs.existsSync(logPath)) {
      try { fs.writeFileSync(logPath, ''); } catch {}
    }

    try {
      this.logTailFd = fs.openSync(logPath, 'r');
      const stats = fs.fstatSync(this.logTailFd);
      this.logTailPos = stats.size;
      
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
            this.logTailPos = currentStats.size;
          }
        } catch (e) {}
      }, 500);
    } catch (e) {}
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
        if (msg.length >= 14 && msg.toString('ascii', 0, 4) === 'SAMP') {
          const len = msg.readUInt16LE(11);
          if (msg.length >= 13 + len) {
            responseData += msg.toString('ascii', 13, 13 + len) + '\n';
          }
        }
      });

      const passBuf = Buffer.from(this.rconPassword || 'changeme', 'ascii');
      const cmdBuf = Buffer.from(command, 'ascii');

      const packet = Buffer.alloc(11 + 2 + passBuf.length + 2 + cmdBuf.length);
      packet.write('SAMP', 0, 'ascii');
      packet.writeUInt8(127, 4);
      packet.writeUInt8(0, 5);
      packet.writeUInt8(0, 6);
      packet.writeUInt8(1, 7);
      packet.writeUInt16LE(this.rconPort, 8);
      packet.write('x', 10, 'ascii');
      packet.writeUInt16LE(passBuf.length, 11);
      passBuf.copy(packet, 13);
      packet.writeUInt16LE(cmdBuf.length, 13 + passBuf.length);
      cmdBuf.copy(packet, 15 + passBuf.length);

      client.send(packet, this.rconPort, 'samp');
    });
  }

  private extractRconConfig(): void {
    const jsonPath = path.join(this.serverPath, 'config.json');
    const cfgPath = path.join(this.serverPath, 'server.cfg');

    if (fs.existsSync(jsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data?.rcon?.password) this.rconPassword = data.rcon.password;
        if (data?.network?.port) this.rconPort = data.network.port;
      } catch (e) {}
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
