import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSiteSettings } from "../actions";

export default async function AdminSettingsPage() {

  
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  if (!user || user.permissionLevel < 1000) {
    return <div className="p-6">You do not have permission to view this page.</div>;
  }

  const settings = await prisma.siteSetting.findMany();
  
  // Convert array to a key-value map for easy access
  const configMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  if (!configMap["SITE_VERSION"]) configMap["SITE_VERSION"] = "2.0.3";
  const maxCharacters = configMap["ucp_max_characters"] || "3";
  const startingCash = configMap["ucp_starting_cash"] || "5000";
  const startingBank = configMap["ucp_starting_bank"] || "10000";
  const registrationEnabled = configMap["ucp_registration_enabled"] || "true";
  
  const fivemServerIp = configMap["fivem_server_ip"] || "";
  const discordGuildId = configMap["discord_guild_id"] || "";
  const discordInviteUrl = configMap["DISCORD_INVITE_URL"] || "https://discord.saintsgaming.net";
  const showUcpInNav = configMap["show_ucp_in_nav"] || "false";
  const showUcpStatsOnProfile = configMap["show_ucp_stats_on_profile"] || "true";

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Advanced Configuration Options</h1>

      <div className="bg-card shadow-sm rounded-lg border p-6">
        <form action={updateSiteSettings} className="space-y-6">
          <div className="space-y-4 border-b pb-6">
            <h2 className="text-xl font-semibold">User Control Panel Limits</h2>
            
            <div className="space-y-2">
              <Label htmlFor="ucp_max_characters">Maximum Characters Per User</Label>
              <Input 
                id="ucp_max_characters" 
                name="ucp_max_characters" 
                type="number" 
                defaultValue={maxCharacters} 
              />
              <p className="text-xs text-muted-foreground">The maximum number of character slots available to a standard user.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ucp_registration_enabled">Enable Character Registration</Label>
              <Select name="ucp_registration_enabled" defaultValue={registrationEnabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled (Users can create characters)</SelectItem>
                  <SelectItem value="false">Disabled (Registration closed)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Temporarily prevent players from creating new characters.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="show_ucp_in_nav">Show UCP in Global Navigation</Label>
              <Select name="show_ucp_in_nav" defaultValue={showUcpInNav}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled (Shown in navbar/footer)</SelectItem>
                  <SelectItem value="false">Disabled (Only shown on profile)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Displays the FiveM UCP link in the main navigation menus.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="show_ucp_stats_on_profile">Show UCP Stats on Profile</Label>
              <Select name="show_ucp_stats_on_profile" defaultValue={showUcpStatsOnProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled (Fetch character data)</SelectItem>
                  <SelectItem value="false">Disabled (Hide stats)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Aggregates and displays the user&apos;s FiveM character wealth and items on their web profile.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Starting Economy Variables</h2>
            
            <div className="space-y-2">
              <Label htmlFor="ucp_starting_cash">Starting Cash</Label>
              <Input 
                id="ucp_starting_cash" 
                name="ucp_starting_cash" 
                type="number" 
                defaultValue={startingCash} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ucp_starting_bank">Starting Bank Balance</Label>
              <Input 
                id="ucp_starting_bank" 
                name="ucp_starting_bank" 
                type="number" 
                defaultValue={startingBank} 
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-xl font-semibold">Integrations</h2>
            
            <div className="space-y-2">
              <Label htmlFor="fivem_server_ip">FiveM Server IP:Port</Label>
              <Input 
                id="fivem_server_ip" 
                name="fivem_server_ip" 
                placeholder="e.g. 54.39.51.108:30120"
                defaultValue={fivemServerIp} 
              />
              <p className="text-xs text-muted-foreground">Used for the live server status widget.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord_guild_id">Discord Guild (Server) ID</Label>
              <Input 
                id="discord_guild_id" 
                name="discord_guild_id" 
                placeholder="e.g. 123456789012345678"
                defaultValue={discordGuildId} 
              />
              <p className="text-xs text-muted-foreground">Used for Discord role synchronization.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="DISCORD_INVITE_URL">Discord Invite URL</Label>
              <Input 
                id="DISCORD_INVITE_URL" 
                name="DISCORD_INVITE_URL" 
                placeholder="e.g. https://discord.saintsgaming.net"
                defaultValue={discordInviteUrl} 
              />
              <p className="text-xs text-muted-foreground">Used for the Join Discord buttons.</p>
            </div>
          </div>

          <Button type="submit">Save Configuration</Button>
        </form>
      </div>
    </div>
  );
}
