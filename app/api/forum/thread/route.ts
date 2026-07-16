import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";

const threadSchema = z.object({
  title: z.string().min(3).max(100),
  body: z.string().min(5).max(10000),
  subcategoryId: z.string(),
});

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = threadSchema.parse(body);
    
    // Sanitize user-provided HTML/Markdown to prevent Stored XSS
    const sanitizedBody = sanitizeHtml(data.body);

    let slug = generateSlug(data.title);
    const existing = await prisma.thread.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }



    const thread = await prisma.thread.create({
      data: {
        title: data.title,
        body: sanitizedBody,
        slug,
        authorId: session.user.id,
        subcategoryId: data.subcategoryId,
      }
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Thread creation error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
