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

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/setup');
  }

  const setupStatus = await getSystemSetupStatus(prisma);
  if (setupStatus.isSetupCompleted) {
    redirect('/studio');
  }

  return (
    <main className="min-h-[85vh] flex items-center justify-center relative z-10">
      <GameInitializationWizard />
    </main>
  );
}

