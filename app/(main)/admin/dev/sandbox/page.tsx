"use client";

import { Code, Send, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function DevSandboxPage() {
 const [endpoint, setEndpoint] = useState("/api/webhooks/store");
 const [method, setMethod] = useState("POST");
 const [payload, setPayload] = useState('{\n "event": "purchase.completed",\n "data": {\n "userId": "123",\n "packageId": "vip"\n }\n}');
 const [response, setResponse] = useState<any  >(null);
 const [loading, setLoading] = useState(false);

 const handleTest = async () => {
 setLoading(true);
 try {
 const res = await fetch(endpoint, {
 method,
 headers: { "Content-Type": "application/json" },
 body: ["POST", "PUT", "PATCH"].includes(method) ? payload : undefined
 });
 
 const isJson = res.headers.get("content-type")?.includes("application/json");
 const data = isJson ? await res.json() : await res.text();
 
 setResponse({
 status: res.status,
 statusText: res.statusText,
 data
 });
 } catch (err: unknown) {
 setResponse({ error: (err instanceof Error ? err.message : "Unknown error") });
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="space-y-8 h-full flex flex-col">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Code className="h-6 w-6" /> API Sandbox
 </h1>
 <p className="text-muted-foreground mt-1">Test internal APIs and simulate incoming webhooks.</p>
 </div>

 <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
 {/* Request Configurator */}
 <div className="border border-border/40 rounded-lg overflow-hidden flex flex-col bg-card">
 <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
 <Send className="h-4 w-4" />
 <h2 className="font-bold">Request</h2>
 </div>
 <div className="p-4 flex flex-col gap-4 flex-1">
 <div className="flex gap-2">
 <select 
 className="bg-card border border-border/40 rounded p-2 text-foreground outline-none w-28 "
 value={method}
 onChange={e => setMethod(e.target.value)}
 >
 <option>GET</option>
 <option>POST</option>
 <option>PUT</option>
 <option>PATCH</option>
 <option>DELETE</option>
 </select>
 <input 
 type="text" 
 className="bg-card border border-border/40 rounded p-2 text-foreground outline-none flex-1 "
 value={endpoint}
 onChange={e => setEndpoint(e.target.value)}
 placeholder="/api/..."
 />
 </div>
 <div className="flex-1 flex flex-col">
 <label className="text-sm text-muted-foreground mb-2">Payload (JSON)</label>
 <Textarea 
 value={payload}
 onChange={e => setPayload(e.target.value)}
 className="flex-1 bg-card border-border/40 text-primary min-h-[200px]"
 disabled={!["POST", "PUT", "PATCH"].includes(method)}
 />
 </div>
 <Button 
 onClick={handleTest} 
 disabled={loading}
 className="bg-green-900/50 text-primary hover:bg-green-800/50 border border-border/40 w-full "
 >
 {loading ? "Sending..." : <><Play className="mr-2 h-4 w-4" /> Send Request</>}
 </Button>
 </div>
 </div>

 {/* Response Viewer */}
 <div className="border border-border/40 rounded-lg overflow-hidden flex flex-col bg-card">
 <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
 <Code className="h-4 w-4" />
 <h2 className="font-bold">Response</h2>
 {response && (
 <span className={`ml-auto text-xs px-2 py-0.5 rounded ${response.status >= 200 && response.status < 300 ? 'bg-green-900 text-primary' : 'bg-red-900 text-red-400'}`}>
 {response.status} {response.statusText}
 </span>
 )}
 </div>
 <div className="p-4 flex-1 overflow-auto">
 {!response && !loading && (
 <div className="h-full flex items-center justify-center text-green-900/50 italic">
 Awaiting request...
 </div>
 )}
 {loading && (
 <div className="h-full flex items-center justify-center text-foreground animate-pulse">
 Processing...
 </div>
 )}
 {response && !loading && (
 <pre className="text-sm whitespace-pre-wrap break-words text-primary">
 {JSON.stringify(response.data || response.error, null, 2)}
 </pre>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
