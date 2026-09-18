import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import Link from "next/link";
import { Home, Building2, Building, MapPin, Key, ExternalLink, ShieldCheck, Warehouse, User, Sparkles } from "lucide-react";

function formatCoords(coordsString: string | null): string {
  if (!coordsString) return "Registry Coordinates Unset";
  try {
    const parsed = JSON.parse(coordsString);
    if (parsed.street || parsed.zone) {
      return [parsed.street, parsed.zone].filter(Boolean).join(", ");
    }
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return `Grid: X ${Math.round(parsed.x)}, Y ${Math.round(parsed.y)}${parsed.z !== undefined ? `, Z ${Math.round(parsed.z)}` : ""}`;
    }
  } catch {
    if (coordsString.length < 50) return coordsString;
  }
  return "Registered in Cadastre";
}

function getPropertyMeta(type: string) {
  switch (type.toUpperCase()) {
    case "HOUSE":
      return { label: "Private Estate", Icon: Home, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent" };
    case "APARTMENT":
      return { label: "Apartment Suite", Icon: Building2, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", gradient: "from-cyan-500/20 via-cyan-500/5 to-transparent" };
    case "MOTEL":
      return { label: "Motel Unit", Icon: Building, color: "bg-amber-500/10 text-amber-400 border-amber-500/30", gradient: "from-amber-500/20 via-amber-500/5 to-transparent" };
    case "WAREHOUSE":
      return { label: "Industrial Facility", Icon: Warehouse, color: "bg-purple-500/10 text-purple-400 border-purple-500/30", gradient: "from-purple-500/20 via-purple-500/5 to-transparent" };
    default:
      return { label: type, Icon: Key, color: "bg-primary/10 text-primary border-primary/30", gradient: "from-primary/20 via-primary/5 to-transparent" };
  }
}

export default async function PropertiesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Find all characters for the user, then gather all properties
  const userCharacters = await prisma.character.findMany({
    where: { userId: session.user.id },
    include: {
      properties: true
    }
  });

  const allProperties = userCharacters.flatMap(c => 
    c.properties.map(p => ({
      ...p,
      ownerName: `${c.firstName} ${c.lastName}`,
      characterId: c.id
    }))
  );

  const charactersWithProperties = userCharacters.filter(c => c.properties.length > 0).length;

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 uppercase tracking-widest font-mono">
              Cadastral Registry
            </Badge>
            <span className="text-xs text-muted-foreground">• San Andreas Real Estate</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Real Estate Portfolio</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Official records of registered residences, apartments, and commercial holdings across all your characters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/ucp"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border border-border/50 hover:bg-accent"
          >
            ← Back to UCP
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sg-glass border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Holdings</p>
              <p className="text-2xl font-bold tracking-tight">{allProperties.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="sg-glass border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Property Owners</p>
              <p className="text-2xl font-bold tracking-tight">{charactersWithProperties} <span className="text-xs font-normal text-muted-foreground">/ {userCharacters.length} chars</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="sg-glass border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Title Verification</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-400">100% Valid</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Grid or Empty State */}
      {allProperties.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <Home className="w-12 h-12 opacity-30" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Registered Properties Found</h3>
            <p className="text-sm max-w-md mb-6">
              None of your characters currently hold title deeds to houses or apartments in San Andreas.
              You can acquire real estate in-game using <span className="font-mono text-primary">/buyhouse</span> or through the real estate agency.
            </p>
            <Link
              href="/ucp"
              className="text-xs font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Return to User Control Panel
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProperties.map(prop => {
            const meta = getPropertyMeta(prop.type);
            const formattedLocation = formatCoords(prop.coords);
            const { Icon } = meta;

            return (
              <Card key={prop.id} className="sg-glass overflow-hidden group border-border/50 hover:border-primary/50 transition-all duration-200">
                <div className={`h-36 bg-gradient-to-b ${meta.gradient} border-b border-border/40 relative flex items-center justify-center`}>
                  <Icon className="w-12 h-12 text-muted-foreground/40 group-hover:text-primary transition-colors duration-200" />
                  
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[11px] font-mono border backdrop-blur-md ${meta.color}`}>
                      {meta.label}
                    </Badge>
                  </div>

                  <div className="absolute bottom-2 left-3 flex items-center gap-1 text-[11px] text-muted-foreground bg-background/60 backdrop-blur-md px-2 py-0.5 rounded border border-border/30">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>Deed #{prop.id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                    {prop.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded-md border border-border/30">
                    <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="truncate">{formattedLocation}</span>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span>Owner:</span>
                    </div>
                    <Link
                      href={`/ucp/characters/${prop.characterId}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1 group/link"
                    >
                      <span>{prop.ownerName}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
