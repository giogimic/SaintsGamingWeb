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
    where: { id: session.user.id }
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
