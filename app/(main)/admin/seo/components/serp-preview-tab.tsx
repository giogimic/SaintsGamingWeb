"use client";

import { useState, useMemo } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Laptop,
  Smartphone,
  Share2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  HelpCircle,
  Link as LinkIcon,
  Tag,
  RefreshCw,
} from "lucide-react";
import { GoogleSerpCard } from "./google-serp-card";
import { SocialCardsPreview } from "./social-cards-preview";
import { LengthGauge } from "./length-gauge";

export interface SerpPreviewTabProps {
  initialSiteName: string;
  initialTitleTemplate: string;
  initialMetaDescription: string;
  initialKeywords: string;
  initialCanonicalUrl: string;
  initialOgImage: string;
  initialTwitterHandle: string;
  onChangeField?: (field: string, value: string) => void;
}

export function SerpPreviewTab({
  initialSiteName,
  initialTitleTemplate,
  initialMetaDescription,
  initialKeywords,
  initialCanonicalUrl,
  initialOgImage,
  initialTwitterHandle,
  onChangeField,
}: SerpPreviewTabProps) {
  // Preset Archetypes for fast testing
  const presets = [
    {
      id: "home",
      label: "Home / Global Platform",
      url: "https://www.saintsgaming.net",
      title: "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
      desc: initialMetaDescription || "A chill gaming community since 2007. Dedicated game servers, custom modpacks, community forums, live streams, and embedded 2.5D MMO experience.",
    },
    {
      id: "forum",
      label: "Community Forums",
      url: "https://www.saintsgaming.net/forum",
      title: "Community Forums | Saints Gaming",
      desc: "Join community discussions, game guides, modpack suggestions, player support, and general gaming chatter.",
    },
    {
      id: "news",
      label: "News & Patch Notes",
      url: "https://www.saintsgaming.net/news/summer-expansion-patch-notes",
      title: "Summer Expansion: New World Realms & Boss Battles | Saints Gaming",
      desc: "Read official patch notes and development updates for the Saints Gaming multiplayer universe and community servers.",
    },
    {
      id: "lobby",
      label: "The Lobby 2.5D MMO",
      url: "https://www.saintsgaming.net/lobby",
      title: "The Lobby MMO - Multiplayer Social World & Beast Battles | Saints Gaming",
      desc: "Play directly in your browser. Socialize in real-time, battle wild creatures, trade in the Grand Trade Center, and build realms.",
    },
    {
      id: "servers",
      label: "Dedicated Game Servers",
      url: "https://www.saintsgaming.net/servers",
      title: "Dedicated Game Servers & Real-Time Status | Saints Gaming",
      desc: "Browse our active dedicated multiplayer game servers, connect endpoints, player counts, and server modpack links.",
    },
    {
      id: "profile",
      label: "User Profile Example",
      url: "https://www.saintsgaming.net/user/SaintMaster",
      title: "SaintMaster (Veteran Saint) - Player Profile | Saints Gaming",
      desc: "View player level, unlocked achievements, active characters, and forum activity on Saints Gaming.",
    },
  ];

  const [selectedPreset, setSelectedPreset] = useState("home");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile" | "social">("desktop");

  // Form states
  const [siteName, setSiteName] = useState(initialSiteName || "Saints Gaming");
  const [title, setTitle] = useState(
    initialTitleTemplate || "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!"
  );
  const [description, setDescription] = useState(
    initialMetaDescription ||
      "A chill gaming community since 2007. Dedicated game servers, custom modpacks, community forums, live streams, and embedded 2.5D MMO experience."
  );
  const [url, setUrl] = useState(initialCanonicalUrl || "https://www.saintsgaming.net");
  const [keywords, setKeywords] = useState(initialKeywords || "Saints Gaming, Game Servers, Modpacks, The Lobby, Forums, Community");
  const [ogImage, setOgImage] = useState(initialOgImage || "/og-image.jpg");
  const [twitterHandle, setTwitterHandle] = useState(initialTwitterHandle || "SaintsGamingNet");

  // SERP feature toggles
  const [showSitelinks, setShowSitelinks] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const handleFieldChange = (field: string, val: string) => {
    if (field === "SITE_NAME") setSiteName(val);
    if (field === "SEO_TITLE_TEMPLATE") setTitle(val);
    if (field === "META_DESCRIPTION") setDescription(val);
    if (field === "SEO_CANONICAL_URL") setUrl(val);
    if (field === "SEO_KEYWORDS") setKeywords(val);
    if (field === "SEO_OG_IMAGE") setOgImage(val);
    if (field === "SEO_TWITTER_HANDLE") setTwitterHandle(val);

    if (onChangeField) {
      onChangeField(field, val);
    }
  };

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = presets.find((x) => x.id === presetId);
    if (p) {
      setUrl(p.url);
      setTitle(p.title);
      setDescription(p.desc);
      handleFieldChange("SEO_CANONICAL_URL", p.url);
      handleFieldChange("SEO_TITLE_TEMPLATE", p.title);
      handleFieldChange("META_DESCRIPTION", p.desc);
    }
  };

  const parsedKeywords = useMemo(() => {
    return keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, [keywords]);

  // SEO Health Check Score Calculation
  const seoAudit = useMemo(() => {
    let score = 0;
    const checks: Array<{ label: string; pass: boolean; hint: string }> = [];

    // Check 1: Title length
    const titleLen = title.length;
    const titlePass = titleLen >= 30 && titleLen <= 65;
    checks.push({
      label: "Title Tag Length",
      pass: titlePass,
      hint: titlePass
        ? `Optimal length (${titleLen} chars)`
        : titleLen < 30
        ? "Too short (<30 chars), add descriptive branding"
        : "Too long (>65 chars), Google may truncate",
    });
    if (titlePass) score += 25;
    else if (titleLen > 0) score += 10;

    // Check 2: Meta description length
    const descLen = description.length;
    const descPass = descLen >= 120 && descLen <= 165;
    checks.push({
      label: "Meta Description Length",
      pass: descPass,
      hint: descPass
        ? `Optimal length (${descLen} chars)`
        : descLen < 120
        ? "Too short (<120 chars), expand on value proposition"
        : "Too long (>165 chars), snippet will truncate",
    });
    if (descPass) score += 25;
    else if (descLen > 0) score += 10;

    // Check 3: Focus keywords presence in title & description
    const matchedKeywordsInTitle = parsedKeywords.filter((k) =>
      title.toLowerCase().includes(k.toLowerCase())
    );
    const matchedKeywordsInDesc = parsedKeywords.filter((k) =>
      description.toLowerCase().includes(k.toLowerCase())
    );
    const keywordPass = matchedKeywordsInTitle.length > 0 && matchedKeywordsInDesc.length > 0;
    checks.push({
      label: "Focus Keyword Optimization",
      pass: keywordPass,
      hint: keywordPass
        ? `Keyword '${matchedKeywordsInTitle[0]}' appears in title and description`
        : "Ensure at least one target focus keyword appears in both title and snippet",
    });
    if (keywordPass) score += 25;
    else if (matchedKeywordsInTitle.length > 0 || matchedKeywordsInDesc.length > 0) score += 15;

    // Check 4: OpenGraph & Social Setup
    const ogPass = Boolean(ogImage.trim() && twitterHandle.trim());
    checks.push({
      label: "Social Share Metadata (OG & Twitter)",
      pass: ogPass,
      hint: ogPass ? "OG image and Twitter creator handle defined" : "Provide OG image URL and Twitter creator handle",
    });
    if (ogPass) score += 25;
    else if (ogImage.trim() || twitterHandle.trim()) score += 10;

    return { score, checks };
  }, [title, description, parsedKeywords, ogImage, twitterHandle]);

  return (
    <div className="space-y-8">
      {/* Top Bar: View Mode Switcher + Preset Archetype Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/60 border border-border/60 p-4 rounded-xl sg-glass">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Preview Mode:
          </span>
          <div className="inline-flex rounded-lg bg-secondary/60 p-1 border border-border/40">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "desktop" ? "default" : "ghost"}
              onClick={() => setViewMode("desktop")}
              className="h-8 text-xs gap-1.5 px-3"
            >
              <Laptop className="w-3.5 h-3.5" />
              Google Desktop
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "mobile" ? "default" : "ghost"}
              onClick={() => setViewMode("mobile")}
              className="h-8 text-xs gap-1.5 px-3"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Google Mobile
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "social" ? "default" : "ghost"}
              onClick={() => setViewMode("social")}
              className="h-8 text-xs gap-1.5 px-3"
            >
              <Share2 className="w-3.5 h-3.5" />
              Social Cards (OG & X)
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Page Archetype:</span>
          <Select value={selectedPreset} onValueChange={(val) => { if (val) applyPreset(val); }}>
            <SelectTrigger className="h-9 w-full md:w-64 text-xs">
              <SelectValue placeholder="Select page template" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Grid: Left Column = Live Preview & Audit; Right Column = Visual Inputs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left 7 Columns: Visual Preview Container */}
        <div className="xl:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Live SERP Simulation Preview
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  Real-time render
                </span>
              </div>
            </div>

            {/* Render Active View */}
            <div className="bg-black/40 border border-border/60 rounded-xl p-6 min-h-[280px] flex items-center justify-center">
              {viewMode === "desktop" && (
                <GoogleSerpCard
                  mode="desktop"
                  siteName={siteName}
                  url={url}
                  title={title}
                  description={description}
                  showSitelinks={showSitelinks}
                  showRating={showRating}
                  showDate={showDate}
                  highlightKeywords={parsedKeywords}
                />
              )}

              {viewMode === "mobile" && (
                <GoogleSerpCard
                  mode="mobile"
                  siteName={siteName}
                  url={url}
                  title={title}
                  description={description}
                  showSitelinks={showSitelinks}
                  showRating={showRating}
                  showDate={showDate}
                  highlightKeywords={parsedKeywords}
                />
              )}

              {viewMode === "social" && (
                <SocialCardsPreview
                  siteName={siteName}
                  url={url}
                  title={title}
                  description={description}
                  ogImage={ogImage}
                  twitterHandle={twitterHandle}
                />
              )}
            </div>

            {/* Rich Snippet Preview Controls */}
            {viewMode !== "social" && (
              <div className="flex flex-wrap items-center gap-4 text-xs bg-secondary/30 p-3 rounded-lg border border-border/40">
                <span className="font-semibold text-muted-foreground">Rich Snippets:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showSitelinks} onCheckedChange={setShowSitelinks} />
                  <span>Sitelinks Bar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showRating} onCheckedChange={setShowRating} />
                  <span>Review Stars (4.9 ⭐)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showDate} onCheckedChange={setShowDate} />
                  <span>Date Stamp</span>
                </label>
              </div>
            )}
          </div>

          {/* SEO Health Audit Card */}
          <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-foreground">SEO Content Health Score</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono text-primary">{seoAudit.score}/100</span>
                <Badge
                  variant="outline"
                  className={
                    seoAudit.score >= 80
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : seoAudit.score >= 50
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }
                >
                  {seoAudit.score >= 80 ? "Excellent" : seoAudit.score >= 50 ? "Needs Polish" : "Poor"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {seoAudit.checks.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-secondary/20 border border-border/30 text-xs"
                >
                  {c.pass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{c.label}</div>
                    <div className="text-muted-foreground text-[11px] leading-tight mt-0.5">{c.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Visual Metadata Inputs */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-5">
            <div className="border-b border-border/40 pb-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Metadata &amp; Search Tag Editor
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adjust site title, meta description, and target focus keywords.
              </p>
            </div>

            {/* Field: Site Brand Name */}
            <div className="space-y-1.5">
              <Label htmlFor="SITE_NAME" className="text-xs font-semibold">
                Brand / Site Name
              </Label>
              <Input
                id="SITE_NAME"
                name="SITE_NAME"
                value={siteName}
                onChange={(e) => handleFieldChange("SITE_NAME", e.target.value)}
                placeholder="e.g. Saints Gaming"
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Appears in Google breadcrumbs and tab titles.</p>
            </div>

            {/* Field: Search Title */}
            <div className="space-y-2">
              <Label htmlFor="SEO_TITLE_TEMPLATE" className="text-xs font-semibold">
                Search Result Title Tag
              </Label>
              <Input
                id="SEO_TITLE_TEMPLATE"
                name="SEO_TITLE_TEMPLATE"
                value={title}
                onChange={(e) => handleFieldChange("SEO_TITLE_TEMPLATE", e.target.value)}
                placeholder="Title displayed in Google SERP"
                className="text-sm font-medium"
              />
              <LengthGauge
                label="Title"
                value={title}
                minChars={30}
                maxChars={65}
                approxMaxPixels={580}
                avgCharPixelWidth={9.2}
                tooltipText="Google typically displays the first 50-60 characters (approx ~580px width on desktop) before truncating with an ellipsis."
              />
            </div>

            {/* Field: Meta Description */}
            <div className="space-y-2">
              <Label htmlFor="META_DESCRIPTION" className="text-xs font-semibold">
                Meta Description Snippet
              </Label>
              <Textarea
                id="META_DESCRIPTION"
                name="META_DESCRIPTION"
                rows={3}
                value={description}
                onChange={(e) => handleFieldChange("META_DESCRIPTION", e.target.value)}
                placeholder="Snippet text displayed beneath the link in search results"
                className="text-sm leading-relaxed"
              />
              <LengthGauge
                label="Snippet"
                value={description}
                minChars={120}
                maxChars={165}
                approxMaxPixels={960}
                avgCharPixelWidth={6.4}
                tooltipText="Google typically displays up to 155-160 characters (approx ~960px width on mobile viewport) before truncation."
              />
            </div>

            {/* Field: Focus Keywords */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="SEO_KEYWORDS" className="text-xs font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Target Focus Keywords
                </Label>
                <span className="text-[11px] text-muted-foreground">Comma-separated</span>
              </div>
              <Input
                id="SEO_KEYWORDS"
                name="SEO_KEYWORDS"
                value={keywords}
                onChange={(e) => handleFieldChange("SEO_KEYWORDS", e.target.value)}
                placeholder="e.g. Saints Gaming, Game Servers, Modpacks, The Lobby MMO"
                className="text-sm"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedKeywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Field: Canonical Base URL */}
            <div className="space-y-1.5">
              <Label htmlFor="SEO_CANONICAL_URL" className="text-xs font-semibold flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                Canonical Base URL
              </Label>
              <Input
                id="SEO_CANONICAL_URL"
                name="SEO_CANONICAL_URL"
                value={url}
                onChange={(e) => handleFieldChange("SEO_CANONICAL_URL", e.target.value)}
                placeholder="https://www.saintsgaming.net"
                className="text-sm font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Prevents duplicate content penalties by declaring the authoritative URL.
              </p>
            </div>

            {/* Field: OpenGraph Image & Twitter Handle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div className="space-y-1">
                <Label htmlFor="SEO_OG_IMAGE" className="text-xs font-semibold">
                  OG Social Image Path
                </Label>
                <Input
                  id="SEO_OG_IMAGE"
                  name="SEO_OG_IMAGE"
                  value={ogImage}
                  onChange={(e) => handleFieldChange("SEO_OG_IMAGE", e.target.value)}
                  placeholder="/og-image.jpg"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="SEO_TWITTER_HANDLE" className="text-xs font-semibold">
                  Twitter / X Handle
                </Label>
                <Input
                  id="SEO_TWITTER_HANDLE"
                  name="SEO_TWITTER_HANDLE"
                  value={twitterHandle}
                  onChange={(e) => handleFieldChange("SEO_TWITTER_HANDLE", e.target.value)}
                  placeholder="SaintsGamingNet"
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
