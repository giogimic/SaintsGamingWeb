import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageUser, canBan, canMute, PERMISSION_LEVELS } from "@/lib/permissions";
import { z } from "zod";

const updateUserSchema = z.object({
  userId: z.string(),
  action: z.enum(["updateRole", "toggleBan", "toggleMute", "updateTicks", "setPassword"]),
  roleLevel: z.number().optional(), 
  newPassword: z.string().optional(),
  ticks: z.object({
    isWriter: z.boolean(),
    isVIP: z.boolean(),
    isFounder: z.boolean(),
    isTrusted: z.boolean(),
  }).optional(),
}).strict();

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminLevel = (session?.user?.permissionLevel as number) || 0;
    if (adminLevel < 200) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateUserSchema.parse(body);

    // Prevent users from modifying their own roles/ban status via this endpoint
    if (data.userId === session.user.id) {
      return NextResponse.json({ message: "Cannot modify your own account" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (data.action === "updateRole") {
      if (typeof data.roleLevel !== "number") {
        return NextResponse.json({ message: "roleLevel is required for updateRole" }, { status: 400 });
      }

      if (!canManageUser(adminLevel, data.roleLevel) && adminLevel !== PERMISSION_LEVELS.DEVELOPER) {
        return NextResponse.json({ message: "Insufficient permissions to grant this role" }, { status: 403 });
      }
      
      if (!canManageUser(adminLevel, targetUser.permissionLevel)) {
        return NextResponse.json({ message: "Insufficient permissions to modify this user" }, { status: 403 });
      }

      const updated = await prisma.user.update({
        where: { id: data.userId },
        data: { permissionLevel: data.roleLevel },
      });
      return NextResponse.json(updated);
    }

    if (data.action === "toggleBan") {
      if (!canBan(adminLevel, targetUser.permissionLevel)) {
        return NextResponse.json({ message: "Insufficient permissions to ban this user" }, { status: 403 });
      }

      const updated = await prisma.user.update({
        where: { id: data.userId },
        data: { isBanned: !targetUser.isBanned },
      });
      return NextResponse.json(updated);
    }

    if (data.action === "toggleMute") {
      if (!canMute(adminLevel, targetUser.permissionLevel)) {
        return NextResponse.json({ message: "Insufficient permissions to mute this user" }, { status: 403 });
      }

      const updated = await prisma.user.update({
        where: { id: data.userId },
        data: { canPostToForum: !targetUser.canPostToForum },
      });
      return NextResponse.json(updated);
    }

    if (data.action === "updateTicks") {
      if (adminLevel < PERMISSION_LEVELS.ADMIN) {
        return NextResponse.json({ message: "Only Admins can assign Category Ticks" }, { status: 403 });
      }
      if (!data.ticks) {
        return NextResponse.json({ message: "Ticks object is required" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: data.userId },
        data: { 
          isWriter: data.ticks.isWriter,
          isVIP: data.ticks.isVIP,
          isFounder: data.ticks.isFounder,
          isTrusted: data.ticks.isTrusted
        },
      });
      return NextResponse.json(updated);
    }

    if (data.action === "setPassword") {
      if (adminLevel < 500) {
        return NextResponse.json({ message: "Only Admins (500) or higher can force set passwords" }, { status: 403 });
      }

      if (!data.newPassword || data.newPassword.length < 8) {
        return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
      }

      // Need to import bcrypt to hash password dynamically, wait, route doesn't have bcrypt yet.
      // I'll add bcrypt import at top.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(data.newPassword, 10);

      const updated = await prisma.user.update({
        where: { id: data.userId },
        data: { passwordHash },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Admin user management error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
