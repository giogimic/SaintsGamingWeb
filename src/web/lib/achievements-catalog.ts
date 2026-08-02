import { JSX } from "react";
import {
  AchievementFirstBlood,
  AchievementBetaTester,
  AchievementSocialButterfly,
  AchievementRich,
  AchievementVeteran,
} from "@/web/components/achievements/achievement-icons";

export type AchievementRarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rarity: AchievementRarity;
  colorClass: string;
  glowClass: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_blood: {
    id: "first_blood",
    title: "First Blood",
    description: "Created your very first forum post.",
    rarity: "Common",
    colorClass: "text-blue-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]",
    Icon: AchievementFirstBlood,
  },
  first_reply: {
    id: "first_reply",
    title: "Conversation Starter",
    description: "Posted your first reply on the forums.",
    rarity: "Common",
    colorClass: "text-sky-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    Icon: AchievementFirstBlood,
  },
  social_starter: {
    id: "social_starter",
    title: "On The Feed",
    description: "Published your first social feed post.",
    rarity: "Common",
    colorClass: "text-cyan-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]",
    Icon: AchievementSocialButterfly,
  },
  tipper: {
    id: "tipper",
    title: "Generous Saint",
    description: "Sent your first tip on the social feed.",
    rarity: "Rare",
    colorClass: "text-emerald-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    Icon: AchievementRich,
  },
  beta_tester: {
    id: "beta_tester",
    title: "Beta Tester",
    description: "Participated during the early beta phase of Saints Web.",
    rarity: "Legendary",
    colorClass: "text-purple-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]",
    Icon: AchievementBetaTester,
  },
  social_butterfly: {
    id: "social_butterfly",
    title: "Social Butterfly",
    description: "Reached 50 friends on your friend list.",
    rarity: "Rare",
    colorClass: "text-pink-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]",
    Icon: AchievementSocialButterfly,
  },
  rich: {
    id: "rich",
    title: "High Roller",
    description: "Accumulated over $100,000 in your FiveM bank.",
    rarity: "Epic",
    colorClass: "text-green-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]",
    Icon: AchievementRich,
  },
  veteran: {
    id: "veteran",
    title: "Saints Veteran",
    description: "Member of the community for over 1 year.",
    rarity: "Epic",
    colorClass: "text-amber-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    Icon: AchievementVeteran,
  },
};

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS[id];
}

export function getAllAchievements(): AchievementDef[] {
  return Object.values(ACHIEVEMENTS);
}
