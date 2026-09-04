import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  HardDrive, Image as ImageIcon, FileText, 
  Trash2, ExternalLink, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Media Library | Saints Gaming Admin",
};

export default async function AdminMediaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    redirect("/not-found");
  }

  // Fetch images and upload stats
  const [totalImages, recentImages, gameAssetCount] = await Promise.all([
    prisma.image.count(),
    prisma.image.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: {
        thread: { select: { title: true, slug: true } },
      },
    }),
    prisma.gameAsset.count(),
  ]);

  const totalBytes = recentImages.reduce((sum, img) => sum + img.sizeBytes, 0);
  const totalMbEstimate = (totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Storage Assets</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <HardDrive className="h-8 w-8 text-primary" />
            Media Asset Library &amp; Uploads
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inspect uploaded forum screenshots, thread attachments, profile avatars, and pixel art textures stored on disk.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Attached Images</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{totalImages}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Pixel Art Game Assets</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{gameAssetCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Recent Sample Size</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{totalMbEstimate} MB</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Images Grid */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" /> Uploaded Attachments ({recentImages.length})
          </CardTitle>
          <CardDescription>Recent community images uploaded to threads and comments.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {recentImages.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-6 text-center">No images uploaded to the database yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentImages.map((img) => (
                <div key={img.id} className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2 hover:border-primary/40 transition-colors flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="aspect-video bg-muted/40 rounded-lg overflow-hidden flex items-center justify-center relative border border-border/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={img.url} 
                        alt={img.alt || img.filename} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30 absolute" />
                    </div>
                    <div className="font-bold text-xs text-foreground truncate">{img.filename}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <span>{(img.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{img.mimeType}</span>
                    </div>
                  </div>

                  {img.thread && (
                    <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground truncate">
                      Thread: <Link href={`/forum/${img.thread.slug}`} target="_blank" className="text-primary hover:underline">{img.thread.title}</Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
