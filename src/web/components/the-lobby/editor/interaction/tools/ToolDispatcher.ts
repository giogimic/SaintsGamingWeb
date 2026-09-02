/**
 * Saints Gaming Studio — Tool Dispatcher
 *
 * Routes pointer events from the viewport canvas to the active tool handler.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import { SelectToolHandler } from './SelectToolHandler';
import { BrushToolHandler } from './BrushToolHandler';
import { FillToolHandler } from './FillToolHandler';
import { EraserToolHandler } from './EraserToolHandler';
import { EyedropperToolHandler } from './EyedropperToolHandler';
import { PrefabToolHandler } from './PrefabToolHandler';
import { PasteToolHandler } from './PasteToolHandler';
import type { ToolPointerEvent, EditorToolId } from '../types';

export class ToolDispatcher {
  private handlers = new Map<EditorToolId, IToolHandler>();
  private currentToolId: EditorToolId = 'brush';

  constructor() {
    this.registerHandler(new SelectToolHandler());
    this.registerHandler(new BrushToolHandler());
    this.registerHandler(new FillToolHandler());
    this.registerHandler(new EraserToolHandler());
    this.registerHandler(new EyedropperToolHandler());
    this.registerHandler(new PrefabToolHandler());
    this.registerHandler(new PasteToolHandler());
  }

  public registerHandler(handler: IToolHandler): void {
    this.handlers.set(handler.id, handler);
  }

  public setActiveTool(toolId: EditorToolId, context?: ToolExecutionContext): void {
    if (this.currentToolId !== toolId) {
      if (context) {
        const oldHandler = this.handlers.get(this.currentToolId);
        oldHandler?.onCancel?.(context);
      }
      this.currentToolId = toolId;
    }
  }

  public getActiveToolHandler(): IToolHandler | undefined {
    return this.handlers.get(this.currentToolId);
  }

  public dispatchPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    const handler = this.handlers.get(this.currentToolId);
    if (handler?.onPointerDown) {
      return Boolean(handler.onPointerDown(event, context));
    }
    return false;
  }

  public dispatchPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    const handler = this.handlers.get(this.currentToolId);
    if (handler?.onPointerMove) {
      return Boolean(handler.onPointerMove(event, context));
    }
    return false;
  }

  public dispatchPointerUp(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    const handler = this.handlers.get(this.currentToolId);
    if (handler?.onPointerUp) {
      return Boolean(handler.onPointerUp(event, context));
    }
    return false;
  }
}
