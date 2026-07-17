import { InboxClient } from "./inbox-client";

export default function InboxPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Secure Inbox</h1>
        <p className="text-muted-foreground">Your End-to-End Encrypted conversations.</p>
      </div>
      
      <InboxClient />
    </div>
  );
}
