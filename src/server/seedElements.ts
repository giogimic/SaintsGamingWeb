import { prisma } from "@/web/lib/prisma";

const ELEMENTS = [
  { slug: "fire", name: "Fire", icon: "/assets/icons/elements/fire.svg" },
  { slug: "water", name: "Water", icon: "/assets/icons/elements/water.svg" },
  { slug: "wind", name: "Wind", icon: "/assets/icons/elements/wind.svg" },
  { slug: "earth", name: "Earth", icon: "/assets/icons/elements/earth.svg" },
  { slug: "ice", name: "Ice", icon: "/assets/icons/elements/ice.svg" },
  { slug: "lightning", name: "Lightning", icon: "/assets/icons/elements/lightning.svg" },
  { slug: "nature", name: "Nature", icon: "/assets/icons/elements/nature.svg" },
  { slug: "metal", name: "Metal", icon: "/assets/icons/elements/metal.svg" },
  { slug: "crystal", name: "Crystal", icon: "/assets/icons/elements/crystal.svg" },
  { slug: "poison", name: "Poison", icon: "/assets/icons/elements/poison.svg" },
  { slug: "sound", name: "Sound", icon: "/assets/icons/elements/sound.svg" },
  { slug: "arcane", name: "Arcane", icon: "/assets/icons/elements/arcane.svg" },
  { slug: "spirit", name: "Spirit", icon: "/assets/icons/elements/spirit.svg" },
  { slug: "light", name: "Light", icon: "/assets/icons/elements/light.svg" },
  { slug: "void", name: "Void", icon: "/assets/icons/elements/void.svg" },
  { slug: "gravity", name: "Gravity", icon: "/assets/icons/elements/gravity.svg" },
];

// Based on elements.md graph logic.
// 1.6x for strong, 0.8x for weak, 0.4x for double weak/half
const EFFECTIVENESS = [
  // Fire
  { a: "fire", d: "ice", m: 1.6 }, { a: "fire", d: "nature", m: 1.6 }, { a: "fire", d: "metal", m: 1.6 },
  { a: "fire", d: "water", m: 0.8 }, { a: "fire", d: "earth", m: 0.8 },
  // Water
  { a: "water", d: "fire", m: 1.6 }, { a: "water", d: "earth", m: 1.6 }, { a: "water", d: "poison", m: 1.6 },
  { a: "water", d: "lightning", m: 0.8 }, { a: "water", d: "nature", m: 0.8 },
  // Wind
  { a: "wind", d: "water", m: 1.6 }, { a: "wind", d: "poison", m: 1.6 }, { a: "wind", d: "sound", m: 1.6 },
  { a: "wind", d: "earth", m: 0.8 }, { a: "wind", d: "lightning", m: 0.8 },
  // Earth
  { a: "earth", d: "lightning", m: 1.6 }, { a: "earth", d: "wind", m: 1.6 }, { a: "earth", d: "crystal", m: 1.6 },
  { a: "earth", d: "water", m: 0.8 }, { a: "earth", d: "nature", m: 0.8 },
  // Ice
  { a: "ice", d: "wind", m: 1.6 }, { a: "ice", d: "water", m: 1.6 }, { a: "ice", d: "nature", m: 1.6 },
  { a: "ice", d: "fire", m: 0.8 }, { a: "ice", d: "metal", m: 0.8 },
  // Lightning
  { a: "lightning", d: "water", m: 1.6 }, { a: "lightning", d: "metal", m: 1.6 }, { a: "lightning", d: "sound", m: 1.6 },
  { a: "lightning", d: "earth", m: 0.8 }, { a: "lightning", d: "crystal", m: 0.8 },
  // Nature
  { a: "nature", d: "earth", m: 1.6 }, { a: "nature", d: "water", m: 1.6 }, { a: "nature", d: "void", m: 1.6 },
  { a: "nature", d: "fire", m: 0.8 }, { a: "nature", d: "ice", m: 0.8 },
  // Metal
  { a: "metal", d: "ice", m: 1.6 }, { a: "metal", d: "crystal", m: 1.6 }, { a: "metal", d: "wind", m: 1.6 },
  { a: "metal", d: "fire", m: 0.8 }, { a: "metal", d: "lightning", m: 0.8 },
  // Crystal
  { a: "crystal", d: "lightning", m: 1.6 }, { a: "crystal", d: "arcane", m: 1.6 }, { a: "crystal", d: "sound", m: 1.6 },
  { a: "crystal", d: "earth", m: 0.8 }, { a: "crystal", d: "metal", m: 0.8 },
  // Poison
  { a: "poison", d: "nature", m: 1.6 }, { a: "poison", d: "spirit", m: 1.6 }, { a: "poison", d: "water", m: 1.6 },
  { a: "poison", d: "wind", m: 0.8 }, { a: "poison", d: "light", m: 0.8 },
  // Sound
  { a: "sound", d: "spirit", m: 1.6 }, { a: "sound", d: "crystal", m: 1.6 }, { a: "sound", d: "wind", m: 1.6 },
  { a: "sound", d: "earth", m: 0.8 }, { a: "sound", d: "lightning", m: 0.8 },
  // Arcane
  { a: "arcane", d: "earth", m: 1.6 }, { a: "arcane", d: "metal", m: 1.6 }, { a: "arcane", d: "spirit", m: 1.6 },
  { a: "arcane", d: "void", m: 0.8 }, { a: "arcane", d: "crystal", m: 0.8 },
  // Spirit
  { a: "spirit", d: "poison", m: 1.6 }, { a: "spirit", d: "void", m: 1.6 }, { a: "spirit", d: "gravity", m: 1.6 },
  { a: "spirit", d: "light", m: 0.8 }, { a: "spirit", d: "sound", m: 0.8 },
  // Light
  { a: "light", d: "void", m: 1.6 }, { a: "light", d: "spirit", m: 1.6 }, { a: "light", d: "poison", m: 1.6 },
  { a: "light", d: "crystal", m: 0.8 }, 
  // Void
  { a: "void", d: "light", m: 1.6 }, { a: "void", d: "arcane", m: 1.6 }, { a: "void", d: "crystal", m: 1.6 },
  { a: "void", d: "nature", m: 0.8 },
  // Gravity
  { a: "gravity", d: "wind", m: 1.6 }, { a: "gravity", d: "lightning", m: 1.6 }, { a: "gravity", d: "spirit", m: 1.6 },
  { a: "gravity", d: "crystal", m: 0.8 }, { a: "gravity", d: "void", m: 0.8 },
];

export async function seedElements() {
  console.log("[SeedElements] Seeding 16-Element System...");

  for (const el of ELEMENTS) {
    await prisma.creatureElement.upsert({
      where: { slug: el.slug },
      create: el,
      update: el,
    });
  }

  // Clear existing to avoid stale data
  await prisma.elementEffectiveness.deleteMany();

  const toCreate = EFFECTIVENESS.map(eff => ({
    attackElement: eff.a,
    defendElement: eff.d,
    multiplier: eff.m
  }));

  for (const eff of toCreate) {
    await prisma.elementEffectiveness.upsert({
      where: {
        attackElement_defendElement: {
          attackElement: eff.attackElement,
          defendElement: eff.defendElement
        }
      },
      update: { multiplier: eff.multiplier },
      create: eff
    });
  }
  
  console.log("[SeedElements] Seeded elements successfully.");
}
