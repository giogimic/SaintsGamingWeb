import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Package, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Modpacks | Saints Gaming",
  description: "Download and install official Saints Gaming modpacks and graphical enhancements.",
};

export default async function ModpacksPage() {
  const modpacks = await prisma.modpack.findMany({
    where: { status: "Active" },
    orderBy: { order: "asc" },
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight sg-text-gradient">
          Saints Modpacks
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Official graphical enhancements, custom assets, and curated mod lists for the Saints Gaming community.
        </p>
      </div>

      {modpacks.length === 0 ? (
        <div className="text-center py-16 bg-card/30 rounded-xl border border-border/50">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-medium">No Modpacks Available</h3>
          <p className="text-muted-foreground mt-2">Check back later for new releases.</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {modpacks.map((pack) => (
            <Card key={pack.id} className="bg-card/40 hover:bg-card/60 transition-colors border-border/50 overflow-hidden flex flex-col sg-glass group">
              <div className="h-48 relative bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                {pack.logoImage ? (
                  pack.logoImage.trim().startsWith('<svg') ? (
                    <div 
                      className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      dangerouslySetInnerHTML={{ __html: sanitizeSvg(pack.logoImage) }} 
                    />
                  ) : (
                    <Image
                      src={pack.logoImage}
                      alt={pack.name}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  )
                ) : (
                  <Package className="h-16 w-16 text-primary/30" />
                )}
                <Badge className="absolute top-4 right-4 bg-background/80 backdrop-blur-md text-foreground border-border/50">
                  v{pack.version || "1.0"}
                </Badge>
              </div>
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">{pack.game}</span>
                </div>
                <CardTitle className="text-2xl">{pack.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2">
                  {pack.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1">
                {/* Additional details could go here */}
              </CardContent>
              
              <CardFooter className="flex gap-2 pt-4 border-t border-border/50">
                {pack.downloadUrl ? (
                  <Button className="flex-1" asChild>
                    <a href={pack.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </a>
                  </Button>
                ) : (
                  <Button className="flex-1" disabled>
                    Unavailable
                  </Button>
                )}
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/modpacks/${pack.slug}`}>
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Details</span>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple XSS strip for SVGs
function sanitizeSvg(svg: string) {
  if (!svg) return "";
  let clean = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*(['"])(?:(?!\1).)*\1/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*[^>\s]+/gi, "");
  clean = clean.replace(/href\s*=\s*(['"])javascript:.*?\1/gi, "");
  return clean;
}
