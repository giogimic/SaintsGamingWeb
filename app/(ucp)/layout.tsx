import { Navbar } from "@/shared/components/navbar";
import { GlobalBottomBar } from "@/shared/components/global-bottom-bar";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { MessengerProvider } from "@/web/components/messenger/messenger-provider";
import { MessengerPopup } from "@/web/components/messenger/messenger-popup";
import { AmbientBackground } from "@/shared/components/ambient-background";
import { UcpNavigation } from "@/web/components/ucp/ucp-navigation";
import { RealtimeProvider } from "@/web/components/realtime/RealtimeProvider";
import { UcpLiveRefresh } from "./ucp/ucp-live-refresh";

export default async function UcpLayout({
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

  let siteVersion = "";
  let showUcpInNav = false;
  try {
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    siteVersion = versionSetting?.value || process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.557";

    const ucpNavSetting = await prisma.siteSetting.findUnique({ where: { key: "show_ucp_in_nav" } });
    if (ucpNavSetting?.value === "true") showUcpInNav = true;
  } catch {
    // defaults
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden selection:bg-primary/30 pb-12">
      <AmbientBackground />
      <RealtimeProvider>
        <MessengerProvider>
          <UcpLiveRefresh />
          <Navbar session={session} dbPermissionLevel={dbPermissionLevel} discordLink={discordLink} showUcpLink={showUcpInNav} siteVersion={siteVersion} />

          <UcpNavigation />

          <main className="flex-1 sg-page-enter bg-background/50">{children}</main>
          <MessengerPopup />
          <GlobalBottomBar dbPermissionLevel={dbPermissionLevel} siteVersion={siteVersion} />
        </MessengerProvider>
      </RealtimeProvider>
    </div>
  );
}





