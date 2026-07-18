import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reportSchema = z.object({
  replyId: z.string().optional(),
  threadId: z.string().optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
}).refine(data => data.replyId || data.threadId, {
  message: "Must provide either replyId or threadId",
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = reportSchema.parse(body);

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        threadId: data.threadId || null,
        replyId: data.replyId || null,
        reason: data.reason,
      }
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Report creation error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
