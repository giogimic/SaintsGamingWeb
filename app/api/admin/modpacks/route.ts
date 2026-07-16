import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { z } from "zod";

const modpackSchema = z.object({
  name: z.string().min(2).max(100),
  game: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  version: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Archived"]),
  logoImage: z.string().nullable().optional(),
  downloadUrl: z.string().url().optional().or(z.literal("")),
  installNotes: z.string().optional(),
  changelog: z.string().optional(),
});

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userPermissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    if (userPermissionLevel < PERMISSION_LEVELS.ADMIN) {
      return NextResponse.json({ message: "Unauthorized. Admin required." }, { status: 401 });
    }

    const body = await req.json();
    const data = modpackSchema.parse(body);

    let slug = generateSlug(data.name);
    const existing = await prisma.modpack.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const modpack = await prisma.modpack.create({
      data: {
        ...data,
        slug,
      }
    });

    return NextResponse.json(modpack, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Modpack creation error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
