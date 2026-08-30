import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { redirect } from "next/navigation";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import Link from "next/link";
import { ForumAiSettingsPanel } from "@/web/components/admin/forum-ai-settings";
import { FORUM_AI_KEYS, LOCAL_MODEL_CATALOG } from "@/web/lib/forum-ai-catalog";

export const metadata = {
  title: "Admin - Forum Settings",
};

export default async function AdminForumSettingsPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { permissionLevel: true },
      })
    : null;

  if (!user || user.permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
    redirect("/admin");
  }

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: Object.values(FORUM_AI_KEYS) } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const canEdit = user.permissionLevel >= PERMISSION_LEVELS.DEVELOPER;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">AI Models</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            Forum &amp; AI Writing Assistants
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure local LLMs (Ollama) or cloud Gemini APIs for intelligent post summaries, grammar cleanups, and drafting assistants.
          </p>
        </div>
      </div>

      <div className="flex gap-2 text-sm border-b border-border/40 pb-2">
        <Link
          href="/admin/forum"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground text-xs font-mono"
        >
          Categories &amp; Boards
        </Link>
        <Link
          href="/admin/forum/settings"
          className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary font-bold text-xs font-mono"
        >
          AI &amp; Moderation Settings
        </Link>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
        <ForumAiSettingsPanel
          initialEnabled={map[FORUM_AI_KEYS.enabled] ?? "true"}
          initialProvider={map[FORUM_AI_KEYS.provider] ?? "gemini"}
          initialOllamaUrl={map[FORUM_AI_KEYS.ollamaUrl] ?? "http://127.0.0.1:11434"}
          initialOllamaModel={map[FORUM_AI_KEYS.ollamaModel] ?? "llama3.2:3b"}
          initialGeminiApiKey={map[FORUM_AI_KEYS.geminiApiKey] || map["GEMINI_API_KEY"] || ""}
          geminiConfigured={Boolean(process.env.GEMINI_API_KEY || map[FORUM_AI_KEYS.geminiApiKey] || map["GEMINI_API_KEY"])}
          canEdit={canEdit}
          catalog={LOCAL_MODEL_CATALOG}
        />
      </div>
    </div>
  );
}
