import { Cpu, Server, Key, Terminal } from "lucide-react";
import { SystemClient } from "./system-client";
import { DatabaseMigration } from "@/components/admin/database-migration";
import { SystemUpdater } from "@/components/admin/system-updater";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateSiteSettings } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import fs from "fs";

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
  const siteVersion = siteVersionSetting?.value || "v1.2.0";

  const isDocker = fs.existsSync("/.dockerenv");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2 border-b border-border/40 pb-4">
          <Cpu className="h-8 w-8 text-primary" /> System State
        </h1>
        <p className="text-muted-foreground mt-2">
          Inspect currently loaded environment configuration and manually purge internal router caches.
        </p>
      </div>

      <SystemClient />

      <div className="border border-border/40 p-6 rounded-lg bg-card mt-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Terminal className="h-5 w-5 text-primary" /> Live Application Settings
        </h2>
        
        <form action={updateSiteSettings} className="space-y-4 mb-8 pb-8 border-b border-border/40">
          <div className="space-y-2">
            <Label htmlFor="SITE_VERSION">Site Version</Label>
            <Input 
              id="SITE_VERSION" 
              name="SITE_VERSION" 
              defaultValue={siteVersionSetting?.value || "1.2.1"} 
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">The current running version of the web app displayed in the footer.</p>
          </div>
          <Button type="submit" variant="secondary">Save Version</Button>
        </form>

        <div className="space-y-8">
          <DatabaseMigration />
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
