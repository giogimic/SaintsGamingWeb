import { useSessionStore } from '../state/useSessionStore';
import { useHudStore } from '../state/useHudStore';
import { useWorldStore } from '../state/useWorldStore';
import { useGameStore } from '@/web/components/the-lobby/store';

export function isGameplayInputBlocked(): boolean {
  if (typeof document === 'undefined') return true;
  const game = useGameStore.getState();
  const hud = useHudStore.getState();
  return useSessionStore.getState().activeScene !== 'exploring'
    || game.gameMode !== 'EXPLORING'
    || game.isSystemMenuOpen
    || Boolean(game.activeDialog)
    || Boolean(useWorldStore.getState().activeDialog)
    || hud.openWindows.length > 0
    || game.openWindows.length > 0
    || hud.isUiEditMode
    || game.isEditingInterface
    || Boolean(document.activeElement?.closest('input, textarea, select, [contenteditable="true"]'));
}

export function matchesInputBinding(event: KeyboardEvent | MouseEvent, binding: string): boolean {
  if ('button' in event) return binding.toLowerCase() === `mouse${event.button}`;
  const normalized = binding.toLowerCase();
  return normalized === event.code.toLowerCase() || normalized === event.key.toLowerCase();
}

export function releaseGameplayCursor(canvas: HTMLCanvasElement): void {
  if (document.pointerLockElement !== canvas) return;
  (window as any).__intentionalPointerLockExit = true;
  document.exitPointerLock();
}

export function toggleGameplayCursor(canvas: HTMLCanvasElement): void {
  if (document.pointerLockElement === canvas) {
    releaseGameplayCursor(canvas);
    return;
  }
  if (isGameplayInputBlocked() || document.pointerLockElement || !canvas.requestPointerLock) return;
  canvas.focus({ preventScroll: true });
  try {
    // Run during the original key/mouse event so the browser sees a user gesture.
    void Promise.resolve(canvas.requestPointerLock()).catch(() => {
      useGameStore.getState().showToast('Cursor capture was unavailable. Press your cursor key to try again.');
    });
  } catch {
    useGameStore.getState().showToast('Cursor capture was unavailable. Press your cursor key to try again.');
  }
}
