import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { linkAccount, updateForumPin, toggleDevConsole } from "../actions";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export default async function UcpSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profileImages: true }
  });

  if (!user) {
    return <div>Error loading user profile.</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-xl">
      <div className="mb-6">
        <Link href="/ucp">
          <Button variant="ghost" className="mb-4">← Back to Dashboard</Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-muted-foreground">Link your external accounts to synchronize your website profile with the FiveM server.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={linkAccount} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="discordId">Discord ID</Label>
              <Input 
                id="discordId" 
                name="discordId" 
                placeholder="e.g. 123456789012345678" 
                defaultValue={user.discordId || ""}
              />
              <p className="text-xs text-muted-foreground">Right-click your profile in Discord and select &apos;Copy User ID&apos; (requires Developer Mode).</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fivemLicense">FiveM License (Optional)</Label>
              <Input 
                id="fivemLicense" 
                name="fivemLicense" 
                placeholder="e.g. license:1234abc..." 
                defaultValue={user.fivemLicense || ""}
              />
              <p className="text-xs text-muted-foreground">Your Rockstar License identifier. Usually begins with &apos;license:&apos;.</p>
            </div>

            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Forum PIN (Anti-Spam)</CardTitle>
          <CardDescription>
            Set a PIN that will be required whenever you post a new thread or reply. This protects the community from automated spam bots and secures your account if it is compromised. 
            If you forget your PIN, you can always reset it here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateForumPin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forumPin">Your Forum PIN</Label>
              <Input 
                id="forumPin" 
                name="forumPin" 
                type="password"
                placeholder="Leave blank to remove PIN..." 
                defaultValue={user.forumPin || ""}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">Choose a simple PIN you will easily remember.</p>
            </div>
            <Button type="submit" variant="secondary">Update Forum PIN</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Profile Customization</CardTitle>
          <CardDescription>
            Personalize your public profile with a custom YouTube video or a Spotify/YouTube music playlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => {
            "use server";
            const { auth } = await import("@/auth");
            const { prisma } = await import("@/lib/prisma");
            const { revalidatePath } = await import("next/cache");
            const session = await auth();
            if (!session?.user?.id) return;
            const youtubeVideoUrl = formData.get("youtubeVideoUrl") as string;
            const youtubeMusicUrl = formData.get("youtubeMusicUrl") as string;
            await prisma.user.update({
              where: { id: session.user.id },
              data: {
                youtubeVideoUrl: youtubeVideoUrl || null,
                youtubeMusicUrl: youtubeMusicUrl || null,
              }
            });
            revalidatePath("/ucp/settings");
            revalidatePath(`/user/${session.user.username}`);
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtubeVideoUrl">YouTube Video URL</Label>
              <Input 
                id="youtubeVideoUrl" 
                name="youtubeVideoUrl" 
                placeholder="e.g. https://www.youtube.com/watch?v=..." 
                defaultValue={user.youtubeVideoUrl || ""}
              />
              <p className="text-xs text-muted-foreground">This video will be embedded on your public profile.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeMusicUrl">YouTube Music Playlist URL</Label>
              <Input 
                id="youtubeMusicUrl" 
                name="youtubeMusicUrl" 
                placeholder="e.g. https://music.youtube.com/playlist?list=..." 
                defaultValue={user.youtubeMusicUrl || ""}
              />
            </div>
            <Button type="submit" variant="secondary">Update Profile Media</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Profile Image Gallery</CardTitle>
          <CardDescription>
            Upload images to showcase on your public profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {user.profileImages.map((img) => (
              <div key={img.id} className="relative group rounded-md overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="Profile image" className="w-full h-32 object-cover" />
                <form action={async () => {
                  "use server";
                  const { auth } = await import("@/auth");
                  const { prisma } = await import("@/lib/prisma");
                  const { deleteUploadedFile } = await import("@/lib/upload");
                  const { revalidatePath } = await import("next/cache");
                  const session = await auth();
                  if (!session?.user?.id) return;
                  
                  const image = await prisma.profileImage.findUnique({ where: { id: img.id } });
                  if (image && image.userId === session.user.id) {
                    await deleteUploadedFile(image.url);
                    await prisma.profileImage.delete({ where: { id: img.id } });
                    revalidatePath("/ucp/settings");
                    revalidatePath(`/user/${session.user.username}`);
                  }
                }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="sm">Delete</Button>
                </form>
              </div>
            ))}
            {user.profileImages.length === 0 && (
              <div className="col-span-full text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
                No images in your gallery yet.
              </div>
            )}
          </div>

          <form action={async (formData) => {
            "use server";
            const { auth } = await import("@/auth");
            const { prisma } = await import("@/lib/prisma");
            const { uploadFile } = await import("@/lib/upload");
            const { revalidatePath } = await import("next/cache");
            const session = await auth();
            if (!session?.user?.id) return;
            
            const file = formData.get("image") as File | null;
            if (!file || file.size === 0) return;
            
            const result = await uploadFile(file);
            if (result.success && result.url) {
              await prisma.profileImage.create({
                data: {
                  url: result.url,
                  userId: session.user.id
                }
              });
              revalidatePath("/ucp/settings");
              revalidatePath(`/user/${session.user.username}`);
            }
          }} className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="image">Upload New Image</Label>
              <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
            </div>
            <Button type="submit">Upload</Button>
          </form>
        </CardContent>
      </Card>

      {user.permissionLevel >= PERMISSION_LEVELS.DEVELOPER && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Developer Options</CardTitle>
            <CardDescription>
              Configure global development tools and debugging features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={toggleDevConsole} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="devConsole">Global Developer Console (Overlay)</Label>
                  <p className="text-xs text-muted-foreground">
                    Enables the real-time server telemetry overlay. Toggle with <code className="bg-muted px-1 rounded">Ctrl + ~</code>
                  </p>
                </div>
                <div>
                  <input type="hidden" name="devConsoleEnabled" value={user.devConsoleEnabled ? "false" : "true"} />
                  <Button type="submit" variant={user.devConsoleEnabled ? "default" : "secondary"}>
                    {user.devConsoleEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
