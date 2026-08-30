import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { LifeBuoy, Eye } from "lucide-react";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";

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
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Helpdesk Queue</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <LifeBuoy className="h-8 w-8 text-primary" />
            Support Tickets &amp; Appeals
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and respond to player appeals, bug reports, payment/store inquiries, and general help requests.
          </p>
        </div>
      </div>

      <Card className="bg-card/40 border-border/50 sg-glass">
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
