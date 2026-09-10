import { Metadata } from 'next';
import { GameInitializationWizard } from '@/web/components/setup/GameInitializationWizard';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/web/lib/prisma';
import { getSystemSetupStatus } from '@/shared/game/setup/setupDetection';

export const metadata: Metadata = {
  title: 'Game Setup | Saints Gaming',
  description: 'Game initialization and onboarding wizard for configuring game identity, characters, environment, and starting maps.',
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/setup');
  }

  const params = await searchParams;
  const isReinit = params?.reinit === 'true';

  const setupStatus = await getSystemSetupStatus(prisma);

  // Fresh installs always show the wizard
  // Existing installs: only admins with ?reinit=true can re-access
  if (setupStatus.isSetupCompleted && !isReinit) {
    redirect('/studio');
  }

  // If reinit requested, verify admin permission
  if (isReinit && setupStatus.isSetupCompleted) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || (user.permissionLevel ?? 0) < 80) {
      redirect('/studio');
    }
  }

  return (
    <main className="min-h-[85vh] flex items-center justify-center relative z-10">
      <GameInitializationWizard isReinit={isReinit} />
    </main>
  );
}

