import { expect, test } from 'vitest';
import { useGameStore } from './store';

test('store reads and writes without React context', () => {
  const store = useGameStore.getState();
  expect(store.gameMode).toBe('EXPLORING');
  expect(store.player.position).toEqual({ x: 0, y: 0 });

  useGameStore.getState().setGameMode('PAUSED');
  useGameStore.getState().setPlayerPosition({ x: 5, y: 5 });

  const updatedStore = useGameStore.getState();
  expect(updatedStore.gameMode).toBe('PAUSED');
  expect(updatedStore.player.position).toEqual({ x: 5, y: 5 });

  // Test immer enqueue / dequeue
  useGameStore.getState().enqueuePath([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
  expect(useGameStore.getState().pathQueue).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }]);

  const nextPoint = useGameStore.getState().dequeuePath();
  expect(nextPoint).toEqual({ x: 1, y: 1 });
  expect(useGameStore.getState().pathQueue).toEqual([{ x: 2, y: 2 }]);
});
