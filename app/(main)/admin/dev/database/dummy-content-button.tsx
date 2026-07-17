"use client";

import { useState } from "react";
import { Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DummyContentButton() {
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
    <Button 
      onClick={pushDummyContent}
      disabled={isLoading}
      variant="outline"
      className="w-full border-blue-900 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300"
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
      Push Dummy Content (News, Categories & SVGs)
    </Button>
  );
}
