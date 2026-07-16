import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    <div>
      <h1 className="text-3xl font-bold mb-6">Character Management</h1>

      <div className="bg-card shadow-sm rounded-lg border overflow-hidden">
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
