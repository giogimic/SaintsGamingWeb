import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { revalidatePath } from "next/cache";
import { ProfileForm } from "./profile-form";

export const metadata = {
  title: "Profile Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      displayName: true,
      bio: true,
      image: true,
      youtubeVideoUrl: true,
      discordId: true,
    }
  });

  if (!user) redirect("/login");

  async function updateProfile(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) return;

    const displayName = formData.get("displayName") as string;
    const bio = formData.get("bio") as string;
    const youtubeVideoUrl = formData.get("youtubeVideoUrl") as string;
    const discordId = formData.get("discordId") as string;
    const image = formData.get("image") as string; // From hidden input or passed in

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        displayName: displayName || null,
        bio: bio || null,
        youtubeVideoUrl: youtubeVideoUrl || null,
        discordId: discordId || null,
        ...(image ? { image } : {}) // Update image if provided
      }
    });

    revalidatePath("/settings");
    revalidatePath("/profile");
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your public profile details and avatar.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm user={user} updateProfileAction={updateProfile} />
      </CardContent>
    </Card>
  );
}
