import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/web/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/web/components/ui/card";
import { User, Mail, Shield, ShieldCheck, Gamepad2, Settings, LifeBuoy } from "lucide-react";
import { getRoleName, getRoleColor } from "@/web/lib/permissions";
import { Button } from "@/web/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

        {/* Right Column - Game Activity */}
        <div className="space-y-8 md:col-span-2">
          <Card className="bg-card/40 border-border/50 sg-glass h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" /> Game Activity
                </CardTitle>
                <CardDescription>
                  Your activity across Saints Gaming servers.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 px-4 border border-dashed border-border/50 rounded-lg bg-background/30">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Jump Into a Server</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2 mb-6">
                  Check out our active game servers and start playing with the community!
                </p>
                <Button asChild>
                  <Link href="/status">View Servers</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
