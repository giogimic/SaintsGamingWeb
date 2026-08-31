import useSWR from 'swr';
import type { MapIndexEntry } from '@/web/components/the-lobby/data/map-index';

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'An error occurred while fetching the data.');
  }
  return data;
};

import { getAllCreatureDefs } from '@/app/actions/creature-defs';

// Loot Tables
export function useLootTables(gameId: string | null) {
  const { data, error, mutate, isLoading } = useSWR(
    gameId ? `/api/loot/tables?gameId=${encodeURIComponent(gameId)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    lootTables: data?.items ?? [],
    isLoading,
    isError: error,
    mutateLootTables: mutate,
  };
}

// Creature Definitions
export function useCreatureDefs(gameId: string | null) {
  const { data, error, mutate, isLoading } = useSWR(
    gameId ? ['creatureDefs', gameId] : null,
    async ([_, gid]) => {
      const res = await getAllCreatureDefs(gid);
      if (!res.success) throw new Error(res.error || 'Failed to load creatures');
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  return {
    creatureDefs: data ?? [],
    isLoading,
    isError: error,
    mutateCreatureDefs: mutate,
  };
}

// Map Index
export function useMapIndex() {
  const { data, error, mutate, isLoading } = useSWR(
    '/api/maps',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const maps: MapIndexEntry[] = (data?.maps || []).map((m: any) => ({
    id: m.id,
    name: m.name || m.id,
    category: 'Special',
    recommendedLevel: 1,
    width: m.width || 24,
    height: m.height || 24,
    npcCount: m.npcCount || 0,
    gateCount: m.gateCount || 0,
    hasEncounters: false,
  }));

  return {
    maps,
    isLoading,
    isError: error,
    mutateMaps: mutate,
  };
}

// Realm Settings
export function useRealmSettings() {
  const { data, error, mutate, isLoading } = useSWR(
    '/api/realm/settings',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    settings: data?.data ?? {},
    isLoading,
    isError: error,
    mutateSettings: mutate,
  };
}
