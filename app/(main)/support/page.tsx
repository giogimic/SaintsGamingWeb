import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createTicket } from "./actions";
import { LifeBuoy, PlusCircle, MessageSquare } from "lucide-react";

export const metadata = { title: "Support - Saints Gaming" };

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tickets = await prisma.supportTicket.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { messages: true }
      }
    }
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-primary" />
            Support Center
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Need help? Open a ticket to contact staff privately.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold border-b border-border/50 pb-2">Your Tickets</h2>
          
          {tickets.length === 0 ? (
            <div className="text-center py-12 bg-card/30 border border-border/50 rounded-2xl">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold">No tickets yet</h3>
              <p className="text-muted-foreground">You haven&apos;t opened any support tickets.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map(ticket => (
                <Link key={ticket.id} href={`/support/${ticket.id}`} className="block">
                  <Card className="bg-card/50 hover:bg-muted/50 transition-colors border-border/50 group cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {ticket.title}
                        </CardTitle>
                        <Badge 
                          variant={ticket.status === 'CLOSED' ? 'secondary' : (ticket.status === 'OPEN' ? 'default' : 'outline')}
                          className={ticket.status === 'OPEN' ? 'bg-green-500/20 text-green-500' : ''}
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Category: {ticket.category} • Updated {new Date(ticket.updatedAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {ticket._count.messages} message(s) in this thread.
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="bg-card border-border/50 sticky top-24 shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Open New Ticket
              </CardTitle>
              <CardDescription>
                Describe your issue and staff will get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category" 
                    name="category" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="GENERAL">General Inquiry</option>
                    <option value="BAN_APPEAL">Ban Appeal</option>
                    <option value="BUG_REPORT">Bug Report</option>
                    <option value="STORE">Store / Purchase Issue</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Subject</Label>
                  <Input id="title" name="title" required placeholder="Brief summary of the issue" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Details</Label>
                  <Textarea id="body" name="body" required rows={6} placeholder="Provide as much detail as possible..." />
                </div>
                <Button type="submit" className="w-full">Submit Ticket</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
