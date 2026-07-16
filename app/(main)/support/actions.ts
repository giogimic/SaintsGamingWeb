"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { sendTicketReplyEmail } from "@/lib/email";


export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const body = formData.get("body") as string;

  if (!title || !body) throw new Error("Title and body are required");

  const ticket = await prisma.supportTicket.create({
    data: {
      title,
      category,
      authorId: session.user.id,
      messages: {
        create: {
          body,
          authorId: session.user.id
        }
      }
    }
  });



  revalidatePath("/support");
  redirect(`/support/${ticket.id}`);
}

export async function addTicketMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticketId = formData.get("ticketId") as string;
  const body = formData.get("body") as string;

  if (!ticketId || !body) throw new Error("Missing data");

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { authorId: true, status: true, title: true, author: { select: { email: true } } }
  });

  if (!ticket) throw new Error("Ticket not found");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (ticket.authorId !== session.user.id && (!user || user.permissionLevel < PERMISSION_LEVELS.MODERATOR)) {
    throw new Error("Forbidden");
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      body,
      authorId: session.user.id
    }
  });

  // If a user replies to a CLOSED ticket, reopen it
  if (ticket.authorId === session.user.id && ticket.status === "CLOSED") {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "OPEN" }
    });
  }
  
  // If a staff replies to an OPEN ticket, set to IN_PROGRESS
  if (ticket.authorId !== session.user.id && ticket.status === "OPEN" && user && user.permissionLevel >= PERMISSION_LEVELS.MODERATOR) {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "IN_PROGRESS" }
    });
  }

  // If a staff member replied, notify the ticket author
  if (ticket.authorId !== session.user.id && user && user.permissionLevel >= PERMISSION_LEVELS.MODERATOR) {
    sendTicketReplyEmail(ticket.author.email, ticketId, ticket.title).catch((err) => {
      console.error("Failed to send ticket reply email:", err);
    });

    await prisma.notification.create({
      data: {
        userId: ticket.authorId,
        type: "SYSTEM",
        message: `A staff member replied to your ticket: "${ticket.title}"`,
        link: `/support/${ticketId}`,
      }
    });
  }

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/admin/tickets");
}

export async function closeTicket(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { authorId: true }
  });

  if (!ticket) throw new Error("Ticket not found");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (ticket.authorId !== session.user.id && (!user || user.permissionLevel < PERMISSION_LEVELS.MODERATOR)) {
    throw new Error("Forbidden");
  }

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "CLOSED" }
  });

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
  revalidatePath("/admin/tickets");
}
