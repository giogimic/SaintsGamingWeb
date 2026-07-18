"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export function ReportActions({ reportId, currentStatus }: { reportId: string, currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/report/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Report marked as ${status.toLowerCase()}`);
        router.refresh();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to dismiss report");
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus !== "PENDING") {
    return <span className="text-xs text-muted-foreground">Actioned</span>;
  }

  return (
    <div className="flex justify-end gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => updateStatus("RESOLVED")}
        disabled={loading}
        className="h-8 text-green-500 hover:text-green-600 hover:bg-green-500/10 border-green-500/30"
      >
        <CheckCircle className="h-4 w-4 mr-1" /> Resolve
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => updateStatus("DISMISSED")}
        disabled={loading}
        className="h-8 text-muted-foreground hover:text-foreground"
      >
        <XCircle className="h-4 w-4 mr-1" /> Dismiss
      </Button>
    </div>
  );
}
