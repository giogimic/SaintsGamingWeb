import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";

const threadSchema = z.object({
  title: z.string().min(3).max(100),
  body: z.string().min(5).max(10000),
  subcategoryId: z.string(),
  tags: z.string().optional(),
  pollQuestion: z.string().optional(),
  pollOptions: z.array(z.string()).optional(),
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

    const tagNames = data.tags
      ? data.tags.split(",").map(t => t.trim().toLowerCase().replace(/[^a-z0-9]/g, '')).filter(t => t.length > 0)
      : [];

    const thread = await prisma.$transaction(async (tx) => {
      const newThread = await tx.thread.create({
        data: {
          title: data.title,
          body: sanitizedBody,
          slug,
          authorId: session.user.id,
          subcategoryId: data.subcategoryId,
        }
      });

      if (tagNames.length > 0) {
        for (const tagName of tagNames) {
          const hashtag = await tx.hashtag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName }
          });
          
          await tx.threadHashtag.create({
            data: {
              threadId: newThread.id,
              hashtagId: hashtag.id
            }
          });
        }
      }

      if (data.pollQuestion && data.pollOptions && data.pollOptions.length >= 2) {
        await tx.poll.create({
          data: {
            question: data.pollQuestion,
            threadId: newThread.id,
            options: {
              create: data.pollOptions.map(opt => ({ text: opt }))
            }
          }
        });
      }

      return newThread;
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
