import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioKeyboardRouter } from '../StudioKeyboardRouter';
import { MapPersistenceService } from '../MapPersistenceService';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';

describe('Studio Services (Keyboard Router & Map Persistence)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.setState({
      isCreationMode: true,
      brushRadius: 1,
      brushMode: 'paint',
    });
    useGameStore.setState({
      currentMapId: undefined,
      activeMapData: null,
    });
  });

  describe('StudioKeyboardRouter', () => {
    it('ignores shortcuts when target is an input or textarea', () => {
      const showToast = vi.fn();
      const onToggleOmnisearch = vi.fn();
      const mockInput = { tagName: 'INPUT' } as any;

      const event = {
        key: 'k',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: mockInput,
        preventDefault: vi.fn(),
      } as any;

      const handled = StudioKeyboardRouter.handleKeyDown(event, { showToast, onToggleOmnisearch });
      expect(handled).toBe(false);
      expect(onToggleOmnisearch).not.toHaveBeenCalled();
    });

    it('triggers Omnisearch on Ctrl+K', () => {
      const showToast = vi.fn();
      const onToggleOmnisearch = vi.fn();

      const event = {
        key: 'k',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: null,
        preventDefault: vi.fn(),
      } as any;

      const handled = StudioKeyboardRouter.handleKeyDown(event, { showToast, onToggleOmnisearch });

      expect(handled).toBe(true);
      expect(onToggleOmnisearch).toHaveBeenCalled();
    });

    it('cycles brush radius on [ and ] keys', () => {
      const showToast = vi.fn();
      useEditorStore.setState({ brushRadius: 1 });

      const eventNext = {
        key: ']',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: null,
        preventDefault: vi.fn(),
      } as any;

      // Press ']' -> size 3
      StudioKeyboardRouter.handleKeyDown(eventNext, { showToast });
      expect(useEditorStore.getState().brushRadius).toBe(3);

      // Press ']' -> size 5
      StudioKeyboardRouter.handleKeyDown(eventNext, { showToast });
      expect(useEditorStore.getState().brushRadius).toBe(5);

      const eventPrev = {
        key: '[',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: null,
        preventDefault: vi.fn(),
      } as any;

      // Press '[' -> size 3
      StudioKeyboardRouter.handleKeyDown(eventPrev, { showToast });
      expect(useEditorStore.getState().brushRadius).toBe(3);
    });

    it('dispatches STUDIO_TRIGGER_SAVE_MAP_EVENT on Ctrl+S', () => {
      const showToast = vi.fn();
      const mockDispatch = vi.fn();
      (globalThis as any).window = { dispatchEvent: mockDispatch };

      const event = {
        key: 's',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: null,
        preventDefault: vi.fn(),
      } as any;

      const handled = StudioKeyboardRouter.handleKeyDown(event, { showToast });

      expect(handled).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: STUDIO_TRIGGER_SAVE_MAP_EVENT })
      );
    });

    it('switches tool modes and toggles options with single key hotkeys (B, E, F/G, I, M, R)', () => {
      const showToast = vi.fn();

      const createKeyEvent = (key: string) => ({
        key,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: null,
        preventDefault: vi.fn(),
      } as any);

      // 'e' -> eraser
      StudioKeyboardRouter.handleKeyDown(createKeyEvent('e'), { showToast });
      expect(useEditorStore.getState().brushMode).toBe('erase');

      // 'b' -> paint
      StudioKeyboardRouter.handleKeyDown(createKeyEvent('b'), { showToast });
      expect(useEditorStore.getState().brushMode).toBe('paint');

      // 'g' -> fill
      StudioKeyboardRouter.handleKeyDown(createKeyEvent('g'), { showToast });
      expect(useEditorStore.getState().brushMode).toBe('fill');

      // 'i' -> eyedropper
      StudioKeyboardRouter.handleKeyDown(createKeyEvent('i'), { showToast });
      expect(useEditorStore.getState().brushMode).toBe('eyedropper');

      // 'm' -> toggle snap to grid
      const initialSnap = useEditorStore.getState().snapToGrid;
      StudioKeyboardRouter.handleKeyDown(createKeyEvent('m'), { showToast });
      expect(useEditorStore.getState().snapToGrid).toBe(!initialSnap);

      // 'r' -> rotate stamp
      const initialRot = useEditorStore.getState().brushRotation;
      StudioKeyboardRouter.handleKeyDown(createKeyEvent('r'), { showToast });
      expect(useEditorStore.getState().brushRotation).toBe((initialRot + 90) % 360);
    });
  });

  describe('MapPersistenceService', () => {
    it('returns error when saving without an active map loaded', async () => {
      useGameStore.setState({ currentMapId: undefined, activeMapData: null });
      const result = await MapPersistenceService.saveActiveMap();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('No map loaded to save.');
    });

    it('returns error when map data is not yet initialized', async () => {
      useGameStore.setState({ currentMapId: 'DEMO_SANDBOX', activeMapData: null });
      const result = await MapPersistenceService.saveActiveMap();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Map data not loaded yet');
    });
  });
});
