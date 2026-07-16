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
  const stellarBody = `
## A Bloody Return for EVE

Shift Up has announced the highly anticipated sequel to their smash-hit action game, titled *Stellar Blade: Bloodrain*. During the latest PlayStation State of Play, a sprawling 5-minute gameplay trailer showed EVE returning to Earth, but this time, the stakes are significantly higher.

![Stellar Blade Bloodrain](/images/gaming/stellar-blade-mock.jpg)

### Visceral New Combat Mechanics

While the original *Stellar Blade* drew heavy inspiration from *NieR: Automata* and *Sekiro*, *Bloodrain* is leaning much harder into the aggressive, combo-heavy systems of *Devil May Cry*. EVE is equipped with a new transforming weapon called the "Blood Edge," which can seamlessly shift between a heavy greatsword and dual-wielded daggers mid-combo.

Director Kim Hyung Tae stated, "We wanted players to feel an unrelenting sense of momentum. If you stop attacking, you die."

### The Naytiba Evolve

The Naytiba threat hasn't just returned; it has evolved. The trailer showcased horrifying new boss designs that blend mechanical components with grotesque, fleshy mutations. One standout encounter featured EVE fighting a colossal, spider-like Naytiba atop a moving mag-lev train traversing the ruins of a submerged metropolis.

*Stellar Blade: Bloodrain* does not have a firm release date yet, but it is confirmed as a PlayStation 6 exclusive.
`;

  const clockworkBody = `
## Time is a Weapon in InXile's New RPG

The masterminds behind *Wasteland 3* are venturing into the realm of first-person, steampunk role-playing. *Clockwork Revolution* finally received a release window of **Spring 2027** during the Xbox Games Showcase, along with a deep dive into its fascinating chronological mechanics.

![Clockwork Revolution](/images/gaming/clockwork-mock.jpg)

### The Chronometer

Set in the majestic, Victorian-inspired metropolis of Avalon, players will stumble upon an invention known as the Chronometer. This device allows you to travel back in time, influence key historical events, and return to the present to witness the butterfly effect in real-time.

Did you save a prominent politician in the past? When you return to the present, Avalon might be a thriving utopia, or a tyrannical police state ruled by the man you just saved. 

### Deep RPG Systems

InXile promises that *Clockwork Revolution* is an RPG first and a shooter second. Dialogue choices, skill checks, and intricate character builds are the core of the experience. The combat seamlessly blends traditional firearms, like flintlock rifles and gatling guns, with chronomancy spells that allow you to freeze enemies in time or rapidly age their armor until it turns to dust.

Prepare to alter the timeline when *Clockwork Revolution* launches on PC and Xbox in Spring 2027.
`;

  await prisma.newsArticle.updateMany({
    where: { slug: "stellar-blade-bloodrain" },
    data: { body: stellarBody }
  });

  await prisma.newsArticle.updateMany({
    where: { slug: "clockwork-revolution-spring-2027" },
    data: { body: clockworkBody }
  });

  return NextResponse.json({ message: "Articles 5 and 6 updated successfully!" });
}
