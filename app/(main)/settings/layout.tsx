import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, User, Monitor } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const NAV_ITEMS = [
    { href: "/settings", label: "Profile", icon: User },
    { href: "/settings/stream", label: "Stream settings", icon: Monitor },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link 
                key={item.href} 
                href={item.href} 
                className={buttonVariants({ variant: "ghost", className: "justify-start gap-3 w-full" })}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
