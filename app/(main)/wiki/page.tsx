import type { Metadata } from "next";
import WikiLandingView from "@/web/components/wiki/WikiLandingView";
import { constructPageMetadata } from "@/web/lib/seo";

export const metadata: Metadata = constructPageMetadata({
  title: "Wiki & Game Codex",
  description: "Official guides, lore, game systems, and developer documentation for Saints Gaming.",
  path: "/wiki",
});

export default function WikiPage() {
  return <WikiLandingView />;
}

