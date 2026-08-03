import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Lobby | Saints Gaming',
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // By using fixed inset-0 and z-50, we break out of the parent (main) layout's
  // flex flow, effectively covering the navbar and footer.
  // We'll add a simple "Exit to Website" button inside the page itself if needed,
  // or they can use the browser back button.
  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-[#0a0a0f]">
      {children}
    </div>
  );
}
