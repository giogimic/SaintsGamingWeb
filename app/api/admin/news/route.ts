import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createNewsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional(),
  body: z.string().min(1, "Body content is required"),
  coverImage: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });

    if (!user || user.permissionLevel < 300) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const json = await req.json();
    const data = createNewsSchema.parse(json);

    // Check if slug exists
    const existing = await prisma.newsArticle.findUnique({
      where: { slug: data.slug }
    });

    if (existing) {
      return NextResponse.json({ message: "An article with this slug already exists" }, { status: 400 });
    }

    const article = await prisma.newsArticle.create({
      data: {
        ...data,
        authorId: session.user.id,
        publishedAt: data.isPublished ? new Date() : null,
      }
    });

    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("News creation error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
