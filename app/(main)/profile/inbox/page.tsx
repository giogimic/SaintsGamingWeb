import { InboxClient } from "./inbox-client";

export default function InboxPage() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 min-h-screen">
      <InboxClient />
    </div>
  );
}

