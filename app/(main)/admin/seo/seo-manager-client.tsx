"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/web/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/web/components/ui/tabs";
import {
  Globe,
  Eye,
  Bot,
  Compass,
  ShieldCheck,
  Code2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { saveSeoConfiguration, type SitemapInventoryStats } from "./actions";
import { SerpPreviewTab } from "./components/serp-preview-tab";
import { RobotsStudioTab } from "./components/robots-studio-tab";
import { SitemapTab } from "./components/sitemap-tab";
import { VerificationTab } from "./components/verification-tab";
import { SchemaStudioTab } from "./components/schema-studio-tab";
import { AiDiscoveryTab } from "./components/ai-discovery-tab";

interface SeoManagerClientProps {
  initialConfig: Record<string, string>;
  sitemapStats: SitemapInventoryStats;
  baseUrl: string;
}

export function SeoManagerClient({
  initialConfig,
  sitemapStats,
  baseUrl,
}: SeoManagerClientProps) {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | null;
    message: string | null;
  }>({ type: null, message: null });

  // State map of current unsaved changes
  const [formDataState, setFormDataState] = useState<Record<string, string>>({
    SITE_NAME: initialConfig["SITE_NAME"] || "Saints Gaming",
    META_DESCRIPTION:
      initialConfig["META_DESCRIPTION"] ||
      "A chill gaming community since 2007. No elitism, no toxicity. Dedicated game servers, custom modpacks, community forums, live streams, and embedded 2.5D MMO experience.",
    SEO_TITLE_TEMPLATE:
      initialConfig["SEO_TITLE_TEMPLATE"] ||
      "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
    SEO_KEYWORDS:
      initialConfig["SEO_KEYWORDS"] ||
      "Saints Gaming, Game Servers, Modpacks, The Lobby, Forums, Community",
    SEO_CANONICAL_URL: initialConfig["SEO_CANONICAL_URL"] || baseUrl,
    SEO_OG_IMAGE: initialConfig["SEO_OG_IMAGE"] || "/og-image.jpg",
    SEO_TWITTER_HANDLE: initialConfig["SEO_TWITTER_HANDLE"] || "SaintsGamingNet",
    SEO_TWITTER_CARD_TYPE: initialConfig["SEO_TWITTER_CARD_TYPE"] || "summary_large_image",
    SEO_GOOGLE_VERIFICATION: initialConfig["SEO_GOOGLE_VERIFICATION"] || "",
    SEO_BING_VERIFICATION: initialConfig["SEO_BING_VERIFICATION"] || "",
    SEO_ROBOTS_CUSTOM: initialConfig["SEO_ROBOTS_CUSTOM"] || "",
    SEO_BLOCK_AI_CRAWLERS: initialConfig["SEO_BLOCK_AI_CRAWLERS"] || "false",
    SEO_STRUCTURED_DATA_CUSTOM: initialConfig["SEO_STRUCTURED_DATA_CUSTOM"] || "",
    SEO_FAQ_DATA: initialConfig["SEO_FAQ_DATA"] || "",
    SEO_INDEXNOW_KEY: initialConfig["SEO_INDEXNOW_KEY"] || "",
  });

  const handleFieldChange = (field: string, value: string) => {
    setFormDataState((prev) => ({ ...prev, [field]: value }));
    setSaveStatus({ type: null, message: null });
  };

  const handleSaveAll = () => {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(formDataState).forEach(([key, val]) => {
        fd.append(key, val);
      });

      const res = await saveSeoConfiguration(fd);
      if (res.success) {
        setSaveStatus({
          type: "success",
          message: res.message || "SEO configuration updated successfully!",
        });
      } else {
        setSaveStatus({
          type: "error",
          message: res.error || "Failed to update SEO configuration.",
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Command Center
            </Link>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-primary font-mono">Infrastructure &amp; Growth</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Globe className="w-8 h-8 text-primary" />
            SEO Studio &amp; Search Engine Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Interactive visual Google SERP simulator, meta tag customizer, robots.txt bot manager, sitemaps, and search engine verification files.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {saveStatus.message && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                saveStatus.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {saveStatus.type === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isPending}
            className="text-xs gap-2 px-4 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isPending ? "Saving Changes..." : "Save SEO Configuration"}
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="serp" className="space-y-6">
        <TabsList className="bg-card/60 border border-border/50 p-1 rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger value="serp" className="text-xs gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Eye className="w-3.5 h-3.5" />
            Visual SERP &amp; Social
          </TabsTrigger>
          <TabsTrigger value="robots" className="text-xs gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bot className="w-3.5 h-3.5" />
            Robots.txt Studio
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="text-xs gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Compass className="w-3.5 h-3.5" />
            Sitemap &amp; Indexing
          </TabsTrigger>
          <TabsTrigger value="verification" className="text-xs gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Webmaster Verification
          </TabsTrigger>
          <TabsTrigger value="schema" className="text-xs gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Code2 className="w-3.5 h-3.5" />
            JSON-LD Schema
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            AI Discovery (llms.txt)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Visual SERP & Social */}
        <TabsContent value="serp" className="outline-none">
          <SerpPreviewTab
            initialSiteName={formDataState.SITE_NAME}
            initialTitleTemplate={formDataState.SEO_TITLE_TEMPLATE}
            initialMetaDescription={formDataState.META_DESCRIPTION}
            initialKeywords={formDataState.SEO_KEYWORDS}
            initialCanonicalUrl={formDataState.SEO_CANONICAL_URL}
            initialOgImage={formDataState.SEO_OG_IMAGE}
            initialTwitterHandle={formDataState.SEO_TWITTER_HANDLE}
            onChangeField={handleFieldChange}
          />
        </TabsContent>

        {/* Tab 2: Robots.txt Studio */}
        <TabsContent value="robots" className="outline-none">
          <RobotsStudioTab
            initialCustomRules={formDataState.SEO_ROBOTS_CUSTOM}
            initialBlockAi={formDataState.SEO_BLOCK_AI_CRAWLERS}
            baseUrl={baseUrl}
            onChangeField={handleFieldChange}
          />
        </TabsContent>

        {/* Tab 3: Sitemap & Indexing */}
        <TabsContent value="sitemap" className="outline-none">
          <SitemapTab stats={sitemapStats} baseUrl={baseUrl} />
        </TabsContent>

        {/* Tab 4: Webmaster Verification */}
        <TabsContent value="verification" className="outline-none">
          <VerificationTab
            initialGoogleVerification={formDataState.SEO_GOOGLE_VERIFICATION}
            initialBingVerification={formDataState.SEO_BING_VERIFICATION}
            initialIndexNowKey={formDataState.SEO_INDEXNOW_KEY}
            baseUrl={baseUrl}
            onChangeField={handleFieldChange}
          />
        </TabsContent>

        {/* Tab 5: JSON-LD Schema Studio */}
        <TabsContent value="schema" className="outline-none">
          <SchemaStudioTab
            siteName={formDataState.SITE_NAME}
            baseUrl={baseUrl}
            initialFaqData={formDataState.SEO_FAQ_DATA}
            onChangeField={handleFieldChange}
          />
        </TabsContent>

        {/* Tab 6: AI Discovery (llms.txt) */}
        <TabsContent value="ai" className="outline-none">
          <AiDiscoveryTab siteName={formDataState.SITE_NAME} baseUrl={baseUrl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
