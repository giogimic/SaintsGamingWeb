import useSWR from 'swr';
import { fetcher } from './studio-data';
import { getUserCharacters } from '@/app/actions/game';
import { fetchAllGameQuests } from '@/app/actions/game-dev';
import { getAllCreatureDefs } from '@/app/actions/creature-defs';

/**
 * Hook for cached player characters with optimistic mutate capability
 */
export function useUserCharacters() {
  const { data, error, mutate, isLoading } = useSWR(
    'userCharacters',
    async () => {
      const res = await getUserCharacters();
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    characters: data ?? [],
    isLoading,
    isError: error,
    mutateCharacters: mutate,
  };
}

/**
 * Hook for cached game quest definitions
 */
export function useGameQuests() {
  const { data, error, mutate, isLoading } = useSWR(
    'gameQuests',
    async () => {
      const res = await fetchAllGameQuests();
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    quests: data ?? [],
    isLoading,
    isError: error,
    mutateQuests: mutate,
  };
}

/**
 * Hook for cached creature definitions
 */
export function useGameCreatureDefs(gameId: string | null = 'DEFAULT') {
  const { data, error, mutate, isLoading } = useSWR(
    gameId ? ['creatureDefs', gameId] : null,
    async ([_, gid]) => {
      const res = await getAllCreatureDefs(gid);
      if (!res.success) throw new Error(res.error || 'Failed to load creatures');
      return res.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    creatureDefs: data ?? [],
    isLoading,
    isError: error,
    mutateCreatureDefs: mutate,
  };
}
