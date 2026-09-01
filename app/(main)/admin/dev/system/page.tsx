import { Cpu, Server, Key, Terminal } from "lucide-react";
import { SystemClient } from "./system-client";

import { SystemUpdater } from "@/web/components/admin/system-updater";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { updateSiteSettings } from "@/app/(main)/admin/actions";
import { prisma } from "@/web/lib/prisma";
import fs from "fs";

import { DevSubNav } from "../dev-sub-nav";

export default async function SystemStatePage() {
  // Extract all process environment variables safely
  // We MUST NOT expose actual secrets to the UI, even in the dev console.
  // We will mask their values.
  const envVars = Object.keys(process.env).sort().map(key => {
    const val = process.env[key];
    const isSecret = key.toLowerCase().includes("secret") || key.toLowerCase().includes("password") || key.toLowerCase().includes("token") || key.toLowerCase().includes("key");
    const isUrl = key.toLowerCase().includes("url");
    
    let displayVal = val || "";
    if (isSecret && val) {
      displayVal = "******** (Configured)";
    } else if (isUrl && val) {
      if (key === "DATABASE_URL") {
        try {
          const parsedUrl = new URL(val);
          if (parsedUrl.password) {
            parsedUrl.password = "********";
          }
          displayVal = parsedUrl.toString();
        } catch {
          displayVal = "******** (Configured)";
        }
      } else {
        // Show other URLs fully as they are crucial for debugging docker connections
        displayVal = val;
      }
    }

    return { key, value: displayVal, isSecret };
  });

  const siteVersionSetting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });

  const isDocker = fs.existsSync("/.dockerenv");

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Overview &amp; Telemetry</span>
          <span className="text-xs text-muted-foreground/40">â€¢</span>
          <span className="text-xs text-[#cbb26a] font-mono">Environment &amp; Cache</span>
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cpu className="h-8 w-8 text-primary" /> System State &amp; Environment
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Inspect currently active environment configurations, purge server router caches, and review live process environment variables.
        </p>
      </div>

      <DevSubNav />

      <SystemClient />

      <div className="border border-border/40 p-6 rounded-lg bg-card/40 sg-glass mt-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Terminal className="h-5 w-5 text-primary" /> Live Application Settings
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Quickly tweak the public site version or trigger the in-app Git updater if running inside a container.
        </p>
        
        <form action={updateSiteSettings} className="space-y-4 mb-8 pb-8 border-b border-border/40">
          <div className="space-y-2">
            <Label htmlFor="SITE_VERSION" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Site Version</Label>
            <Input 
              id="SITE_VERSION" 
              name="SITE_VERSION" 
              defaultValue={siteVersionSetting?.value || "2.1.594"} 
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">The current running version of the web app displayed in the footer and admin bar.</p>
          </div>
          <Button type="submit" variant="secondary" className="text-xs font-mono">Save Version</Button>
        </form>

        <div className="space-y-8">
          
          <SystemUpdater isDocker={isDocker} />
        </div>
      </div>

      <div className="border border-border/40 p-6 rounded-lg bg-card mt-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Server className="h-5 w-5 text-green-400" /> Loaded Environment Variables
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          This displays exactly what configuration the Node.js process is currently using. 
          <span className="text-destructive font-semibold"> Secrets are automatically masked.</span>
        </p>

        <div className="overflow-x-auto rounded-md border border-border/50">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-3 border-b border-border/50">Variable Key</th>
                <th className="px-4 py-3 border-b border-border/50">Loaded Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono">
              {envVars.map((env) => (
                <tr key={env.key} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold text-primary">{env.key}</td>
                  <td className="px-4 py-3 break-all">
                    {env.isSecret ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Key className="h-3 w-3" /> {env.value}
                      </span>
                    ) : (
                      env.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
