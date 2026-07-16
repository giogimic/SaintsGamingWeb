"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCharacter(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { characters: true }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Fetch SiteSettings for advanced config
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
    throw new Error("Character registration is currently disabled.");
  }

  const maxCharacters = parseInt(configMap["ucp_max_characters"] || "3", 10);
  
  if (user.characters.length >= maxCharacters) {
    throw new Error(`Character limit reached (${maxCharacters} max)`);
  }

  const startingCash = parseInt(configMap["ucp_starting_cash"] || "5000", 10);
  const startingBank = parseInt(configMap["ucp_starting_bank"] || "10000", 10);

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  if (!firstName || !lastName) {
    throw new Error("First and Last name are required");
  }

  await prisma.character.create({
    data: {
      userId: user.id,
      firstName,
      lastName,
      cash: startingCash,
      bank: startingBank,
      health: 200,
      armor: 0,
    }
  });

  revalidatePath("/ucp");
  redirect("/ucp");
}

export async function linkAccount(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const discordId = formData.get("discordId") as string;
  const fivemLicense = formData.get("fivemLicense") as string;

  const dataToUpdate: any   = {};
  if (discordId) dataToUpdate.discordId = discordId;
  if (fivemLicense) dataToUpdate.fivemLicense = fivemLicense;

  if (Object.keys(dataToUpdate).length === 0) {
    throw new Error("No data provided");
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate
    });
  } catch (error) {
    console.error(error);
    throw new Error("Failed to link account. The ID might already be in use.");
  }

  revalidatePath("/ucp");
  redirect("/ucp");
}

export async function clearCharacterCoords(characterId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const character = await prisma.character.findUnique({
    where: { id: characterId }
  });

  if (!character || character.userId !== session.user.id) {
    throw new Error("Character not found or access denied");
  }

  await prisma.character.update({
    where: { id: characterId },
    data: { lastCoords: null }
  });

  revalidatePath(`/ucp/characters/${characterId}`);
  redirect(`/ucp/characters/${characterId}?success=coords_cleared`);
}

export async function updateForumPin(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const pin = formData.get("forumPin") as string;
  
  if (!pin || pin.trim() === "") {
    // Clear the PIN
    await prisma.user.update({
      where: { id: session.user.id },
      data: { forumPin: null }
    });
  } else {
    // Set new PIN
    await prisma.user.update({
      where: { id: session.user.id },
      data: { forumPin: pin.trim() }
    });
  }

  revalidatePath("/ucp/settings");
  redirect("/ucp/settings?success=pin_updated");
}

export async function toggleDevConsole(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const enabled = formData.get("devConsoleEnabled") === "true";

  await prisma.user.update({
    where: { id: session.user.id },
    data: { devConsoleEnabled: enabled }
  });

  revalidatePath("/");
  redirect("/ucp/settings?success=dev_console_updated");
}
