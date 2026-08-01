"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { updateForumAiSettings } from "@/app/(main)/admin/actions";
import { Loader2, Download, CheckCircle2, AlertCircle, HardDrive } from "lucide-react";
import type { LocalModelOption } from "@/web/lib/forum-ai-catalog";

interface ForumAiSettingsProps {
  initialEnabled: string;
  initialProvider: string;
  initialOllamaUrl: string;
  initialOllamaModel: string;
  geminiConfigured: boolean;
  canEdit: boolean;
  catalog: LocalModelOption[];
}

type LocalStatus = {
  reachable: boolean;
  error: string | null;
  installed: string[];
  ollamaUrl: string;
};

function tierLabel(tier: LocalModelOption["tier"]) {
  if (tier === "light") return "Light";
  if (tier === "medium") return "Medium";
  return "Heavy";
}

export function ForumAiSettingsPanel({
  initialEnabled,
  initialProvider,
  initialOllamaUrl,
  initialOllamaModel,
  geminiConfigured,
  canEdit,
  catalog,
}: ForumAiSettingsProps) {
  const [provider, setProvider] = useState(initialProvider);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [ollamaUrl, setOllamaUrl] = useState(initialOllamaUrl);
  const [ollamaModel, setOllamaModel] = useState(initialOllamaModel);
  const [status, setStatus] = useState<LocalStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullLog, setPullLog] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/ai/local");
      if (!res.ok) throw new Error("Failed to query Ollama");
      setStatus(await res.json());
    } catch {
      setStatus({
        reachable: false,
        error: "Failed to query local status",
        installed: [],
        ollamaUrl,
      });
    } finally {
      setStatusLoading(false);
    }
  }, [ollamaUrl]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const isInstalled = (id: string) =>
    (status?.installed || []).some(
      (name) => name === id || name.startsWith(`${id}:`) || name.startsWith(`${id}-`)
    );

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("forum_ai_enabled", enabled);
      fd.set("forum_ai_provider", provider);
      fd.set("forum_ai_ollama_url", ollamaUrl.trim() || "http://127.0.0.1:11434");
      fd.set("forum_ai_ollama_model", ollamaModel);
      await updateForumAiSettings(fd);
      setMessage("Forum text-enhance settings saved.");
      await refreshStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function pullModel(modelId: string) {
    if (!canEdit || pulling) return;
    setPulling(modelId);
    setPullLog(`Starting download: ${modelId}…\n`);
    try {
      const res = await fetch("/api/ai/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull", modelId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Pull failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No progress stream");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line) as {
              status?: string;
              completed?: number;
              total?: number;
            };
            const pct =
              json.total && json.completed
                ? ` ${Math.round((json.completed / json.total) * 100)}%`
                : "";
            setPullLog((prev) => `${prev}${json.status || "…"}${pct}\n`);
          } catch {
            /* ignore */
          }
        }
      }
      setPullLog((prev) => `${prev}Done.\n`);
      await fetch("/api/ai/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", modelId }),
      });
      setOllamaModel(modelId);
      await refreshStatus();
    } catch (err) {
      setPullLog(
        (prev) =>
          `${prev}Error: ${err instanceof Error ? err.message : "pull failed"}\n`
      );
    } finally {
      setPulling(null);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4 border-b border-border/40 pb-6">
          <h2 className="text-xl font-semibold">Text enhancement</h2>
          <p className="text-sm text-muted-foreground">
            Controls Grammar Check / Polish buttons in the forum and news markdown editors.
            Cloud uses Gemini; local uses{" "}
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Ollama
            </a>{" "}
            on this server.
          </p>

          <div className="space-y-2">
            <Label>Feature enabled</Label>
            <Select
              value={enabled}
              onValueChange={(v) => setEnabled(v ?? "true")}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled (hide editor buttons)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v ?? "gemini")}
              disabled={!canEdit || enabled !== "true"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">
                  Cloud — Gemini 2.5 Flash
                  {!geminiConfigured ? " (GEMINI_API_KEY missing)" : ""}
                </SelectItem>
                <SelectItem value="ollama">Local — Ollama (downloaded models)</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
            {provider === "gemini" && !geminiConfigured && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Set <code>GEMINI_API_KEY</code> in the
                server environment.
              </p>
            )}
          </div>

          {provider === "ollama" && (
            <div className="space-y-2">
              <Label htmlFor="ollama_url">Ollama base URL</Label>
              <Input
                id="ollama_url"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="http://127.0.0.1:11434"
              />
              <p className="text-xs text-muted-foreground">
                Default local daemon. Docker/remote hosts can point elsewhere.
              </p>
            </div>
          )}
        </div>

        {!canEdit && (
          <p className="text-sm text-muted-foreground">
            Viewing only — Developer permission is required to save or download models.
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canEdit || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save settings
          </Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </form>

      {provider === "ollama" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <HardDrive className="h-5 w-5" /> Local models
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Estimates are approximate RAM when the model is loaded (quantized defaults).
                Download size is separate disk usage.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              disabled={statusLoading}
            >
              {statusLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Refresh status
            </Button>
          </div>

          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              status?.reachable
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/5 text-amber-100"
            }`}
          >
            {statusLoading && !status
              ? "Checking Ollama…"
              : status?.reachable
                ? `Ollama reachable at ${status.ollamaUrl} · ${status.installed.length} model(s) installed`
                : status?.error || "Ollama not reachable"}
          </div>

          <div className="space-y-3">
            {catalog.map((model) => {
              const installed = isInstalled(model.id);
              const selected = ollamaModel === model.id;
              return (
                <div
                  key={model.id}
                  className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                    selected ? "border-primary/50 bg-primary/5" : "border-border/50"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {model.label}
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
                        {tierLabel(model.tier)}
                      </span>
                      {installed && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Installed
                        </span>
                      )}
                      {selected && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{model.notes}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      ~{model.ramGb} GiB RAM · ~{model.downloadGb} GiB download ·{" "}
                      <code>{model.id}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || !installed || selected}
                      onClick={async () => {
                        setOllamaModel(model.id);
                        if (canEdit) {
                          await fetch("/api/ai/local", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "select", modelId: model.id }),
                          });
                        }
                      }}
                    >
                      Use
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canEdit || !!pulling || !status?.reachable}
                      onClick={() => pullModel(model.id)}
                    >
                      {pulling === model.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      {installed ? "Re-download" : "Download"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {pullLog && (
            <pre className="text-xs bg-black/40 border border-border/40 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-muted-foreground">
              {pullLog}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
