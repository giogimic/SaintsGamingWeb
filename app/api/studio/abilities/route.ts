import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export async function GET(request: Request) {
  try {
    const abilities = await prisma.abilityDictionary.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json({ success: true, data: abilities });
  } catch (error: any) {
    console.error("[AbilityStudio] GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Auto-generate the consumable ItemTemplate (Skill Book)
    let itemSlug = data.consumableItemId;
    if (!itemSlug) {
      itemSlug = `item_skillbook_${data.slug}`;
      data.consumableItemId = itemSlug;
    }

    // Determine primary element for the icon from tags
    let primaryElement = "none";
    let tagsArray = [];
    try {
      if (data.tags) tagsArray = JSON.parse(data.tags);
    } catch(e) {}
    
    const elementsList = ["fire", "water", "wind", "earth", "ice", "lightning", "nature", "metal", "crystal", "poison", "sound", "arcane", "spirit", "light", "void", "gravity"];
    for (const t of tagsArray) {
      if (elementsList.includes(t.toLowerCase())) {
        primaryElement = t.toLowerCase();
        break;
      }
    }

    // Upsert the auto-generated Item
    await prisma.gameItem.upsert({
      where: { slug: itemSlug },
      create: {
        slug: itemSlug,
        name: `Skill Core: ${data.name}`,
        category: "CONSUMABLE",
        description: `A condensed elemental core that permanently teaches the ability: ${data.name}.`,
        effects: JSON.stringify({ teachesAbility: data.slug }),
        price: 500,
        sprite: `/assets/icons/skills/${primaryElement}-skill.svg`, // Points to the SVGs we auto-generated
        usableInBattle: false,
        usableInField: true,
        unlocksAbilitySlug: data.slug,
      },
      update: {
        name: `Skill Core: ${data.name}`,
        description: `A condensed elemental core that permanently teaches the ability: ${data.name}.`,
        sprite: `/assets/icons/skills/${primaryElement}-skill.svg`,
        effects: JSON.stringify({ teachesAbility: data.slug }),
        unlocksAbilitySlug: data.slug,
      }
    });

    const upserted = await prisma.abilityDictionary.upsert({
      where: { slug: data.slug },
      create: {
        ...data,
        element1: data.element1 || "none",
        element2: data.element2 || "none",
        skillForm: data.skillForm || "strike",
        skillRole: data.skillRole || "offense",
      },
      update: {
        ...data,
        element1: data.element1 || "none",
        element2: data.element2 || "none",
        skillForm: data.skillForm || "strike",
        skillRole: data.skillRole || "offense",
      },
    });

    return NextResponse.json({ success: true, data: upserted });
  } catch (error: any) {
    console.error("[AbilityStudio] POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
