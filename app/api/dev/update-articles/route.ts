import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  const userPermissionLevel = (session?.user?.permissionLevel as number) || 0;
  
  if (userPermissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const gtaBody = `
## Return to Leonida: A Modern Marvel

Rockstar Games has officially sent shockwaves through the industry by stamping **November 19, 2026** as the definitive launch date for *Grand Theft Auto VI*. Set in the meticulously crafted, neon-soaked state of Leonida, players will return to the iconic streets of Vice City. But this isn't the Vice City of 2002. Rockstar is leveraging their proprietary RAGE engine to deliver unprecedented urban density, simulated ecosystems in the surrounding swamplands, and a satirical take on modern Americana that feels uncomfortably real.

![GTA VI Vice City Skyline](/images/gaming/gta-vi-mock.jpg)
*(Note: Mock image, Rockstar distributes official 4K assets exclusively via their Newswire)*

### What We Know About Lucia and Jason

The dual-protagonist dynamic is at the heart of *GTA VI*. Lucia and Jason’s Bonnie and Clyde-inspired narrative promises a more grounded, character-driven story. Early reports from hands-off previews suggest that the transition between characters is instantaneous, a massive leap forward from the architectural limitations seen in *GTA V*.

### Pre-Orders and Editions

Pre-orders officially went live on June 25, breaking digital storefront records within minutes. Rockstar is offering three editions:
- **Standard Edition**: The base game.
- **Leonida Vice Edition**: Includes exclusive multiplayer cosmetics and a digital artbook.
- **Collector's Cache**: A physical-only edition featuring a map of Leonida and a replica of Lucia's getaway duffel bag.

Are you ready to rule the streets of Vice City once again? Sound off in our forums and let us know what features you hope to see in GTA Online 2.0.
`;

  const fableBody = `
## A Whimsical Return to Albion

Playground Games, best known for their masterful work on the *Forza Horizon* series, is finally ready to show their hand. *Fable* is officially launching on **February 23, 2027**. Fans of the beloved, dark fantasy RPG have waited over a decade to return to Albion, and if the recent Xbox Games Showcase is any indication, the wait was worth it.

### The British Charm is Intact

One of the biggest concerns among veterans of Lionhead Studios' original trilogy was whether Playground could capture that signature, cheeky British humor. The latest trailer, narrated by the booming voice of a disgruntled giant (played brilliantly by Richard Ayoade), confirms that the satirical bite of *Fable* remains entirely intact. 

![Fable Hero in Albion](/images/gaming/fable-mock.jpg)

### Stunning Visual Fidelity

What sets this reboot apart is the sheer visual fidelity. Powered by a modified version of the ForzaTech engine, the sprawling forests and medieval villages of Albion look photorealistic. But don't let the beauty fool you; the world is teeming with danger. From classic Hobbes to entirely new mythological monstrosities, the combat looks weighty, fluid, and heavily reliant on combining melee, ranged, and spell-casting mechanics.

### The Morality System Evolves

The iconic morality system returns, but Playground promises it won't just be black and white. Your choices will permanently scar the environment and alter how NPCs perceive you. Will you be the glowing hero of Bowerstone, or a feared tyrant with horns sprouting from your brow?

*Fable* drops day-one on Xbox Game Pass and PC. Let us know if you plan on playing the hero or the villain!
`;

  const gearsBody = `
## A Return to Survival Horror

The Coalition is taking the *Gears of War* franchise back to its roots. Announced with a breathtaking cinematic trailer, *Gears of War: E-Day* will launch on **October 6, 2026**. This isn't a continuation of JD and Kait's story; this is a gritty, terrifying prequel focused squarely on Marcus Fenix and Dom Santiago during the most horrific 24 hours in Sera's history.

![Gears of War E-Day](/images/gaming/gears-eday-mock.jpg)

### The Locust Horde Unleashed

Set 14 years before the events of the original *Gears of War*, E-Day chronicles Emergence Day. The Coalition promises a return to the oppressive, survival-horror tone that defined the original game. The Locust aren't just cannon fodder in this entry; they are terrifying, subterranean monsters that the human race has never encountered before.

"We wanted to remind players why the Locust were so feared," stated the Creative Director during the Xbox Games Showcase. "Every encounter should feel like a desperate fight for survival."

### Next-Gen Destruction

Built from the ground up on Unreal Engine 5, E-Day features unprecedented environmental destruction. As the Locust burrow through the streets of Sera's major cities, entire city blocks will collapse dynamically. Players will have to navigate a rapidly crumbling urban landscape while fending off the subterranean threat.

Are you ready to rev up your Lancer once again? *Gears of War: E-Day* launches October 6, 2026.
`;

  const doomBody = `
## Rip, Tear, and Parry

The Doom Slayer is returning, and this time, he's going medieval. *DOOM: The Dark Ages – Revelations* is a massive DLC expansion dropping on **July 7, 2026**. Following the explosive events of the base game, *Revelations* sees the Slayer continuing his crusade through demonic fortresses and hellish landscapes.

![DOOM The Dark Ages](/images/gaming/doom-darkages-mock.jpg)

### The Shield Saw Mechanics

The standout feature of *The Dark Ages* is the introduction of the Shield Saw. This isn't just a defensive tool; it's an offensive powerhouse. The Slayer can parry projectiles, bash demon skulls, and even throw the shield like a blood-soaked Captain America. The rhythmic, fast-paced combat loop of *DOOM* has been fundamentally altered, demanding players balance aggression with perfectly timed parries.

### Enter the Atlan

If ripping demons apart with a chainsaw wasn't enough, *Revelations* fully unleashes the Atlan mechs. These skyscraper-sized war machines will be fully pilotable in dedicated vehicle segments, allowing the Slayer to go toe-to-toe with Titans in glorious, cinematic brawls.

Get your super shotgun ready. *DOOM: The Dark Ages – Revelations* launches this summer.
`;

  await prisma.newsArticle.updateMany({
    where: { slug: "grand-theft-auto-vi-launch-date" },
    data: { body: gtaBody }
  });

  await prisma.newsArticle.updateMany({
    where: { slug: "fable-launch-date" },
    data: { body: fableBody }
  });

  await prisma.newsArticle.updateMany({
    where: { slug: "gears-of-war-eday-october" },
    data: { body: gearsBody }
  });

  await prisma.newsArticle.updateMany({
    where: { slug: "doom-dark-ages-revelations" },
    data: { body: doomBody }
  });

  return NextResponse.json({ message: "Articles updated successfully!" });
}
