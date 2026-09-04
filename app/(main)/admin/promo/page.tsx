import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Gift, Tag, Share2, Plus, Sparkles, 
  CheckCircle, XCircle, Trash2, Users, Coins, Award
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import { Label } from "@/web/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/web/components/ui/select";
import { 
  createPromoCampaign, 
  togglePromoCampaign, 
  deletePromoCampaign, 
  type PromoCampaign 
} from "./actions";

export const metadata = {
  title: "Promo & Referral Links | Saints Gaming Admin",
};

export default async function AdminPromoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    redirect("/not-found");
  }

  // Load promo campaigns from SiteSetting
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "PROMO_CAMPAIGNS_JSON" },
  });

  let campaigns: PromoCampaign[] = [];
  if (setting?.value) {
    try {
      campaigns = JSON.parse(setting.value);
    } catch {
      campaigns = [];
    }
  }

  // Sample default starter campaigns if empty
  if (campaigns.length === 0) {
    campaigns = [
      {
        id: "promo_default_1",
        code: "WELCOME2026",
        partnerName: "Official Launch Bonus",
        rewardType: "COINS",
        rewardValue: 1000,
        clicks: 342,
        redemptions: 128,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "promo_default_2",
        code: "DISCORDGIFT",
        partnerName: "Discord Server Booster Perk",
        rewardType: "XP",
        rewardValue: 250,
        clicks: 89,
        redemptions: 42,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalRedemptions = campaigns.reduce((sum, c) => sum + c.redemptions, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Growth &amp; Partner Campaigns</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Gift className="h-8 w-8 text-primary" />
            Promo Codes &amp; Referral Links
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate custom coupon codes and partner links that award bonus coins or XP to new players upon registration.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Active Campaigns</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">
              {campaigns.filter((c) => c.isActive).length} / {campaigns.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Click-Throughs</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{totalClicks}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Redemptions Granted</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{totalRedemptions}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Create New Promo Code */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Create New Promo Campaign
          </CardTitle>
          <CardDescription>Setup a coupon code or partner referral incentive with bonus gifts.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <form action={createPromoCampaign} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs">Promo Code</Label>
              <Input 
                id="code" 
                name="code" 
                placeholder="e.g. TWITCHVIP" 
                required 
                className="font-mono uppercase text-xs" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partnerName" className="text-xs">Partner / Campaign Name</Label>
              <Input 
                id="partnerName" 
                name="partnerName" 
                placeholder="e.g. Streamer Sponsorship" 
                required 
                className="text-xs" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rewardType" className="text-xs">Bonus Reward Type</Label>
              <Select name="rewardType" defaultValue="COINS">
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COINS">Coins (Currency)</SelectItem>
                  <SelectItem value="XP">Experience Points (XP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rewardValue" className="text-xs">Reward Amount</Label>
              <div className="flex gap-2">
                <Input 
                  id="rewardValue" 
                  name="rewardValue" 
                  type="number" 
                  defaultValue={500} 
                  required 
                  className="text-xs font-mono" 
                />
                <Button type="submit" className="gap-1.5 text-xs">
                  <Plus className="h-4 w-4" /> Create
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" /> Active Promo Codes &amp; Referral Links ({campaigns.length})
          </CardTitle>
          <CardDescription>Shareable codes and registration links currently active on the site.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Code / Link</th>
                <th className="px-4 py-3 font-semibold">Partner / Purpose</th>
                <th className="px-4 py-3 font-semibold">Bonus Reward</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Redemptions</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-primary tracking-wider flex items-center gap-1.5">
                      <span>{c.code}</span>
                      <Badge variant="outline" className="text-[9px] font-mono">
                        ?ref={c.code.toLowerCase()}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.partnerName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-mono text-amber-400 font-bold">
                      {c.rewardType === "COINS" ? <Coins className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />}
                      <span>+{c.rewardValue.toLocaleString()} {c.rewardType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.isActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border/40 text-[10px]">
                        Paused
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground font-bold">
                    {c.redemptions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <form action={togglePromoCampaign}>
                        <input type="hidden" name="campaignId" value={c.id} />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                          {c.isActive ? "Pause" : "Enable"}
                        </Button>
                      </form>
                      <form action={deletePromoCampaign}>
                        <input type="hidden" name="campaignId" value={c.id} />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/20">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
}
