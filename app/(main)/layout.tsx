import { Navbar, Footer } from "@/components/shared/navbar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MessengerProvider } from "@/components/messenger/messenger-provider";
import { MessengerPopup } from "@/components/messenger/messenger-popup";
import { AmbientBackground } from "@/components/shared/ambient-background";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  let dbPermissionLevel = undefined;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });
    if (dbUser) {
      dbPermissionLevel = dbUser.permissionLevel;
    }
  }

  const discordSetting = await prisma.siteSetting.findUnique({
    where: { key: "DISCORD_INVITE_URL" }
  });
  const discordLink = discordSetting?.value || "https://discord.saintsgaming.net";

  let siteVersion = "v1.1.6";
  let showUcpInNav = false;
  try {
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    if (versionSetting) siteVersion = versionSetting.value;

    const ucpNavSetting = await prisma.siteSetting.findUnique({ where: { key: "show_ucp_in_nav" } });
    if (ucpNavSetting?.value === "true") showUcpInNav = true;
  } catch {
    // defaults
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden selection:bg-primary/30">
      <AmbientBackground />
      <MessengerProvider>
        <Navbar session={session} dbPermissionLevel={dbPermissionLevel} discordLink={discordLink} showUcpLink={showUcpInNav} />
        <main className="flex-1 sg-page-enter z-10 pt-28">{children}</main>
        <Footer className="z-10" discordLink={discordLink} siteVersion={siteVersion} showUcpLink={showUcpInNav} />
        <MessengerPopup />
      </MessengerProvider>
    </div>
  );
}
