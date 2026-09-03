import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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

  if (!configMap["SITE_VERSION"]) configMap["SITE_VERSION"] = "2.1.709";




  const realmName = configMap["REALM_NAME"] || "The Lobby";
  const realmDescription = configMap["REALM_DESCRIPTION"] || "The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~";
  const maxCharacters = configMap["ucp_max_characters"] || "3";

  const startingCash = configMap["ucp_starting_cash"] || "5000";
  const startingBank = configMap["ucp_starting_bank"] || "10000";
  const registrationEnabled = configMap["ucp_registration_enabled"] || "true";

  const fivemServerIp = configMap["fivem_server_ip"] || "";
  const discordGuildId = configMap["discord_guild_id"] || "";
  const discordInviteUrl = configMap["DISCORD_INVITE_URL"] || "https://discord.saintsgaming.net";
  const showUcpInNav = configMap["show_ucp_in_nav"] || "false";
  const showUcpStatsOnProfile = configMap["show_ucp_stats_on_profile"] || "true";

  const announcementBanner = configMap["ANNOUNCEMENT_BANNER"] || "";
  const announcementActive = configMap["ANNOUNCEMENT_BANNER_ACTIVE"] || "false";
  const maintenanceActive = configMap["MAINTENANCE_BANNER_ACTIVE"] || "false";
  const siteName = configMap["SITE_NAME"] || "Saints Gaming";
  const metaDescription = configMap["META_DESCRIPTION"] || "A chill gaming community since 2007. No elitism, no toxicity. Just gamers being gamers.";

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Game Servers &amp; Infrastructure</span>
            <span className="text-xs text-muted-foreground/40">â€¢</span>
            <span className="text-xs text-[#cbb26a] font-mono">Environment Configuration</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            Platform Settings &amp; Defaults
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure global website settings, announcement banners, Discord guild integrations, FiveM server endpoints, and starting player balances.
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass max-w-3xl">
        <form action={updateSiteSettings} className="space-y-6">

          {/* Section 1: Announcements & Maintenance */}
          <div className="space-y-4 border-b pb-6">
            <h2 className="text-xl font-semibold">Site-Wide Banners &amp; Alerts</h2>

            <div className="space-y-2">
              <Label htmlFor="ANNOUNCEMENT_BANNER">Global Announcement Banner</Label>
              <Input
                id="ANNOUNCEMENT_BANNER"
                name="ANNOUNCEMENT_BANNER"
                placeholder="e.g. ðŸŒŸ Welcome to the new Saints Gaming update! Check out the lobby."
                defaultValue={announcementBanner}
              />
              <p className="text-xs text-muted-foreground">Text displayed in a notification strip across the top of all pages.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ANNOUNCEMENT_BANNER_ACTIVE">Show Announcement Banner</Label>
                <Select name="ANNOUNCEMENT_BANNER_ACTIVE" defaultValue={announcementActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active (Visible to all)</SelectItem>
                    <SelectItem value="false">Hidden (Draft / Off)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="MAINTENANCE_BANNER_ACTIVE">Maintenance Mode Warning</Label>
                <Select name="MAINTENANCE_BANNER_ACTIVE" defaultValue={maintenanceActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled (Show maintenance warning)</SelectItem>
                    <SelectItem value="false">Disabled (Normal operations)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Game & Realm Identity */}
          <div className="space-y-4 border-b pb-6">
            <h2 className="text-xl font-semibold">Game &amp; Realm Identity</h2>

            <div className="space-y-2">
              <Label htmlFor="SITE_NAME">Community Site Name</Label>
              <Input
                id="SITE_NAME"
                name="SITE_NAME"
                defaultValue={siteName}
              />
              <p className="text-xs text-muted-foreground">The platform brand title in the browser tab and meta tags.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="REALM_NAME">Realm / Game Name</Label>
              <Input
                id="REALM_NAME"
                name="REALM_NAME"
                defaultValue={realmName}
              />
              <p className="text-xs text-muted-foreground">The game title displayed on the home page showcase, server select, and navigation.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="REALM_DESCRIPTION">Game Description / Tagline</Label>
              <Input
                id="REALM_DESCRIPTION"
                name="REALM_DESCRIPTION"
                defaultValue={realmDescription}
              />
              <p className="text-xs text-muted-foreground">The game description displayed on the home page showcase card.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="META_DESCRIPTION">SEO Meta Description</Label>
              <Input
                id="META_DESCRIPTION"
                name="META_DESCRIPTION"
                defaultValue={metaDescription}
              />
              <p className="text-xs text-muted-foreground">Default search engine description snippet.</p>
            </div>
          </div>

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





