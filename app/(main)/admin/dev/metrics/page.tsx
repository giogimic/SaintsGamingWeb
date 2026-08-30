import { Activity, Cpu, HardDrive, Clock } from "lucide-react";
import os from "os";
import { DevSubNav } from "../dev-sub-nav";

export const metadata = { title: "Dev - System Metrics" };

export const revalidate = 0; // Disable caching so metrics are fresh

function formatBytes(bytes: number) {
 if (bytes === 0) return '0 Bytes';
 const k = 1024;
 const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number) {
 const d = Math.floor(seconds / (3600*24));
 const h = Math.floor(seconds % (3600*24) / 3600);
 const m = Math.floor(seconds % 3600 / 60);
 const s = Math.floor(seconds % 60);
 
 const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
 const hDisplay = h > 0 ? h + (h == 1 ? " hr, " : " hrs, ") : "";
 const mDisplay = m > 0 ? m + (m == 1 ? " min, " : " mins, ") : "";
 const sDisplay = s > 0 ? s + (s == 1 ? " sec" : " secs") : "";
 
 return dDisplay + hDisplay + mDisplay + sDisplay;
}

export default function DevMetricsPage() {
  const memoryUsage = process.memoryUsage();
  
  // OS level
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercentage = ((usedMem / totalMem) * 100).toFixed(1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Overview &amp; Telemetry</span>
          <span className="text-xs text-muted-foreground/40">•</span>
          <span className="text-xs text-[#cbb26a] font-mono">Process Health</span>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> System Metrics &amp; Performance
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Live memory consumption, server uptime, and host operating system telemetry for Saints Gaming.
        </p>
      </div>

      <DevSubNav />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Node.js Process Memory */}
        <div className="border border-border/40 rounded-lg overflow-hidden bg-card/40 sg-glass">
          <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#cbb26a]" />
            <h2 className="font-bold">Node.js Process Memory</h2>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/30 pb-2">
              <div>
                <span className="font-medium text-foreground">Resident Set Size (RSS)</span>
                <p className="text-[11px] text-muted-foreground">Total memory currently allocated to this process in RAM</p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-200">{formatBytes(memoryUsage.rss)}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <div>
                <span className="font-medium text-foreground">Heap Allocated (Total)</span>
                <p className="text-[11px] text-muted-foreground">Memory pool reserved by V8 for JavaScript objects</p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-200">{formatBytes(memoryUsage.heapTotal)}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <div>
                <span className="font-medium text-foreground">Heap Actively Used</span>
                <p className="text-[11px] text-muted-foreground">Actual live memory consumed by active data models</p>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400">{formatBytes(memoryUsage.heapUsed)}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <div>
                <span className="font-medium text-foreground">C++ External Bindings</span>
                <p className="text-[11px] text-muted-foreground">Memory used by native C++ modules (SQLite, Sharp)</p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-200">{formatBytes(memoryUsage.external)}</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span className="font-medium text-foreground">Array Buffers</span>
                <p className="text-[11px] text-muted-foreground">Binary buffers for raw pixel assets and socket frames</p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-200">{formatBytes(memoryUsage.arrayBuffers || 0)}</span>
            </div>
          </div>
        </div>

        {/* Host OS Memory */}
        <div className="border border-border/40 rounded-lg overflow-hidden bg-card/40 sg-glass">
          <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[#cbb26a]" />
            <h2 className="font-bold">Host OS RAM</h2>
          </div>
          <div className="p-4 space-y-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>System RAM Pressure</span>
                <span>{memPercentage}% Used</span>
              </div>
              <div className="w-full bg-zinc-950/80 rounded-full h-3 overflow-hidden border border-border/40">
                <div 
                  className={`h-full transition-all ${
                    parseFloat(memPercentage) > 85 ? "bg-red-500" : parseFloat(memPercentage) > 65 ? "bg-amber-500" : "bg-emerald-500"
                  }`} 
                  style={{ width: `${memPercentage}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Total Physical RAM</span>
              <span className="font-mono text-xs font-bold text-slate-200">{formatBytes(totalMem)}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Used RAM</span>
              <span className="font-mono text-xs font-bold text-slate-200">{formatBytes(usedMem)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Free Available RAM</span>
              <span className="font-mono text-xs font-bold text-emerald-400">{formatBytes(freeMem)}</span>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="border border-border/40 rounded-lg overflow-hidden lg:col-span-2 bg-card/40 sg-glass">
          <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#cbb26a]" />
            <h2 className="font-bold">System &amp; Server Uptime</h2>
          </div>
          <div className="p-4 space-y-4 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-background/50 border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Node.js Server Process Uptime</div>
              <div className="text-xl font-bold font-mono text-primary">{formatUptime(process.uptime())}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Time elapsed since the last Next.js server restart or build deploy.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Host Operating System Uptime</div>
              <div className="text-xl font-bold font-mono text-primary">{formatUptime(os.uptime())}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Total operational uptime of the underlying VM / host machine.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
