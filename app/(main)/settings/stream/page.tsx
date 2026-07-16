import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StreamProfileForm } from "@/components/settings/stream-profile-form";

export const metadata = {
  title: "Stream Settings",
};

export default async function StreamSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.streamProfile.findFirst({
    where: { userId: session.user.id }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stream Settings</h2>
        <p className="text-muted-foreground mt-2">
          Connect your streaming platform to be featured on our community Streams page.
        </p>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-6 md:p-8 sg-glass">
        {profile && !profile.isApproved && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 text-sm">
            Your stream profile is pending admin approval. You will not appear on the Streams page until approved.
          </div>
        )}
        
        {profile?.isApproved && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-500 text-sm">
            Your profile is approved! Toggle your Live status below to appear on the front page.
          </div>
        )}

        <StreamProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
