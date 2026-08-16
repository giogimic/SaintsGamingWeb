import { Metadata } from 'next';
import { FirstTimeSetupWizard } from '@/web/components/setup/FirstTimeSetupWizard';

export const metadata: Metadata = {
  title: 'Realm Setup Wizard | Saints Gaming',
  description: 'First-time setup and onboarding wizard for configuring realm maps and starter bundles.',
};

export default function SetupPage() {
  return (
    <main className="min-h-[85vh] flex items-center justify-center relative z-10">
      <FirstTimeSetupWizard />
    </main>
  );
}
