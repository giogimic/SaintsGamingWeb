import { Navbar, Footer } from "@/components/shared/navbar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  let siteVersion = "v1.1.0-4";
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    siteVersion = setting?.value || "v1.1.0-4";
  } catch {
    siteVersion = "v1.1.0-4";
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">

      <Navbar session={session} dbPermissionLevel={dbPermissionLevel} discordLink={discordLink} />
      <main className="flex-1 sg-page-enter z-10 pt-28">{children}</main>
      <Footer className="z-10" discordLink={discordLink} siteVersion={siteVersion} />
    </div>
  );
}
