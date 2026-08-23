import { Metadata } from 'next';
import { GameInitializationWizard } from '@/web/components/setup/GameInitializationWizard';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Game Setup | Saints Gaming',
  description: 'Game initialization and onboarding wizard for configuring game identity, characters, environment, and starting maps.',
};

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/setup');
  }

  return (
    <main className="min-h-[85vh] flex items-center justify-center relative z-10">
      <GameInitializationWizard />
    </main>
  );
}

