import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import Link from "next/link";
import { Button } from "@/web/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/web/components/ui/card";
import { ArrowLeft, Car, Home, Briefcase, Phone } from "lucide-react";

export default async function CharacterDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      properties: true,
      vehicles: true,
      faction: true,
      gang: true,
      inventory: true
    }
  });

  if (!character || character.userId !== session.user.id) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-destructive">Character Not Found</h1>
        <p className="text-muted-foreground mt-2">You do not own this character or it does not exist.</p>
        <Link href="/ucp" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="mb-6">
        <Link href="/ucp">
          <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-4xl font-bold sg-text-gradient">{character.firstName} {character.lastName}</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <Phone className="w-4 h-4" /> {character.phoneNumber || "No Phone Number"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="sg-glass border-primary/20">
          <CardHeader>
            <CardTitle>Financial Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Wallet Balance</span>
              <span className="text-2xl font-bold text-green-500">${character.cash.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Bank Balance</span>
              <span className="text-2xl font-bold text-green-500">${character.bank.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Net Worth</span>
              <span className="text-lg font-medium text-primary">${(character.cash + character.bank).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="sg-glass border-primary/20">
          <CardHeader>
            <CardTitle>Affiliations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Faction</span>
              {character.faction ? (
                <span className="text-lg font-medium">{character.faction.name} (Rank: {character.factionRank})</span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Gang / Mafia</span>
              {character.gang ? (
                <span className="text-lg font-medium">{character.gang.name} (Rank: {character.gangRank})</span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="sg-glass border-primary/20">
          <CardHeader>
            <CardTitle>Health & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Health</span>
              <span className="text-lg font-medium text-red-400">{character.health}%</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Armor</span>
              <span className="text-lg font-medium text-blue-400">{character.armor}%</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm uppercase tracking-wider block">Status</span>
              <span className={`text-lg font-medium ${character.isDead ? "text-destructive" : "text-green-500"}`}>
                {character.isDead ? "Deceased" : "Alive"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="sg-glass border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Home className="w-5 h-5" /> Owned Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {character.properties.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No properties owned.</p>
            ) : (
              <ul className="space-y-2">
                {character.properties.map(prop => (
                  <li key={prop.id} className="bg-muted/50 p-3 rounded border border-border/50 flex justify-between items-center">
                    <span className="font-medium">{prop.name}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{prop.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="sg-glass border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> Registered Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {character.vehicles.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No vehicles registered.</p>
            ) : (
              <ul className="space-y-2">
                {character.vehicles.map(veh => (
                  <li key={veh.id} className="bg-muted/50 p-3 rounded border border-border/50 flex justify-between items-center">
                    <span className="font-medium">{veh.modelName}</span>
                    <span className="font-mono text-sm bg-background px-2 py-1 rounded border border-border/50">{veh.plate}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        <Card className="sg-glass border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" /> Inventory & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {character.inventory.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No items in inventory.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {character.inventory.map((item) => {
                  const displayName = item.itemKey
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");

                  return (
                    <div
                      key={item.id}
                      className="bg-muted/50 p-3 rounded border border-border/50 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium block">{displayName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{item.itemKey}</span>
                      </div>
                      <span className="text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded">
                        x{item.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
