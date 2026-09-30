import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Lobby | Saints Gaming',
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 relative bg-[#050b14] overflow-hidden">
      {children}
    </div>
  );
}
