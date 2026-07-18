import { redirect } from "next/navigation";
import { auth } from "@/auth"; // Standard NextAuth pattern in modern Next.js
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getLevelData } from "@/lib/xp";
import { Character } from "@prisma/client";
import { ShieldCheck, Star, Crown } from "lucide-react";

export default async function UcpDashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { characters: true }
  });

  if (!dbUser) {
    return <div>Error loading user profile.</div>;
  }

  // Fetch max characters config
  const maxCharSetting = await prisma.siteSetting.findUnique({
    where: { key: "ucp_max_characters" }
  });
  const maxCharacters = parseInt(maxCharSetting?.value || "3", 10);

  const regEnabledSetting = await prisma.siteSetting.findUnique({
    where: { key: "ucp_registration_enabled" }
  });
  const isRegistrationEnabled = (regEnabledSetting?.value || "true") === "true";

  const levelData = await getLevelData(dbUser.level);
  const currentTierXp = dbUser.xp;
  const progressPercent = levelData.nextTierRequiredXp 
    ? Math.min(100, Math.max(0, (currentTierXp / levelData.nextTierRequiredXp) * 100))
    : 100;

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            FiveM User Control Panel
            {dbUser.isFounder && <span title="Founder"><Crown className="w-6 h-6 text-yellow-500" /></span>}
            {dbUser.isVIP && <span title="VIP"><Star className="w-6 h-6 text-purple-500" /></span>}
            {dbUser.isTrusted && <span title="Trusted"><ShieldCheck className="w-6 h-6 text-green-500" /></span>}
          </h1>
          <p className="text-muted-foreground mt-2">Manage your characters, vehicles, and assets.</p>
        </div>
      </div>
      
      <Card className="mb-8 sg-glass border-primary/10">
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground mb-4 space-y-2">
            <p>
              FiveM License: {dbUser.fivemLicense ? <span className="font-mono bg-muted px-2 py-1 rounded text-primary">{dbUser.fivemLicense}</span> : <span className="text-destructive">Not Linked</span>}
            </p>
            <p>
              Discord ID: {dbUser.discordId ? <span className="font-mono bg-muted px-2 py-1 rounded text-primary">{dbUser.discordId}</span> : <span className="text-destructive">Not Linked</span>}
            </p>
          </div>
          
          {(!dbUser.fivemLicense || !dbUser.discordId) && (
            <Link href="/ucp/settings">
              <Button variant="outline">Link Accounts</Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 mb-8 sg-glass">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <span className="text-3xl">{levelData.icon}</span> Player Level {dbUser.level}
            </CardTitle>
            <span className="font-bold text-primary">{levelData.title}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{dbUser.xp} XP</span>
              <span>
                {levelData.nextTierRequiredXp 
                  ? `Next: ${levelData.nextTierName} (${levelData.nextTierRequiredXp} XP)` 
                  : 'Max Level Reached!'}
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Your Characters <span className="text-muted-foreground text-lg font-normal ml-2">({dbUser.characters.length}/{maxCharacters} Slots)</span></h2>
          {!isRegistrationEnabled ? (
             <Button disabled variant="outline">Registration Closed</Button>
          ) : dbUser.characters.length < maxCharacters ? (
            <Link href="/ucp/register">
              <Button>Create Character</Button>
            </Link>
          ) : (
            <Button disabled variant="outline">Max Characters Reached</Button>
          )}
        </div>

        {dbUser.characters.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <h3 className="text-lg font-medium text-muted-foreground">You have no characters yet.</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbUser.characters.map((char: Character) => (
              <Card key={char.id} className="overflow-hidden flex flex-col sg-glass hover:border-primary/50 transition-colors border-border/50 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <CardHeader className="pb-2 relative">
                  <CardTitle className="text-xl sg-text-gradient">{char.firstName} {char.lastName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{char.phoneNumber || "No phone number"}</p>
                </CardHeader>
                <CardContent className="flex-1 relative">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4 mt-2">
                    <div>
                      <span className="text-muted-foreground block text-xs uppercase tracking-wider">Cash</span>
                      <span className="font-medium text-green-500">${char.cash.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs uppercase tracking-wider">Bank</span>
                      <span className="font-medium text-green-500">${char.bank.toLocaleString()}</span>
                    </div>
                  </div>

                  <Link href={`/ucp/characters/${char.id}`}>
                    <Button variant="secondary" className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
