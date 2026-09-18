import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import dgram from 'dgram';

export class SampManager extends EventEmitter {
  private static instance: SampManager;
  private process: ChildProcess | null = null;
  private rconPassword = '';
  private rconPort = 7777;
  private serverPath: string;

  private constructor() {
    super();
    this.serverPath = path.join(process.cwd(), 'samp-server');
  }

  public static getInstance(): SampManager {
    if (!SampManager.instance) {
      SampManager.instance = new SampManager();
    }
    return SampManager.instance;
  }

  public async startServer(customExecutable?: string): Promise<void> {
    if (this.process) {
      throw new Error("Server is already running.");
    }

    if (!fs.existsSync(this.serverPath)) {
      throw new Error(`Server path does not exist: ${this.serverPath}`);
    }

    this.extractRconConfig();

    const isWindows = process.platform === 'win32';
    const defaultExecutable = isWindows ? 'samp-server.exe' : './samp03svr';
    let executable = customExecutable && customExecutable.trim() !== '' ? customExecutable : defaultExecutable;

    // Handle space-separated commands nicely if shell is false
    const parts = executable.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    this.process = spawn(cmd, args, {
      cwd: this.serverPath,
      detached: !isWindows, // detaches process group on linux so we can kill it
      shell: false,
    });

    this.process.stdout?.on('data', (data) => {
      this.emit('log', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.emit('error_log', data.toString());
    });

    this.process.on('close', (code) => {
      this.process = null;
      this.emit('stopped', code);
    });

    this.process.on('error', (err) => {
      this.emit('error_log', `Failed to start process: ${err.message}`);
      this.process = null;
      this.emit('stopped', -1);
    });

    this.emit('started');
  }

  public stopServer(): void {
    if (this.process && this.process.pid) {
      try {
        const isWindows = process.platform === 'win32';
        if (!isWindows) {
          // Kill the entire process group
          process.kill(-this.process.pid, 'SIGTERM');
        } else {
          this.process.kill('SIGTERM');
        }
      } catch (e) {
        console.error("Failed to kill server process:", e);
      }
      this.process = null;
      this.emit('stopped', 0);
    }
  }

  public isRunning(): boolean {
    return this.process !== null;
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
        resolve(responseData || "Command sent (no response)");
      }, 1000);

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

      // Construct SA-MP RCON Packet
      const ipParts = '127.0.0.1'.split('.');
      const passBuf = Buffer.from(this.rconPassword, 'ascii');
      const cmdBuf = Buffer.from(command, 'ascii');
      
      const packet = Buffer.alloc(11 + 2 + passBuf.length + 2 + cmdBuf.length);
      packet.write('SAMP', 0, 'ascii');
      packet.writeUInt8(parseInt(ipParts[0]), 4);
      packet.writeUInt8(parseInt(ipParts[1]), 5);
      packet.writeUInt8(parseInt(ipParts[2]), 6);
      packet.writeUInt8(parseInt(ipParts[3]), 7);
      packet.writeUInt16LE(this.rconPort, 8);
      packet.write('x', 10, 'ascii'); // Opcode for RCON
      packet.writeUInt16LE(passBuf.length, 11);
      passBuf.copy(packet, 13);
      packet.writeUInt16LE(cmdBuf.length, 13 + passBuf.length);
      cmdBuf.copy(packet, 15 + passBuf.length);

      client.send(packet, this.rconPort, '127.0.0.1');
    });
  }

  private extractRconConfig(): void {
    const cfgPath = path.join(this.serverPath, 'server.cfg');
    if (!fs.existsSync(cfgPath)) return;

    const lines = fs.readFileSync(cfgPath, 'utf8').split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'rcon_password' && parts.length > 1) {
        this.rconPassword = parts[1];
      }
      if (parts[0] === 'port' && parts.length > 1) {
        this.rconPort = parseInt(parts[1], 10);
      }
    }
  }
}
