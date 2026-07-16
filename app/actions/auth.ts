"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

export async function resetPasswordAction(
  prevState: { success: boolean; message?: string },
  formData: FormData
) {
  try {
    const token = formData.get("token") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!token || !password) {
      return { success: false, message: "Token and password are required" };
    }

    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match" };
    }

    if (password.length < 8) {
      return { success: false, message: "Password must be at least 8 characters" };
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return { success: false, message: "Invalid or expired token" };
    }

    if (new Date() > new Date(resetToken.expires)) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return { success: false, message: "Token has expired" };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    // Clean up used token
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    return { success: true, message: "Password successfully reset." };
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    return { success: false, message: "Internal server error" };
  }
}

export async function forcePasswordChangeAction(
  prevState: { success: boolean; message?: string },
  formData: FormData
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password) {
      return { success: false, message: "Password is required" };
    }

    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match" };
    }

    if (password.length < 8) {
      return { success: false, message: "Password must be at least 8 characters" };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        passwordHash,
        forcePasswordChange: false 
      },
    });

    return { success: true, message: "Password successfully updated. You may now proceed." };
  } catch (error: unknown) {
    console.error("Force password change error:", error);
    return { success: false, message: "Internal server error" };
  }
}
