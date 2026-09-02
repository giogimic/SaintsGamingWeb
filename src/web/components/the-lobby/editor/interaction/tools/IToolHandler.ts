/**
 * Saints Gaming Studio — Tool Handler Interface
 *
 * Defines the contract for all interactive editing tools in the Babylon viewport.
 */

import type { BabylonEngine } from '@/engine/BabylonEngine';
import type { GameMapData } from '../../../data/maps';
import type { ToolPointerEvent, EditorToolId } from '../types';

export interface ToolExecutionContext {
  engine: BabylonEngine;
  mapData: GameMapData;
  showToast: (msg: string) => void;
}

export interface IToolHandler {
  readonly id: EditorToolId;
  
  onPointerDown?(event: ToolPointerEvent, context: ToolExecutionContext): boolean | void;
  onPointerMove?(event: ToolPointerEvent, context: ToolExecutionContext): boolean | void;
  onPointerUp?(event: ToolPointerEvent, context: ToolExecutionContext): boolean | void;
  onHover?(event: ToolPointerEvent, context: ToolExecutionContext): void;
  onCancel?(context: ToolExecutionContext): void;
}
