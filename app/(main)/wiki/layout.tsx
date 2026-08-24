import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wiki | Saints Gaming",
  description: "Saints Gaming technical documentation, game guides, studio manuals, and API reference.",
};

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
