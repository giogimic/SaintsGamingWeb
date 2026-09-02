import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolDispatcher } from '../ToolDispatcher';
import { SelectToolHandler } from '../SelectToolHandler';
import { BrushToolHandler } from '../BrushToolHandler';
import { FillToolHandler } from '../FillToolHandler';
import { EraserToolHandler } from '../EraserToolHandler';
import { EyedropperToolHandler } from '../EyedropperToolHandler';
import { PrefabToolHandler } from '../PrefabToolHandler';
import { PasteToolHandler } from '../PasteToolHandler';
import type { ToolExecutionContext } from '../IToolHandler';
import type { ToolPointerEvent } from '../../types';

describe('ToolDispatcher & Modular Tool Handlers', () => {
  let dispatcher: ToolDispatcher;
  let mockEngine: any;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    dispatcher = new ToolDispatcher();
    mockEngine = {
      updateSingleTile: vi.fn(),
      updateLogicTile: vi.fn().mockReturnValue(true),
      enableLogicGridOverlay: vi.fn(),
      clearActionPreview: vi.fn(),
      clearSelectionPreview: vi.fn(),
      getCurrentTileSize: vi.fn().mockReturnValue(1),
    };
    mockContext = {
      engine: mockEngine,
      mapData: {
        id: 'test_map',
        name: 'Test Map',
        width: 10,
        height: 10,
        grid: Array.from({ length: 10 }, () => Array(10).fill(0)),
        tileLayers: [
          { name: 'Ground', visible: true, locked: false, grid: Array.from({ length: 10 }, () => Array(10).fill(1)) },
          { name: 'Overlay', visible: true, locked: false, grid: Array.from({ length: 10 }, () => Array(10).fill(0)) },
        ],
        tilesets: [{ firstgid: 1, imageSource: '/tiles.png', columns: 8 }],
      } as any,
      showToast: vi.fn(),
    };
  });

  it('initializes with all core tool handlers registered', () => {
    expect(dispatcher.getHandler('select')).toBeInstanceOf(SelectToolHandler);
    expect(dispatcher.getHandler('brush')).toBeInstanceOf(BrushToolHandler);
    expect(dispatcher.getHandler('fill')).toBeInstanceOf(FillToolHandler);
    expect(dispatcher.getHandler('eraser')).toBeInstanceOf(EraserToolHandler);
    expect(dispatcher.getHandler('eyedropper')).toBeInstanceOf(EyedropperToolHandler);
    expect(dispatcher.getHandler('prefab')).toBeInstanceOf(PrefabToolHandler);
    expect(dispatcher.getHandler('paste')).toBeInstanceOf(PasteToolHandler);
  });

  it('switches active tool and notifies previous tool onCancel if tool changed', () => {
    const selectHandler = dispatcher.getHandler('select');
    const onCancelSpy = vi.spyOn(selectHandler!, 'onCancel');

    dispatcher.setActiveTool('select', mockContext);
    expect(dispatcher.getActiveToolId()).toBe('select');

    dispatcher.setActiveTool('brush', mockContext);
    expect(dispatcher.getActiveToolId()).toBe('brush');
    expect(onCancelSpy).toHaveBeenCalledWith(mockContext);
  });

  it('dispatches pointer down to active tool handler', () => {
    const brushHandler = dispatcher.getHandler('brush');
    const pointerDownSpy = vi.spyOn(brushHandler!, 'onPointerDown').mockReturnValue(true);

    dispatcher.setActiveTool('brush', mockContext);

    const event: ToolPointerEvent = {
      eventType: 'down',
      button: 0,
      tilePos: { r: 2, c: 3 },
      worldPos: { x: 3.5, y: 0, z: 2.5 },
      rawEvent: { buttons: 1 } as any,
      isShift: false,
      isCtrl: false,
      isAlt: false,
      isSpace: false,
    };

    const handled = dispatcher.dispatchPointerDown(event, mockContext);
    expect(handled).toBe(true);
    expect(pointerDownSpy).toHaveBeenCalledWith(event, mockContext);
  });

  it('dispatches pointer move to active tool handler', () => {
    const brushHandler = dispatcher.getHandler('brush');
    const pointerMoveSpy = vi.spyOn(brushHandler!, 'onPointerMove').mockReturnValue(true);

    dispatcher.setActiveTool('brush', mockContext);

    const event: ToolPointerEvent = {
      eventType: 'move',
      button: 0,
      tilePos: { r: 2, c: 4 },
      worldPos: { x: 4.5, y: 0, z: 2.5 },
      rawEvent: { buttons: 1 } as any,
      isShift: false,
      isCtrl: false,
      isAlt: false,
      isSpace: false,
    };

    const handled = dispatcher.dispatchPointerMove(event, mockContext);
    expect(handled).toBe(true);
    expect(pointerMoveSpy).toHaveBeenCalledWith(event, mockContext);
  });

  it('dispatches pointer up to active tool handler', () => {
    const selectHandler = dispatcher.getHandler('select');
    const pointerUpSpy = vi.spyOn(selectHandler!, 'onPointerUp').mockReturnValue(true);

    dispatcher.setActiveTool('select', mockContext);

    const event: ToolPointerEvent = {
      eventType: 'up',
      button: 0,
      tilePos: { r: 5, c: 5 },
      worldPos: { x: 5.5, y: 0, z: 5.5 },
      rawEvent: { buttons: 0 } as any,
      isShift: false,
      isCtrl: false,
      isAlt: false,
      isSpace: false,
    };

    const handled = dispatcher.dispatchPointerUp(event, mockContext);
    expect(handled).toBe(true);
    expect(pointerUpSpy).toHaveBeenCalledWith(event, mockContext);
  });

  it('dispatches onHover to active tool handler', () => {
    const selectHandler = dispatcher.getHandler('select');
    const onHoverSpy = vi.spyOn(selectHandler!, 'onHover').mockReturnValue(true);

    dispatcher.setActiveTool('select', mockContext);

    const event: ToolPointerEvent = {
      eventType: 'move',
      button: 0,
      tilePos: { r: 1, c: 1 },
      worldPos: { x: 1.5, y: 0, z: 1.5 },
      rawEvent: { buttons: 0 } as any,
      isShift: false,
      isCtrl: false,
      isAlt: false,
      isSpace: false,
    };

    const handled = dispatcher.dispatchHover(event, mockContext);
    expect(handled).toBe(true);
    expect(onHoverSpy).toHaveBeenCalledWith(event, mockContext);
  });
});
