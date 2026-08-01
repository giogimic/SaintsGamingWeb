import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getForumAiConfig, getModelOption } from "@/web/lib/forum-ai-settings";

/** Authenticated clients: whether enhance buttons should show. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ enabled: false }, { status: 401 });
  }

  const config = await getForumAiConfig();
  const model = getModelOption(config.ollamaModel);

  return NextResponse.json({
    enabled: config.enabled,
    provider: config.provider,
    ollamaModel: config.ollamaModel,
    modelLabel: model?.label,
    estimatedRamGb: model?.ramGb,
    geminiConfigured: config.geminiConfigured,
  });
}
