import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InboxClient } from "./inbox-client";

export const metadata = {
  title: "The Feed & Messenger | Saints Gaming",
  description: "Community feed, direct messaging, and social interactions.",
};

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile/inbox");
  }

  return (
    <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 animate-in fade-in duration-500 min-h-screen">
      <InboxClient />
    </div>
  );
}
