import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Lobby | Saints Gaming',
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // We use flex-1 to fill the space between the navbar and footer in the (main) layout.
  return (
    <div className="flex-1 w-full flex flex-col relative bg-[#050b14] overflow-hidden">
      {children}
    </div>
  );
}
