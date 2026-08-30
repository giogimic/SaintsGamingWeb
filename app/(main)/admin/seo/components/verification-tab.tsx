"use client";

import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Copy,
  Check,
  Globe,
  Key,
  FileCode,
  Sparkles,
} from "lucide-react";

interface VerificationTabProps {
  initialGoogleVerification: string;
  initialBingVerification: string;
  initialIndexNowKey: string;
  baseUrl: string;
  onChangeField?: (field: string, value: string) => void;
}

export function VerificationTab({
  initialGoogleVerification,
  initialBingVerification,
  initialIndexNowKey,
  baseUrl,
  onChangeField,
}: VerificationTabProps) {
  const [googleCode, setGoogleCode] = useState(initialGoogleVerification || "");
  const [bingCode, setBingCode] = useState(initialBingVerification || "");
  const [indexNowKey, setIndexNowKey] = useState(initialIndexNowKey || "");
  const [copiedMeta, setCopiedMeta] = useState<string | null>(null);

  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  const handleFieldChange = (field: string, val: string) => {
    if (field === "SEO_GOOGLE_VERIFICATION") setGoogleCode(val);
    if (field === "SEO_BING_VERIFICATION") setBingCode(val);
    if (field === "SEO_INDEXNOW_KEY") setIndexNowKey(val);

    if (onChangeField) {
      onChangeField(field, val);
    }
  };

  const generateIndexNowKey = () => {
    const chars = "0123456789abcdef";
    let key = "";
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    handleFieldChange("SEO_INDEXNOW_KEY", key);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMeta(id);
    setTimeout(() => setCopiedMeta(null), 2000);
  };

  // Download BingSiteAuth.xml
  const downloadBingXml = () => {
    const code = bingCode.trim() || "BING_VERIFICATION_CODE";
    const xmlContent = `<?xml version="1.0"?>\n<users>\n\t<user>${code}</user>\n</users>`;
    const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "BingSiteAuth.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Google verification HTML file
  const downloadGoogleHtml = () => {
    const code = googleCode.trim() || "google-verification";
    const fileName = code.startsWith("google") ? `${code}.html` : `google${code}.html`;
    const content = `google-site-verification: ${fileName}`;
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
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
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Search Engine Webmaster Verification Hub</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Verify platform ownership for Google Search Console and Bing Webmaster Tools via dynamic meta tags or hosted XML/HTML files.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Google Search Console Box */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass space-y-5">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                G
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Google Search Console</h4>
                <p className="text-[11px] text-muted-foreground">HTML tag or verification file method</p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={
                googleCode.trim()
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              }
            >
              {googleCode.trim() ? "Configured" : "Not Set"}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="SEO_GOOGLE_VERIFICATION" className="text-xs font-semibold">
              Google Verification Content Token
            </Label>
            <Input
              id="SEO_GOOGLE_VERIFICATION"
              name="SEO_GOOGLE_VERIFICATION"
              value={googleCode}
              onChange={(e) => handleFieldChange("SEO_GOOGLE_VERIFICATION", e.target.value)}
              placeholder="e.g. dR7xK9pL2mQ4w8vJ1n3s"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Extracted from <code className="text-foreground">&lt;meta name=&quot;google-site-verification&quot; content=&quot;TOKEN&quot; /&gt;</code>
            </p>
          </div>

          {/* Generated Meta Tag */}
          {googleCode.trim() && (
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Injected HTML Meta Tag</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `<meta name="google-site-verification" content="${googleCode.trim()}" />`,
                      "google-meta"
                    )
                  }
                  className="hover:text-white flex items-center gap-1"
                >
                  {copiedMeta === "google-meta" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedMeta === "google-meta" ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="text-emerald-400 select-all overflow-x-auto">
                {`<meta name="google-site-verification" content="${googleCode.trim()}" />`}
              </div>
            </div>
          )}

          {/* File Download & Direct Link */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={downloadGoogleHtml}
              disabled={!googleCode.trim()}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download HTML Verification File
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => window.open("https://search.google.com/search-console", "_blank")}
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open GSC Console
            </Button>
          </div>
        </div>

        {/* Bing Webmaster Tools Box */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass space-y-5">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-sm">
                B
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Bing Webmaster Tools</h4>
                <p className="text-[11px] text-muted-foreground">BingSiteAuth.xml and msvalidate.01 meta</p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={
                bingCode.trim()
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              }
            >
              {bingCode.trim() ? "Configured" : "Not Set"}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="SEO_BING_VERIFICATION" className="text-xs font-semibold">
              Bing Verification Code (32-hex)
            </Label>
            <Input
              id="SEO_BING_VERIFICATION"
              name="SEO_BING_VERIFICATION"
              value={bingCode}
              onChange={(e) => handleFieldChange("SEO_BING_VERIFICATION", e.target.value)}
              placeholder="e.g. 9B8A7C6D5E4F3A2B1C0D9E8F7A6B5C4D"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Extracted from <code className="text-foreground">&lt;meta name=&quot;msvalidate.01&quot; content=&quot;CODE&quot; /&gt;</code>
            </p>
          </div>

          {/* Dynamic BingSiteAuth.xml Endpoint Status */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <div className="font-semibold text-foreground">Dynamic XML Endpoint</div>
              <div className="text-[11px] text-muted-foreground truncate font-mono">
                {cleanBaseUrl}/BingSiteAuth.xml
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => window.open(`${cleanBaseUrl}/BingSiteAuth.xml`, "_blank")}
              className="text-xs gap-1 shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              View XML
            </Button>
          </div>

          {/* File Download & Direct Link */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={downloadBingXml}
              disabled={!bingCode.trim()}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download BingSiteAuth.xml
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => window.open("https://www.bing.com/webmasters", "_blank")}
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Bing Console
            </Button>
          </div>
        </div>
      </div>

      {/* IndexNow Instant Protocol Box */}
      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-foreground">IndexNow Instant Indexing Protocol</h4>
              <p className="text-xs text-muted-foreground">
                Modern open standard supported by Bing, Yandex, Seznam, and AI search engines for instant URL update broadcasts.
              </p>
            </div>
          </div>

          <Button type="button" size="sm" variant="outline" onClick={generateIndexNowKey} className="text-xs gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Generate New Key
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="SEO_INDEXNOW_KEY" className="text-xs font-semibold">
              IndexNow API Key (Hex)
            </Label>
            <Input
              id="SEO_INDEXNOW_KEY"
              name="SEO_INDEXNOW_KEY"
              value={indexNowKey}
              onChange={(e) => handleFieldChange("SEO_INDEXNOW_KEY", e.target.value)}
              placeholder="Click 'Generate New Key' to create 32-char hex key"
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-end">
            <div className="text-xs text-muted-foreground leading-relaxed">
              When configured, newly published articles and news announcements can instantly ping participating search engines without waiting for periodic crawler runs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
