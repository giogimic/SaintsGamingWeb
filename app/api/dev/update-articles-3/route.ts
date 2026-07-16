import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  const permissionLevel = (session?.user?.permissionLevel as number) || 0;
  
  if (permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const minecraftBody = `
## The Blocky Dungeon Crawler Returns

Mojang and Double Eleven are teaming up once again to bring us *Minecraft Dungeons 2*, officially slated for **September 29, 2026**. The original game was a smash hit, offering a family-friendly entry point into the action RPG genre, but the sequel promises a much deeper experience for hardcore looters.

![Minecraft Dungeons 2](/images/gaming/mcd2-mock.jpg)

### Deeper Loot and Class Synergies

Unlike the first game where your "class" was defined entirely by your gear, *Dungeons 2* introduces a skill tree system alongside the returning artifact system. Players can now invest points into specific archetypes like the "Soul Weaver" or the "Iron Golem Master", creating unique synergies with their dropped weapons and armor.

### New Procedural Biomes

The overworld is expanding drastically. Expect to delve into the terrifying, pitch-black depths of the Deep Dark, navigating past procedurally generated Warden patrols, or exploring the sprawling canopy of the newly introduced Mangrove swamps.

Grab your friends. The ultimate blocky adventure continues this fall.
`;

  const haloBody = `
## Re-Evolving the Master Chief

343 Industries is going back to the drawing board—and the original ring. *Halo: Campaign Evolved* drops on **July 28, 2026**, offering what the developers are calling a "massive reimagining" of the classic sandbox combat that defined a generation.

![Halo Campaign Evolved](/images/gaming/halo-ce-mock.jpg)

### Not Just a Remake

This isn't *Halo: Combat Evolved Anniversary 2.0*. *Campaign Evolved* takes the narrative beats of the original 2001 masterpiece and expands them into a seamlessly interconnected open-world sandbox on Alpha Halo. Think *Halo Infinite's* Zeta Halo, but populated with the terrifying, classic iterations of the Covenant and the Flood, built entirely on Slipspace Engine 2.0.

"We wanted to capture the feeling you had when you first stepped out of the Bumblebee escape pod," said the lead campaign designer. "But this time, if you see a mountain in the distance on the ring, you can hop in a Warthog and drive there without hitting a loading screen."

### The Flood is Terrifying Again

With an M-rating firmly secured, 343 is leaning heavily into the survival-horror aspects of the Flood. Infection forms can dynamically reanimate fallen Covenant soldiers mid-firefight, forcing players to rethink their engagement strategies on the fly. 

Get ready to finish the fight, again, this July.
`;

  await prisma.newsArticle.updateMany({
    where: { slug: "minecraft-dungeons-2-september" },
    data: { body: minecraftBody }
  });

  await prisma.newsArticle.updateMany({
    where: { slug: "halo-campaign-evolved-july" },
    data: { body: haloBody }
  });

  return NextResponse.json({ message: "Articles 3 and 4 updated successfully!" });
}
