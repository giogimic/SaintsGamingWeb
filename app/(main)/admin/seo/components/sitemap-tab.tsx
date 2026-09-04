"use client";

import { useState } from "react";
import { Button } from "@/web/components/ui/button";
import { Badge } from "@/web/components/ui/badge";
import {
  FileCode2,
  ExternalLink,
  Copy,
  Download,
  Check,
  Globe,
  Layers,
  Newspaper,
  Package,
  MessageSquare,
  Users,
  Compass,
  Zap,
} from "lucide-react";
import type { SitemapInventoryStats } from "../actions";

interface SitemapTabProps {
  stats: SitemapInventoryStats;
  baseUrl: string;
}

export function SitemapTab({ stats, baseUrl }: SitemapTabProps) {
  const [copied, setCopied] = useState(false);
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const sitemapUrl = `${cleanBaseUrl}/sitemap.xml`;

  const sitemapCategories = [
    { label: "Core Static Pages", count: stats.staticCount, freq: "Daily", priority: "1.0 - 0.5", icon: Globe, color: "text-blue-400" },
    { label: "Published News Articles", count: stats.newsCount, freq: "Weekly", priority: "0.7", icon: Newspaper, color: "text-emerald-400" },
    { label: "Active Game Modpacks", count: stats.modpacksCount, freq: "Monthly", priority: "0.8", icon: Package, color: "text-purple-400" },
    { label: "Public Forum Boards", count: stats.forumCategoriesCount, freq: "Daily", priority: "0.6", icon: Layers, color: "text-amber-400" },
    { label: "Community Threads", count: stats.threadsCount, freq: "Daily", priority: "0.5", icon: MessageSquare, color: "text-pink-400" },
    { label: "Member Profiles", count: stats.usersCount, freq: "Weekly", priority: "0.6", icon: Users, color: "text-cyan-400" },
  ];

  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Static Routes (${stats.staticCount} routes) -->
  <url>
    <loc>${cleanBaseUrl}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${cleanBaseUrl}/forum</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${cleanBaseUrl}/lobby</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${cleanBaseUrl}/news</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Dynamic Content Inventory -->
  <!-- News Articles: ${stats.newsCount} published items -->
  <!-- Modpacks: ${stats.modpacksCount} active items -->
  <!-- Forum Categories: ${stats.forumCategoriesCount} boards -->
  <!-- Threads: ${stats.threadsCount} public discussions -->
  <!-- User Profiles: ${stats.usersCount} members -->
</urlset>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sampleXml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sitemap.xml";
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
            <Compass className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Sitemap.xml Explorer &amp; Index Inventory</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Real-time breakdown of all indexed platform routes served dynamically via Next.js <code className="text-primary font-mono font-semibold">/sitemap.xml</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open(sitemapUrl, "_blank")}
            className="text-xs gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Live /sitemap.xml
          </Button>
          <Button type="button" size="sm" variant="default" onClick={handleDownload} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Download sitemap.xml
          </Button>
        </div>
      </div>

      {/* Inventory Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {sitemapCategories.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="p-3.5 rounded-xl bg-card/40 border border-border/50 sg-glass space-y-1.5">
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${c.color}`} />
                <Badge variant="outline" className="text-[10px] py-0 font-mono">
                  {c.freq}
                </Badge>
              </div>
              <div className="text-xl font-bold font-mono text-foreground mt-1">
                {c.count.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* Total Index Summary & Submission Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 6 Columns: Submission Actions & Search Engine Links */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Submit Sitemap to Search Consoles
              </h4>
              <Badge variant="outline" className="text-xs text-primary font-mono font-bold">
                {stats.totalUrls.toLocaleString()} Total URLs
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Google and Bing automatically discover sitemaps through the <code className="font-mono text-foreground">Sitemap:</code> directive in <code className="font-mono text-foreground">robots.txt</code>. For instant first-time registration, submit your XML endpoint directly in their webmaster consoles:
            </p>

            <div className="space-y-3">
              {/* Google Search Console Direct Box */}
              <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">Google Search Console</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Submit: <span className="font-mono text-primary">{cleanBaseUrl}/sitemap.xml</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open("https://search.google.com/search-console/sitemaps", "_blank")}
                  className="text-xs gap-1 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  GSC Console
                </Button>
              </div>

              {/* Bing Webmaster Direct Box */}
              <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">Bing Webmaster Tools</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Submit: <span className="font-mono text-primary">{cleanBaseUrl}/sitemap.xml</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open("https://www.bing.com/webmasters/sitemaps", "_blank")}
                  className="text-xs gap-1 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  Bing Console
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
              💡 <em>Note:</em> Dynamic routes such as news articles and active threads are automatically synchronized with their respective database <code className="font-mono text-foreground">updatedAt</code> timestamps.
            </div>
          </div>
        </div>

        {/* Right 6 Columns: XML Preview Box */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-primary" />
              Sitemap Structure Preview
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={handleCopy} className="text-xs gap-1">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy XML"}
            </Button>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto shadow-xl h-[340px]">
            <pre className="leading-relaxed whitespace-pre font-mono selection:bg-primary/30">
              {sampleXml}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
