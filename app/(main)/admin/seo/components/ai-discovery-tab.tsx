"use client";

import { useState, useMemo } from "react";
import { Button } from "@/web/components/ui/button";
import { Badge } from "@/web/components/ui/badge";
import {
  Sparkles,
  Copy,
  Download,
  ExternalLink,
  Check,
  Bot,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface AiDiscoveryTabProps {
  siteName: string;
  baseUrl: string;
}

export function AiDiscoveryTab({ siteName, baseUrl }: AiDiscoveryTabProps) {
  const [copied, setCopied] = useState(false);
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  const llmsContent = useMemo(() => {
    return `# ${siteName || "Saints Gaming"} — AI & LLM Discovery Index

> Standardized machine-readable reference for AI search engines, agents, and answer engines (Perplexity, ChatGPT Search, Google Gemini).

## Platform Summary
Saints Gaming is a dedicated multiplayer gaming community and sandbox platform founded in 2007. The platform hosts high-performance dedicated game servers, custom game modpacks, community discussion forums, live creator streaming syndication, and an embedded real-time 2.5D browser MMORPG ("The Lobby").

## Canonical Routes & Architecture
- Home & Platform Hub: ${cleanBaseUrl}
- Community Discussion Forums: ${cleanBaseUrl}/forum
- Latest News & Patch Notes: ${cleanBaseUrl}/news
- Dedicated Game Servers & Real-Time Status: ${cleanBaseUrl}/servers
- Client Modpack Downloads: ${cleanBaseUrl}/modpacks
- Live Creator Streams: ${cleanBaseUrl}/streams
- The Lobby Game: ${cleanBaseUrl}/lobby
- Player Wiki & Game Guides: ${cleanBaseUrl}/wiki
- Community Support & Appeals: ${cleanBaseUrl}/support

## Key Technical Specifications
- Engine: Next.js 15, React 19, Socket.io Realtime Bus, Babylon.js 2.5D WebGL/Canvas
- Database: Prisma ORM with SQLite / MySQL hybrid storage
- Identity: Discord OAuth2 & Credentials auth with Role-Based Access Control (RBAC)
- Community Rules: Friendly, zero-toxicity, non-elitist gaming environment since 2007.

## Machine Discovery
- XML Sitemap: ${cleanBaseUrl}/sitemap.xml
- Robots Rules: ${cleanBaseUrl}/robots.txt
`;
  }, [siteName, cleanBaseUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(llmsContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([llmsContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "llms.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-base font-bold text-foreground">AI Search &amp; llms.txt Discovery Hub</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Provide clean, markdown-formatted structured context for emerging AI search engines (Perplexity, ChatGPT Search, Gemini) via <code className="text-primary font-mono font-semibold">/llms.txt</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open(`${cleanBaseUrl}/llms.txt`, "_blank")}
            className="text-xs gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Live /llms.txt
          </Button>

          <Button type="button" size="sm" variant="default" onClick={handleDownload} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Download llms.txt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Explanations & Capabilities */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-4 text-xs">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              What is llms.txt?
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              <code className="text-foreground font-mono">llms.txt</code> is an open community proposal to help Large Language Models and AI crawlers ingest clean, high-signal platform context without wading through heavy HTML tags, hydration scripts, or complex DOMs.
            </p>

            <div className="space-y-2 pt-3 border-t border-border/40">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Optimized token efficiency for LLM context windows</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Accurate brand citation in AI search queries</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Automatically served dynamically by Next.js route handler</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: llms.txt Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              Live /llms.txt Output Preview
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={handleCopy} className="text-xs gap-1">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Markdown"}
            </Button>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto shadow-xl h-[420px]">
            <pre className="leading-relaxed whitespace-pre font-mono selection:bg-primary/30">
              {llmsContent}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
