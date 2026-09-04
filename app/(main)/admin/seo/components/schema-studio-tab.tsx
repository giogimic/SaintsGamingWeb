"use client";

import { useState, useMemo } from "react";
import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import { Label } from "@/web/components/ui/label";
import { Textarea } from "@/web/components/ui/textarea";
import { Badge } from "@/web/components/ui/badge";
import {
  Code2,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  Sparkles,
  HelpCircle,
  Gamepad2,
  Building,
  Globe,
} from "lucide-react";

interface SchemaStudioTabProps {
  siteName: string;
  baseUrl: string;
  initialFaqData: string;
  onChangeField?: (field: string, value: string) => void;
}

interface FaqItem {
  question: string;
  answer: string;
}

export function SchemaStudioTab({
  siteName,
  baseUrl,
  initialFaqData,
  onChangeField,
}: SchemaStudioTabProps) {
  const [copied, setCopied] = useState(false);
  const [activeSchemaType, setActiveSchemaType] = useState<"website" | "organization" | "game" | "faq">("website");

  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  // FAQ list state
  const [faqs, setFaqs] = useState<FaqItem[]>(() => {
    if (initialFaqData) {
      try {
        const parsed = JSON.parse(initialFaqData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
    return [
      {
        question: "What is Saints Gaming?",
        answer: "Saints Gaming is a friendly gaming community established in 2007 offering dedicated multiplayer game servers, custom modpacks, community forums, live streams, and an embedded 2.5D browser game experience.",
      },
      {
        question: "How do I join the Saints Gaming game servers?",
        answer: "You can view active servers, IP connection addresses, and client modpack downloads on our dedicated Servers page at https://www.saintsgaming.net/servers.",
      },
      {
        question: "Is The Lobby free to play?",
        answer: "Yes! The Lobby is completely free to play directly in your web browser with real-time multiplayer, beast encounters, social hubs, and quest progression.",
      },
    ];
  });

  const updateFaqs = (newFaqs: FaqItem[]) => {
    setFaqs(newFaqs);
    if (onChangeField) {
      onChangeField("SEO_FAQ_DATA", JSON.stringify(newFaqs));
    }
  };

  const addFaq = () => {
    const updated = [
      ...faqs,
      { question: "New frequently asked question", answer: "Detailed answer for the community." },
    ];
    updateFaqs(updated);
  };

  const removeFaq = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    updateFaqs(updated);
  };

  const editFaq = (index: number, field: "question" | "answer", val: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: val };
    updateFaqs(updated);
  };

  // Generate valid Schema.org JSON-LD structured data for the selected type
  const generatedSchema = useMemo(() => {
    if (activeSchemaType === "website") {
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${cleanBaseUrl}/#website`,
        "name": siteName || "Saints Gaming",
        "url": cleanBaseUrl,
        "description": "Dedicated Game Servers, Modpacks, Community Forums, and Embedded 2.5D MMO.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${cleanBaseUrl}/forum/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      };
    }

    if (activeSchemaType === "organization") {
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${cleanBaseUrl}/#organization`,
        "name": siteName || "Saints Gaming",
        "url": cleanBaseUrl,
        "logo": `${cleanBaseUrl}/logo.png`,
        "foundingDate": "2007",
        "sameAs": [
          "https://discord.saintsgaming.net",
          "https://twitter.com/SaintsGamingNet",
          "https://twitch.tv/saintsgaming",
          "https://kick.com/saintsgaming",
        ],
      };
    }

    if (activeSchemaType === "game") {
      return {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "@id": `${cleanBaseUrl}/#game`,
        "name": "The Lobby",
        "url": `${cleanBaseUrl}/lobby`,
        "description": "An embedded 2.5D multiplayer social world where players capture creatures, craft, explore realms, and build together.",
        "genre": ["MMORPG", "Creature Collector", "Social Simulation", "Pixel Adventure"],
        "gamePlatform": ["Web Browser", "HTML5 Canvas", "WebGL"],
        "playMode": "MultiPlayer",
        "applicationCategory": "Game",
        "operatingSystem": "Any (Modern Web Browser)",
        "inLanguage": "en",
        "author": {
          "@type": "Organization",
          "name": siteName || "Saints Gaming",
        },
      };
    }

    if (activeSchemaType === "faq") {
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${cleanBaseUrl}/#faq`,
        "mainEntity": faqs.map((f) => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.answer,
          },
        })),
      };
    }

    return {};
  }, [activeSchemaType, siteName, cleanBaseUrl, faqs]);

  const jsonString = JSON.stringify(generatedSchema, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/ld+json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schema-${activeSchemaType}.jsonld`;
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
            <Code2 className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Schema.org JSON-LD Visual Studio</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate standardized Schema.org structured data to unlock Google Rich Snippets, Sitelinks SearchBox, Organization cards, and FAQ badges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open("https://search.google.com/test/rich-results", "_blank")}
            className="text-xs gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google Rich Results Test
          </Button>

          <Button type="button" size="sm" variant="default" onClick={handleDownload} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Download .jsonld
          </Button>
        </div>
      </div>

      {/* Schema Type Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeSchemaType === "website" ? "default" : "outline"}
          onClick={() => setActiveSchemaType("website")}
          className="text-xs gap-1.5"
        >
          <Globe className="w-3.5 h-3.5" />
          WebSite (SearchBox)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeSchemaType === "organization" ? "default" : "outline"}
          onClick={() => setActiveSchemaType("organization")}
          className="text-xs gap-1.5"
        >
          <Building className="w-3.5 h-3.5" />
          Organization &amp; Brand
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeSchemaType === "game" ? "default" : "outline"}
          onClick={() => setActiveSchemaType("game")}
          className="text-xs gap-1.5"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          VideoGame / Software
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeSchemaType === "faq" ? "default" : "outline"}
          onClick={() => setActiveSchemaType("faq")}
          className="text-xs gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          FAQPage (Rich Q&amp;A)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual Customizer */}
        <div className="lg:col-span-6 space-y-6">
          {activeSchemaType === "faq" && (
            <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">FAQ Structured Q&amp;A Builder</h4>
                  <p className="text-xs text-muted-foreground">Google displays FAQ dropdown accordions in search snippets.</p>
                </div>
                <Button type="button" size="sm" onClick={addFaq} className="text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add Q&amp;A
                </Button>
              </div>

              <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                {faqs.map((f, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-secondary/30 border border-border/40 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary font-mono">Q#{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeFaq(i)}
                        className="text-muted-foreground hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Question</Label>
                      <Input
                        value={f.question}
                        onChange={(e) => editFaq(i, "question", e.target.value)}
                        className="text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Answer</Label>
                      <Textarea
                        rows={2}
                        value={f.answer}
                        onChange={(e) => editFaq(i, "answer", e.target.value)}
                        className="text-xs leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSchemaType === "website" && (
            <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-4 text-xs">
              <h4 className="text-sm font-bold text-foreground">WebSite Schema Details</h4>
              <p className="text-muted-foreground leading-relaxed">
                Declares your platform brand identity and enables Google to render a dedicated search box directly within Google search results for your domain.
              </p>
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-muted-foreground">Search Action URL Template:</span>
                  <code className="font-mono text-primary">{cleanBaseUrl}/forum/search?q=...</code>
                </div>
                <div className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-muted-foreground">Canonical @id:</span>
                  <code className="font-mono text-foreground">{cleanBaseUrl}/#website</code>
                </div>
              </div>
            </div>
          )}

          {activeSchemaType === "organization" && (
            <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-4 text-xs">
              <h4 className="text-sm font-bold text-foreground">Organization Schema Details</h4>
              <p className="text-muted-foreground leading-relaxed">
                Establishes your community organization entity in Google&apos;s Knowledge Graph, associating your official Discord server and social channels.
              </p>
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-muted-foreground">Founding Date:</span>
                  <span className="font-mono font-semibold text-foreground">2007</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-muted-foreground">Official Logo:</span>
                  <code className="font-mono text-foreground">{cleanBaseUrl}/logo.png</code>
                </div>
              </div>
            </div>
          )}

          {activeSchemaType === "game" && (
            <div className="bg-card/40 border border-border/50 rounded-xl p-5 sg-glass space-y-4 text-xs">
              <h4 className="text-sm font-bold text-foreground">VideoGame Schema Details</h4>
              <p className="text-muted-foreground leading-relaxed">
                Specifies &quot;The Lobby&quot; as an embedded web-based 2.5D MMORPG video game for rich game cards in Google Search.
              </p>
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-muted-foreground">Game Genre:</span>
                  <span className="font-mono text-foreground">MMORPG, Creature Collector</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-muted-foreground">Platforms:</span>
                  <span className="font-mono text-foreground">Web Browser / HTML5 Canvas / WebGL</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-primary" />
              Generated JSON-LD Output
            </span>

            <Button type="button" size="sm" variant="ghost" onClick={handleCopy} className="text-xs gap-1">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy JSON-LD"}
            </Button>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-xl h-[440px]">
            <pre className="leading-relaxed whitespace-pre font-mono selection:bg-primary/30">
              {jsonString}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
