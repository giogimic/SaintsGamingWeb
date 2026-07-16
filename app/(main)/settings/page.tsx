import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Profile Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect("/login");

  async function updateProfile(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) return;

    const displayName = formData.get("displayName") as string;
    const bio = formData.get("bio") as string;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        displayName: displayName || null,
        bio: bio || null,
      }
    });

    revalidatePath("/settings");
    revalidatePath("/profile");
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your public profile details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateProfile} className="space-y-6">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input disabled value={user.username || ""} className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Usernames cannot be changed currently.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" name="displayName" defaultValue={user.displayName || ""} placeholder="How you want to be called" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" defaultValue={user.bio || ""} placeholder="Tell the community about yourself..." rows={4} />
          </div>

          <Button type="submit">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}
