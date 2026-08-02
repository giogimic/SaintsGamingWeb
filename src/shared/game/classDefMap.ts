import type { ClassDefData } from "./classCatalog";
import { resolveClassStats } from "./classCatalog";

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return JSON.parse(raw || "") as T;
  } catch {
    return fallback;
  }
}

export function classRowToData(row: {
  slug: string;
  classId?: string | null;
  name: string;
  description: string;
  icon?: string | null;
  color: string;
  profileId?: string | null;
  baseStats: string;
  statDeltas?: string | null;
  skillDeltas?: string | null;
  growthRates: string;
  allowedSpriteTags: string;
  spriteFilters: string;
  startingEquipment: string;
  perks: string;
  abilities: string;
  isPlayable: boolean;
  sortOrder: number;
}): ClassDefData {
  const classId = (row.classId || row.slug || "").toUpperCase();
  return {
    slug: row.slug,
    classId,
    name: row.name,
    description: row.description || "",
    icon: row.icon,
    color: row.color,
    profileId: row.profileId ?? null,
    statDeltas: parseJson(row.statDeltas, {}),
    skillDeltas: parseJson(row.skillDeltas, {}),
    growthRates: parseJson(row.growthRates, {}),
    allowedSpriteTags: parseJson(row.allowedSpriteTags, []),
    spriteFilters: parseJson(row.spriteFilters, {}),
    startingEquipment: parseJson(row.startingEquipment, []),
    perks: parseJson(row.perks, []),
    abilities: parseJson(row.abilities, []),
    isPlayable: row.isPlayable !== false,
    sortOrder: row.sortOrder || 0,
  };
}

export function classDataToDb(data: ClassDefData, gameId: string) {
  const resolved = resolveClassStats(data);
  const profileId =
    data.profileId === undefined || data.profileId === ''
      ? null
      : data.profileId;
  return {
    gameId,
    profileId,
    slug: data.slug,
    classId: (data.classId || data.slug).toUpperCase(),
    name: data.name,
    description: data.description || "",
    icon: data.icon || null,
    color: data.color || "#cbb26a",
    baseStats: JSON.stringify(resolved),
    statDeltas: JSON.stringify(data.statDeltas || {}),
    skillDeltas: JSON.stringify(data.skillDeltas || {}),
    growthRates: JSON.stringify(data.growthRates || {}),
    allowedSpriteTags: JSON.stringify(data.allowedSpriteTags || []),
    spriteFilters: JSON.stringify(data.spriteFilters || {}),
    startingEquipment: JSON.stringify(data.startingEquipment || []),
    learnableSkills: JSON.stringify([]),
    perks: JSON.stringify(data.perks || []),
    abilities: JSON.stringify(data.abilities || []),
    isPlayable: data.isPlayable !== false,
    sortOrder: data.sortOrder || 0,
  };
}
