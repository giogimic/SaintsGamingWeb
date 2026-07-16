"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function DevActions() {
 const [isLoading, setIsLoading] = useState(false);

 const pushDummyContent = async () => {
 setIsLoading(true);
 try {
 const res = await fetch("/api/dev/seed-dummy", { method: "POST" });
 const data = await res.json();
 if (res.ok) {
 alert(data.message || "Dummy content pushed successfully!");
 } else {
 alert(data.message || "Failed to push content.");
 }
 } catch {
 alert("Error pushing dummy content.");
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="flex gap-4 flex-wrap">
 <button className="px-4 py-2 bg-green-900/20 hover:bg-green-900/40 border border-border/40 rounded transition-colors">
 Ping Database
 </button>
 <button className="px-4 py-2 bg-green-900/20 hover:bg-green-900/40 border border-border/40 rounded transition-colors">
 Clear Caches
 </button>
 <button 
 onClick={pushDummyContent}
 disabled={isLoading}
 className="px-4 py-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-900 rounded transition-colors flex items-center"
 >
 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 Push Dummy Content (News & SVGs)
 </button>
 <button className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900 rounded transition-colors">
 Wipe Economy
 </button>
 </div>
 );
}
