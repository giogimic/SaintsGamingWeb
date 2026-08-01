/**
 * Local Ollama management for Forum Settings.
 * GET  — reachability + installed tags
 * POST — pull a catalog model (streams NDJSON progress)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import {
  FORUM_AI_KEYS,
  LOCAL_MODEL_CATALOG,
  getForumAiConfig,
  getModelOption,
} from "@/web/lib/forum-ai-settings";

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });
  if (!user || user.permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
    return null;
  }
  return user;
}

export async function GET() {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await getForumAiConfig();
  let reachable = false;
  let installed: string[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${config.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      reachable = true;
      const data = (await res.json()) as {
        models?: Array<{ name?: string; model?: string }>;
      };
      installed = (data.models || [])
        .map((m) => m.name || m.model || "")
        .filter(Boolean);
    } else {
      error = `Ollama returned HTTP ${res.status}`;
    }
  } catch {
    error =
      "Ollama not reachable. Install from https://ollama.com then start the app/service.";
  }

  return NextResponse.json({
    reachable,
    error,
    ollamaUrl: config.ollamaUrl,
    selectedModel: config.ollamaModel,
    installed,
    catalog: LOCAL_MODEL_CATALOG,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    return NextResponse.json(
      { error: "Developer permission required to download models" },
      { status: 403 }
    );
  }

  let body: { action?: string; modelId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = await getForumAiConfig();

  if (body.action === "select") {
    const modelId = body.modelId || "";
    if (!getModelOption(modelId) && !modelId.includes(":")) {
      return NextResponse.json({ error: "Unknown model" }, { status: 422 });
    }
    await prisma.siteSetting.upsert({
      where: { key: FORUM_AI_KEYS.ollamaModel },
      update: { value: modelId },
      create: { key: FORUM_AI_KEYS.ollamaModel, value: modelId },
    });
    return NextResponse.json({ ok: true, ollamaModel: modelId });
  }

  if (body.action !== "pull") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const modelId = body.modelId || "";
  const catalog = getModelOption(modelId);
  if (!catalog) {
    return NextResponse.json(
      { error: "Model must be from the curated catalog" },
      { status: 422 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${config.ollamaUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelId, stream: true }),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot reach Ollama. Install from https://ollama.com and ensure it is running.",
      },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Ollama pull failed (${upstream.status})` },
      { status: 502 }
    );
  }

  // Proxy NDJSON progress to the admin UI
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
