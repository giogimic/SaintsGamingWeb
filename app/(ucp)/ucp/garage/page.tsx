import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Car, MapPin, SearchX } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My Garage | UCP" };

export default async function UcpGaragePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch characters and their vehicles
  const characters = await prisma.character.findMany({
    where: { userId: session.user.id },
    include: { vehicles: true }
  });

  const allVehicles = characters.flatMap(c => 
    c.vehicles.map(v => ({ ...v, characterName: `${c.firstName} ${c.lastName}` }))
  );

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Car className="h-8 w-8 text-primary" />
          My Garage
        </h1>
        <p className="text-muted-foreground mt-2">
          View and manage all vehicles across your characters.
        </p>
      </div>

      {allVehicles.length === 0 ? (
        <Card className="border-dashed sg-glass">
          <CardContent className="pt-12 pb-12 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
            <h3 className="text-xl font-medium mb-2 sg-text-gradient">No Vehicles Found</h3>
            <p className="text-muted-foreground">None of your characters currently own any vehicles.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allVehicles.map((vehicle) => {
            const isOut = !!vehicle.activeCoords;
            return (
              <Card key={vehicle.id} className="overflow-hidden flex flex-col group sg-glass border-border/50 hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.15)] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0" />
                {/* SVG Car Placeholder */}
                <div className="h-40 bg-muted/50 flex items-center justify-center relative overflow-hidden border-b border-border/50 backdrop-blur-sm z-10">
                  <svg className="w-32 h-32 text-primary opacity-20 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0m-10 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0" />
                  </svg>
                  <div className="absolute top-2 right-2">
                    {isOut ? (
                      <Badge variant="destructive" className="text-[10px] uppercase shadow-sm">
                        Out of Garage
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] uppercase shadow-sm">
                        Stored
                      </Badge>
                    )}
                  </div>
                </div>
                
                <CardHeader className="pb-0 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="uppercase tracking-wide group-hover:text-primary transition-colors">{vehicle.modelName}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Owner: {vehicle.characterName}</p>
                    </div>
                    <div className="bg-background/50 backdrop-blur-md border border-border/50 px-2 py-1 rounded shadow-inner group-hover:border-primary/30 transition-colors">
                      <span className="font-mono text-xs font-bold tracking-widest">{vehicle.plate}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardFooter className="mt-auto pt-6 border-t border-border/50 mt-4 relative z-10">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {isOut ? "Location Unknown" : (vehicle.garageId || "Unknown Garage")}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
