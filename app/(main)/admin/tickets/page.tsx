import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Eye } from "lucide-react";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export const metadata = { title: "Admin - Tickets" };

export default async function AdminTicketsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>;
  }

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      author: { select: { username: true } },
      _count: { select: { messages: true } }
    }
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Manage and respond to user inquiries and appeals.
          </p>
        </div>
      </div>

      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-0">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/50 text-left">
                <tr>
                  <th className="h-10 px-4 font-medium">Ticket</th>
                  <th className="h-10 px-4 font-medium">Author</th>
                  <th className="h-10 px-4 font-medium">Category</th>
                  <th className="h-10 px-4 font-medium">Status</th>
                  <th className="h-10 px-4 font-medium">Last Updated</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No support tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">
                        <div className="line-clamp-1">{ticket.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{ticket._count.messages} messages</div>
                      </td>
                      <td className="p-4 text-muted-foreground">{ticket.author.username}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-background">{ticket.category}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={ticket.status === 'CLOSED' ? 'secondary' : (ticket.status === 'OPEN' ? 'default' : 'outline')}
                          className={ticket.status === 'OPEN' ? 'bg-green-500/20 text-green-500' : ''}
                        >
                          {ticket.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(ticket.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/support/${ticket.id}`}>
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
