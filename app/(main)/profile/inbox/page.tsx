import { InboxClient } from "./inbox-client";

export default function InboxPage() {
  return (
    <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 animate-in fade-in duration-500 min-h-screen">
      <InboxClient />
    </div>
  );
}

