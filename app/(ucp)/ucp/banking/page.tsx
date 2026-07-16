import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Landmark, ArrowUpRight, ArrowDownRight, CreditCard, PiggyBank, SearchX, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Banking | UCP" };

export default async function UcpBankingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch characters and their transactions
  const characters = await prisma.character.findMany({
    where: { userId: session.user.id },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } }
  });

  const totalCash = characters.reduce((sum, c) => sum + c.cash, 0);
  const totalBank = characters.reduce((sum, c) => sum + c.bank, 0);
  const netWorth = totalCash + totalBank;

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Landmark className="h-8 w-8 text-green-500" />
          Financial Services
        </h1>
        <p className="text-muted-foreground mt-2">
          View your accounts, transactions, and net worth across all characters.
        </p>
      </div>

      {characters.length === 0 ? (
        <div className="bg-card shadow-sm rounded-lg border border-dashed p-12 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No Accounts Found</h3>
          <p className="text-muted-foreground">You do not have any active characters with bank accounts.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Total Net Worth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">${netWorth.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Bank Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalBank.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Cash on Hand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCash.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Accounts List */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold">Your Accounts</h2>
              
              {characters.map(char => (
                <Card key={char.id} className="overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">{char.firstName} {char.lastName}</h3>
                      <p className="text-xs text-muted-foreground font-mono">ACC-{(char.id).substring(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">${char.bank.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Available Balance</div>
                    </div>
                  </div>
                  
                  <div className="p-0">
                    {char.transactions.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No recent transactions.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {char.transactions.map(tx => (
                          <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${tx.type === 'DEPOSIT' || tx.type === 'SALARY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {tx.type === 'DEPOSIT' || tx.type === 'SALARY' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {tx.type === 'WIRE_TRANSFER' ? 'Wire Transfer' : tx.type === 'SALARY' ? 'Paycheck' : tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                                </p>
                                <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()} • {tx.description || "In-Branch Transaction"}</p>
                              </div>
                            </div>
                            <div className={`font-bold ${tx.type === 'DEPOSIT' || tx.type === 'SALARY' ? 'text-green-500' : 'text-red-500'}`}>
                              {tx.type === 'DEPOSIT' || tx.type === 'SALARY' ? '+' : '-'}${tx.amount.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Wire Transfer Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-32 border-primary/20 shadow-lg">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <CardTitle>Wire Transfer</CardTitle>
                  <CardDescription>Send funds to another citizen.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground flex flex-col items-center text-center gap-3">
                    <div className="bg-background p-3 rounded-full border">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p>
                      <strong className="text-foreground">Web Transfers Disabled</strong><br/>
                      To prevent out-of-character (OOC) meta-gaming, online wire transfers are disabled on the web portal.
                    </p>
                    <p className="text-xs">
                      Please visit a local Fleeca Bank branch or ATM in-game to transfer funds to another player.
                    </p>
                  </div>
                  <Button disabled className="w-full" variant="outline">
                    Initiate Transfer
                  </Button>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
