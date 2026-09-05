import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export async function GET(request: Request) {
  try {
    const statusEffects = await prisma.statusEffectDictionary.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json({ success: true, data: statusEffects });
  } catch (error: any) {
    console.error("[StatusStudio] GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // For upserting we don't need any complex external relationships like abilities do.
    const upserted = await prisma.statusEffectDictionary.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });

    return NextResponse.json({ success: true, data: upserted });
  } catch (error: any) {
    console.error("[StatusStudio] POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
