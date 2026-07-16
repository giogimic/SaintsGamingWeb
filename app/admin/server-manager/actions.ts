"use server";

import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const BASE_DIR = process.env.FIVEM_BASE_DIR || "C:\\SaintsFiveM";
const SERVER_DIR = path.join(BASE_DIR, "server");
const TXADMIN_PORT = process.env.TXADMIN_PORT || "40120";
const STATE_FILE = path.join(BASE_DIR, "txadmin.pid");

async function checkAuth() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.permissionLevel < PERMISSION_LEVELS.FIVEM_DEVELOPER) return false;
  return true;
}

export async function getServerStatus(): Promise<{
  installed: boolean;
  running: boolean;
  txAdminUrl: string;
}> {
  const isAuth = await checkAuth();
  if (!isAuth) return { installed: false, running: false, txAdminUrl: "" };

  const installed = fs.existsSync(path.join(SERVER_DIR, "FXServer.exe"));
  let running = false;

  if (fs.existsSync(STATE_FILE)) {
    const pid = parseInt(fs.readFileSync(STATE_FILE, "utf-8").trim());
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      running = true;
    } catch {
      // Process no longer exists, clean up stale PID file
      fs.unlinkSync(STATE_FILE);
    }
  }

  return {
    installed,
    running,
    txAdminUrl: `http://localhost:${TXADMIN_PORT}`,
  };
}

export async function startTxAdmin(): Promise<{ success: boolean; message: string }> {
  const isAuth = await checkAuth();
  if (!isAuth) return { success: false, message: "Unauthorized" };

  const fxPath = path.join(SERVER_DIR, "FXServer.exe");
  if (!fs.existsSync(fxPath)) {
    return { success: false, message: "FXServer.exe not found. Please install the server artifacts first." };
  }

  // Check if already running
  if (fs.existsSync(STATE_FILE)) {
    const pid = parseInt(fs.readFileSync(STATE_FILE, "utf-8").trim());
    try {
      process.kill(pid, 0);
      return { success: false, message: "txAdmin is already running." };
    } catch {
      fs.unlinkSync(STATE_FILE);
    }
  }

  try {
    const child = spawn(fxPath, [], {
      cwd: SERVER_DIR,
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    if (child.pid) {
      fs.writeFileSync(STATE_FILE, child.pid.toString());
    }

    return { success: true, message: "txAdmin started. It may take a few seconds to become available." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function stopTxAdmin(): Promise<{ success: boolean; message: string }> {
  const isAuth = await checkAuth();
  if (!isAuth) return { success: false, message: "Unauthorized" };

  if (!fs.existsSync(STATE_FILE)) {
    return { success: false, message: "No running instance found." };
  }

  const pid = parseInt(fs.readFileSync(STATE_FILE, "utf-8").trim());
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Already dead
  }

  fs.unlinkSync(STATE_FILE);
  return { success: true, message: "txAdmin stopped." };
}
