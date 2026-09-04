import { prisma } from "@/web/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";
import Link from "next/link";
import { Button } from "@/web/components/ui/button";
import { DeleteCharacterButton } from "./delete-character-button";

export default async function AdminCharactersPage() {
  const characters = await prisma.character.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { username: true }
      }
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Game Servers &amp; Infrastructure</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">FiveM GTA RP</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            FiveM GTA RP Characters
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inspect player roleplay records, cash/bank wealth balances, phone numbers, and alive/deceased health statuses.
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl overflow-hidden sg-glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Character Name</TableHead>
              <TableHead>Owner Account</TableHead>
              <TableHead>Cash</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {characters.map((char) => (
              <TableRow key={char.id}>
                <TableCell className="font-medium">{char.firstName} {char.lastName}</TableCell>
                <TableCell>{char.user.username}</TableCell>
                <TableCell className="text-green-500">${char.cash.toLocaleString()}</TableCell>
                <TableCell className="text-green-500">${char.bank.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{char.phoneNumber || "N/A"}</TableCell>
                <TableCell>
                  {char.isDead ? (
                    <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded text-xs font-bold">DECEASED</span>
                  ) : (
                    <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-bold">ALIVE</span>
                  )}
                </TableCell>
                <TableCell className="text-right flex items-center justify-end gap-2">
                  <Link href={`/ucp/characters/${char.id}`}>
                    <Button variant="secondary" size="sm">View Panel</Button>
                  </Link>
                  <DeleteCharacterButton characterId={char.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
