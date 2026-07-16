import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { createCharacter } from "../actions";

export default async function CharacterRegistrationPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { characters: true }
  });

  if (!user) {
    return <div>Error loading user profile.</div>;
  }

  // Fetch SiteSettings
  const settings = await prisma.siteSetting.findMany({
    where: {
      key: { in: ["ucp_max_characters", "ucp_starting_cash", "ucp_starting_bank", "ucp_registration_enabled"] }
    }
  });
  const configMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  if (configMap["ucp_registration_enabled"] === "false") {
    return (
      <div className="container mx-auto py-10 px-4 max-w-md text-center">
        <Card>
          <CardContent className="pt-10 pb-10">
            <h1 className="text-2xl font-bold mb-4 text-destructive">Registration Closed</h1>
            <p className="text-muted-foreground mb-6">Character creation is currently disabled by the server administration.</p>
            <Link href="/ucp">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxCharacters = parseInt(configMap["ucp_max_characters"] || "3", 10);
  const startingCash = parseInt(configMap["ucp_starting_cash"] || "5000", 10);
  const startingBank = parseInt(configMap["ucp_starting_bank"] || "10000", 10);

  if (user.characters.length >= maxCharacters) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-md text-center">
        <Card>
          <CardContent className="pt-10 pb-10">
            <h1 className="text-2xl font-bold mb-4 text-destructive">Slot Limit Reached</h1>
            <p className="text-muted-foreground mb-6">You already have the maximum allowed number of characters ({maxCharacters}).</p>
            <Link href="/ucp">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-lg">
      <div className="mb-6">
        <Link href="/ucp">
          <Button variant="ghost" className="mb-4">← Back to Dashboard</Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Create New Character</h1>
        <p className="text-muted-foreground">Welcome to Los Santos. Fill out your character&apos;s basic information below.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createCharacter} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" required placeholder="John" maxLength={32} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" required placeholder="Doe" maxLength={32} />
            </div>

            <div className="bg-muted/50 p-4 rounded text-sm text-muted-foreground border">
              <p><strong>Note:</strong> Starting cash (${startingCash.toLocaleString()}) and bank balance (${startingBank.toLocaleString()}) will be automatically assigned. You will customize your appearance once you load into the server for the first time.</p>
            </div>

            <Button type="submit" className="w-full">Create Character</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
