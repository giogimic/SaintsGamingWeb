"use client";

import { RefreshCw, Play, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runTask_ClearCache, runTask_SyncDiscordRoles, runTask_AuditLogs } from "./actions";

type TaskStatus = "IDLE" | "RUNNING" | "SUCCESS" | "ERROR";

export default function DevTasksPage() {
 const [tasks, setTasks] = useState({
 cache: { status: "IDLE" as TaskStatus, message: "", lastRun: null as Date | null },
 discord: { status: "IDLE" as TaskStatus, message: "", lastRun: null as Date | null },
 audit: { status: "IDLE" as TaskStatus, message: "", lastRun: null as Date | null },
 });

 const updateTask = (key: keyof typeof tasks, status: TaskStatus, message: string = "") => {
 setTasks(prev => ({
 ...prev,
 [key]: { status, message, lastRun: status === "SUCCESS" ? new Date() : prev[key].lastRun }
 }));
 };

 const handleRunTask = async (key: keyof typeof tasks, action: () => Promise<unknown>) => {
 updateTask(key, "RUNNING", "Processing...");
 try {
 const res = await action();
 updateTask(key, "SUCCESS", (res as { message: string }).message);
 } catch (err: unknown) {
 updateTask(key, "ERROR", err instanceof Error ? err.message : "An unknown error occurred");
 }
 };

 const TASK_LIST = [
 {
 key: "cache" as const,
 name: "Purge Next.js Cache",
 desc: "Force revalidate the root layout to clear ISR/SSG caches across the entire site.",
 action: runTask_ClearCache
 },
 {
 key: "discord" as const,
 name: "Force Discord Sync [DEV ONLY]",
 desc: "Fetch updated roles from the Discord API for all linked accounts. [UI Placeholder]",
 action: runTask_SyncDiscordRoles
 },
 {
 key: "audit" as const,
 name: "Archive Audit Logs [DEV ONLY]",
 desc: "Compress and archive old audit logs to cold storage. [UI Placeholder]",
 action: runTask_AuditLogs
 }
 ];

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <RefreshCw className="h-6 w-6" /> Background Tasks
 </h1>
 <p className="text-muted-foreground mt-1">Manually trigger cron jobs and maintenance scripts.</p>
 </div>

 <div className="space-y-4">
 {TASK_LIST.map((t) => {
 const state = tasks[t.key];
 return (
 <div key={t.key} className="border border-border/40 rounded-lg p-4 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h3 className="font-bold text-lg">{t.name}</h3>
 <p className="text-sm text-muted-foreground mb-2">{t.desc}</p>
 <div className="flex items-center gap-4 text-xs ">
 {state.status === "IDLE" && <span className="text-foreground/50">Status: Idle</span>}
 {state.status === "RUNNING" && <span className="text-yellow-500 animate-pulse">Running...</span>}
 {state.status === "SUCCESS" && (
 <span className="text-primary flex items-center gap-1">
 <CheckCircle2 className="h-3 w-3" /> {state.message}
 </span>
 )}
 {state.status === "ERROR" && (
 <span className="text-red-400 flex items-center gap-1">
 <XCircle className="h-3 w-3" /> {state.message}
 </span>
 )}
 
 {state.lastRun && (
 <span className="text-green-900 flex items-center gap-1 ml-4 border-l border-border/40 pl-4">
 <Clock className="h-3 w-3" /> Last run: {state.lastRun.toLocaleTimeString()}
 </span>
 )}
 </div>
 </div>
 <Button 
 onClick={() => handleRunTask(t.key, t.action)}
 disabled={state.status === "RUNNING"}
 variant="outline"
 className="shrink-0 border-border/40 text-foreground hover:bg-green-900/50 hover:text-primary min-w-[120px]"
 >
 {state.status === "RUNNING" ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <><Play className="mr-2 h-4 w-4" /> Trigger</>
 )}
 </Button>
 </div>
 );
 })}
 </div>
 </div>
 );
}
