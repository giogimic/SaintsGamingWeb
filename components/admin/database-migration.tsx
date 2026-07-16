"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, AlertTriangle } from "lucide-react";

export function DatabaseMigration() {
  const [dbUrl, setDbUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.startsWith("mysql://")) {
      setError("Please provide a valid MySQL/MariaDB connection string (must start with mysql://).");
      return;
    }

    if (!confirm("Are you sure? This will rewrite your database schema and require a container restart. Data will NOT be copied from SQLite to MariaDB; you will be starting with a fresh database.")) {
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dbUrl })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message || "Migration configured successfully! Please restart the Docker container.");
      } else {
        setError(data instanceof Error ? data.message : "An error occurred.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate migration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t mt-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Database className="h-5 w-5" /> Database Migration
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Currently using SQLite. You can migrate the backend to MariaDB/MySQL by providing a connection string below.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {message && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded text-sm font-medium">
          {message}
        </div>
      )}

      <form onSubmit={handleMigrate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="db_url">MariaDB Connection URL</Label>
          <Input 
            id="db_url" 
            placeholder="mysql://user:password@localhost:3306/saints_gaming"
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Warning: This action will reconfigure the backend provider. Existing SQLite data will not be copied over.
          </p>
        </div>
        
        <Button type="submit" variant="destructive" disabled={isLoading || !dbUrl}>
          {isLoading ? "Migrating..." : "Migrate to MariaDB"}
        </Button>
      </form>
    </div>
  );
}
