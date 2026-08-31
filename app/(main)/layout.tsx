import { Navbar } from "@/shared/components/navbar";
import { GlobalBottomBar } from "@/shared/components/global-bottom-bar";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { MessengerProvider } from "@/web/components/messenger/messenger-provider";
import { MessengerPopup } from "@/web/components/messenger/messenger-popup";
import { Toaster } from "sonner";
import { AuthProvider } from "@/web/components/auth-provider";
import { RealtimeProvider } from "@/web/components/realtime/RealtimeProvider";
import { GlobalCommandPalette } from "@/web/components/command-palette/global-command-palette";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { MainLayoutShell } from "@/shared/components/main-layout-shell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let dbPermissionLevel = undefined;
  let dbIsWriter = false;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true, isWriter: true }
    });
    if (dbUser) {
      dbPermissionLevel = dbUser.permissionLevel;
      dbIsWriter = Boolean(dbUser.isWriter);
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
    siteVersion = versionSetting?.value || process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.576";

    const ucpNavSetting = await prisma.siteSetting.findUnique({ where: { key: "show_ucp_in_nav" } });
    if (ucpNavSetting?.value === "true") showUcpInNav = true;
  } catch {
    // defaults
  }

  return (
    <AuthProvider session={session}>
      <TooltipProvider delay={200}>
        <RealtimeProvider>
          <MessengerProvider>
            <MainLayoutShell
              navbar={
                <Navbar
                  session={session}
                  dbPermissionLevel={dbPermissionLevel}
                  discordLink={discordLink}
                  showUcpLink={showUcpInNav}
                  siteVersion={siteVersion}
                />
              }
              commandPalette={
                <GlobalCommandPalette
                  permissionLevel={dbPermissionLevel ?? ((session?.user?.permissionLevel as number) || 0)}
                  isWriter={dbIsWriter}
                />
              }
              messengerPopup={<MessengerPopup />}
              bottomBar={
                <GlobalBottomBar
                  dbPermissionLevel={dbPermissionLevel}
                  siteVersion={siteVersion}
                />
              }
              toaster={<Toaster position="bottom-right" theme="dark" />}
            >
              {children}
            </MainLayoutShell>
          </MessengerProvider>
        </RealtimeProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}







