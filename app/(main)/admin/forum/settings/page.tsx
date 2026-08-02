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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forum Settings</h1>
          <p className="text-muted-foreground mt-2">
            Editor helpers and local/cloud text enhancement for forum &amp; news posts.
          </p>
        </div>
        <Link
          href="/admin/forum"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          ← Categories
        </Link>
      </div>

      <div className="flex gap-2 text-sm border-b border-border/40 pb-2">
        <Link
          href="/admin/forum"
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground"
        >
          Categories
        </Link>
        <Link
          href="/admin/forum/settings"
          className="px-3 py-1.5 rounded-md bg-primary/15 text-primary font-medium"
        >
          Settings
        </Link>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-6">
        <ForumAiSettingsPanel
          initialEnabled={map[FORUM_AI_KEYS.enabled] ?? "true"}
          initialProvider={map[FORUM_AI_KEYS.provider] ?? "gemini"}
          initialOllamaUrl={map[FORUM_AI_KEYS.ollamaUrl] ?? "http://127.0.0.1:11434"}
          initialOllamaModel={map[FORUM_AI_KEYS.ollamaModel] ?? "llama3.2:3b"}
          geminiConfigured={Boolean(process.env.GEMINI_API_KEY)}
          canEdit={canEdit}
          catalog={LOCAL_MODEL_CATALOG}
        />
      </div>
    </div>
  );
}
