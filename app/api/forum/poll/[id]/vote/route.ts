import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const voteSchema = z.object({
  optionId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: pollId } = await params;
    const body = await req.json();
    const { optionId } = voteSchema.parse(body);

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true }
    });

    if (!poll) {
      return NextResponse.json({ message: "Poll not found" }, { status: 404 });
    }

    if (!poll.options.some((opt: any) => opt.id === optionId)) {
      return NextResponse.json({ message: "Invalid option" }, { status: 400 });
    }

    // Check if the user has already voted on ANY option in this poll
    const existingVote = await prisma.pollVote.findFirst({
      where: {
        userId: session.user.id,
        option: { pollId }
      }
    });

    if (existingVote) {
      return NextResponse.json({ message: "You have already voted on this poll" }, { status: 400 });
    }

    const vote = await prisma.pollVote.create({
      data: {
        userId: session.user.id,
        optionId,
      }
    });

    return NextResponse.json(vote, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Poll vote error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
