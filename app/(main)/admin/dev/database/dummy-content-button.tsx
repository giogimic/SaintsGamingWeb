'use client';

import { useState } from "react";
import { Loader2, Database } from "lucide-react";
import { Button } from "@/web/components/ui/button";
import { seedDummyContentAction } from "@/app/actions/admin/game-dev";

export function DummyContentButton() {
  const [isLoading, setIsLoading] = useState(false);

  const pushDummyContent = async () => {
    setIsLoading(true);
    try {
      const res = await seedDummyContentAction();
      if (res.success) {
        alert(res.message || "Dummy content pushed successfully!");
      } else {
        // Fallback to API route if direct action had permission mismatch
        const apiRes = await fetch("/api/dev/seed-dummy", { method: "POST" });
        const data = await apiRes.json();
        if (apiRes.ok && data.success) {
          alert(data.message || "Dummy content pushed successfully!");
        } else {
          alert(data.message || res.error || "Failed to push content.");
        }
      }
    } catch (err: any) {
      alert(`Error pushing dummy content: ${err?.message || err}`);
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
