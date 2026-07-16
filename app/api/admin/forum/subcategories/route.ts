import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { z } from "zod";

const subcategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  categoryId: z.string(),
  order: z.number().int().default(0),
  reqWriter: z.boolean().optional(),
  reqVIP: z.boolean().optional(),
  reqFounder: z.boolean().optional(),
  reqTrusted: z.boolean().optional(),
});

const updateSubcategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  order: z.number().int().optional(),
  isLocked: z.boolean().optional(),
  reqWriter: z.boolean().optional(),
  reqVIP: z.boolean().optional(),
  reqFounder: z.boolean().optional(),
  reqTrusted: z.boolean().optional(),
});

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const permissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    if (permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = subcategorySchema.parse(body);
    
    // Only Head Moderators and above can set tick requirements
    if (permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
      delete data.reqWriter;
      delete data.reqVIP;
      delete data.reqFounder;
      delete data.reqTrusted;
    }
    
    let slug = generateSlug(data.name);
    
    const existing = await prisma.subCategory.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const subcategory = await prisma.subCategory.create({
      data: {
        ...data,
        slug,
      }
    });

    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const permissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    if (permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSubcategorySchema.parse(body);
    
    // Only Head Moderators and above can modify tick requirements
    if (permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
      delete data.reqWriter;
      delete data.reqVIP;
      delete data.reqFounder;
      delete data.reqTrusted;
    }
    
    const { id, ...updateData } = data;
    
    const existing = await prisma.subCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Subcategory not found" }, { status: 404 });
    }

    const subcategory = await prisma.subCategory.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(subcategory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const permissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    if (permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Subcategory ID is required" }, { status: 400 });
    }

    const existing = await prisma.subCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Subcategory not found" }, { status: 404 });
    }

    await prisma.subCategory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete subcategory error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
