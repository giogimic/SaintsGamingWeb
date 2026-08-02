/**
 * Forum text-enhance settings — server-side SiteSetting loader.
 */

import { prisma } from "@/web/lib/prisma";
import {
  FORUM_AI_KEYS,
  type ForumAiProvider,
} from "@/web/lib/forum-ai-catalog";

export {
  FORUM_AI_KEYS,
  LOCAL_MODEL_CATALOG,
  buildEnhancePrompt,
  getModelOption,
  type ForumAiProvider,
  type LocalModelOption,
} from "@/web/lib/forum-ai-catalog";

export interface ForumAiConfig {
  enabled: boolean;
  provider: ForumAiProvider;
  ollamaUrl: string;
  ollamaModel: string;
  geminiConfigured: boolean;
}

export async function getForumAiConfig(): Promise<ForumAiConfig> {
  const keys = Object.values(FORUM_AI_KEYS);
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [...keys] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const providerRaw = (map[FORUM_AI_KEYS.provider] || "gemini").toLowerCase();
  const provider: ForumAiProvider =
    providerRaw === "ollama" || providerRaw === "off" || providerRaw === "gemini"
      ? providerRaw
      : "gemini";

  const enabled =
    (map[FORUM_AI_KEYS.enabled] ?? "true") === "true" && provider !== "off";

  return {
    enabled,
    provider,
    ollamaUrl: (map[FORUM_AI_KEYS.ollamaUrl] || "http://127.0.0.1:11434").replace(
      /\/+$/,
      ""
    ),
    ollamaModel: map[FORUM_AI_KEYS.ollamaModel] || "llama3.2:3b",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  };
}
