import { Activity, Cpu, HardDrive, Clock } from "lucide-react";
import os from "os";

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
 <div className="space-y-8">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Activity className="h-6 w-6" /> System Metrics
 </h1>
 <p className="text-muted-foreground mt-1">Live telemetry for the Node.js process and host server.</p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
 {/* Node.js Process Memory */}
 <div className="border border-border/40 rounded-lg overflow-hidden">
 <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
 <Cpu className="h-4 w-4" />
 <h2 className="font-bold">Node.js Process Memory</h2>
 </div>
 <div className="p-4 space-y-4 text-sm">
 <div className="flex justify-between border-b border-border/40 pb-2">
 <span className="text-muted-foreground">RSS (Resident Set Size)</span>
 <span>{formatBytes(memoryUsage.rss)}</span>
 </div>
 <div className="flex justify-between border-b border-border/40 pb-2">
 <span className="text-muted-foreground">Heap Total</span>
 <span>{formatBytes(memoryUsage.heapTotal)}</span>
 </div>
 <div className="flex justify-between border-b border-border/40 pb-2">
 <span className="text-muted-foreground">Heap Used</span>
 <span>{formatBytes(memoryUsage.heapUsed)}</span>
 </div>
 <div className="flex justify-between border-b border-border/40 pb-2">
 <span className="text-muted-foreground">External</span>
 <span>{formatBytes(memoryUsage.external)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Array Buffers</span>
 <span>{formatBytes(memoryUsage.arrayBuffers || 0)}</span>
 </div>
 </div>
 </div>

 {/* Host OS Memory */}
 <div className="border border-border/40 rounded-lg overflow-hidden">
 <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
 <HardDrive className="h-4 w-4" />
 <h2 className="font-bold">Host OS RAM</h2>
 </div>
 <div className="p-4 space-y-4 text-sm">
 <div className="w-full bg-green-950/50 rounded-full h-4 mb-4 overflow-hidden border border-border/40">
 <div className="bg-green-500 h-4" style={{ width: `${memPercentage}%` }}></div>
 </div>
 <div className="flex justify-between border-b border-border/40 pb-2">
 <span className="text-muted-foreground">Usage</span>
 <span>{memPercentage}%</span>
 </div>
 <div className="flex justify-between border-b border-border/40 pb-2">
 <span className="text-muted-foreground">Total Memory</span>
 <span>{formatBytes(totalMem)}</span>
 </div>
 <div className="flex justify-between border-b border-border/40 pb-2">
 <span className="text-muted-foreground">Used Memory</span>
 <span>{formatBytes(usedMem)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Free Memory</span>
 <span>{formatBytes(freeMem)}</span>
 </div>
 </div>
 </div>

 {/* Uptime */}
 <div className="border border-border/40 rounded-lg overflow-hidden lg:col-span-2">
 <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
 <Clock className="h-4 w-4" />
 <h2 className="font-bold">System Uptime</h2>
 </div>
 <div className="p-4 space-y-4 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <div className="text-muted-foreground mb-1">Node.js Process Uptime</div>
 <div className="text-xl text-primary">{formatUptime(process.uptime())}</div>
 </div>
 <div>
 <div className="text-muted-foreground mb-1">Host OS Uptime</div>
 <div className="text-xl text-primary">{formatUptime(os.uptime())}</div>
 </div>
 </div>
 </div>

 </div>
 </div>
 );
}
