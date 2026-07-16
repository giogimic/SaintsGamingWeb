import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, ShieldCheck, Gamepad2, Settings, LifeBuoy } from "lucide-react";
import { getRoleName, getRoleColor } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch full user data including characters
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      characters: true,
    }
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            My Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your Saints Gaming account and characters.
          </p>
        </div>
        
        {user.permissionLevel >= 500 && (
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <Link href="/admin">
              <ShieldCheck className="mr-2 h-4 w-4" /> Admin Panel
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column - Account Info */}
        <div className="space-y-8 md:col-span-1">
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                  {user.image ? (
                    <Image src={user.image} alt={user.username} width={64} height={64} />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-xl">{user.username}</h3>
                  <div className={`text-sm font-semibold ${getRoleColor(user.permissionLevel)}`}>
                    {getRoleName(user.permissionLevel)}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Account ID
                  </span>
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {user.id.substring(0, 8)}...
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" /> Account Settings
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/support">
                    <LifeBuoy className="mr-2 h-4 w-4" /> Support Tickets
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Characters & Game Data */}
        <div className="space-y-8 md:col-span-2">
          <Card className="bg-card/40 border-border/50 sg-glass h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" /> My Characters
                </CardTitle>
                <CardDescription>
                  Your active characters on the Saints Gaming FiveM server.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {user.characters && user.characters.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {user.characters.map((char) => (
                    <div key={char.id} className="p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg">{char.firstName} {char.lastName}</h4>
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                          ID: {char.id.substring(0, 5)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground mt-4">
                        <div className="flex justify-between">
                          <span>Bank:</span>
                          <span className="font-mono text-green-400">${char.bank.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash:</span>
                          <span className="font-mono text-green-400">${char.cash.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 border border-dashed border-border/50 rounded-lg bg-background/30">
                  <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Characters Found</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2 mb-6">
                    You haven&apos;t created any characters yet. Head over to the FiveM User Control Panel to create your first character!
                  </p>
                  <Button asChild>
                    <Link href="/ucp/register">Create Character</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
