/**
 * Saints Gaming Studio — Select Tool Handler
 *
 * Manages continuous geometric selection (Box, Circle, Ellipse, Lasso, Polygon)
 * and dispatches mathematical shapes to the editor store and Babylon overlay.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';

export class SelectToolHandler implements IToolHandler {
  public readonly id = 'select' as const;

  private isDragging = false;
  private dragPoints: Array<{ x: number; z: number; r: number; c: number }> = [];

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0) return false; // Left-click only
    const store = useEditorStore.getState();
    const { r, c } = event.tilePos;
    const { x, z } = event.worldPos;

    this.isDragging = true;
    this.dragPoints = [{ x, z, r, c }];

    store.setSelectionStart({ r, c });
    store.setSelectionEnd({ r, c });

    const mode = event.isShift ? 'add' : event.isCtrl || event.isAlt ? 'subtract' : 'normal';
    const selShape = store.selectionMode;

    if (selShape === 'circle') {
      context.engine.setContinuousSelectionPreview(
        { type: 'circle', centerX: c + 0.5, centerZ: r + 0.5, radius: 0.5 },
        mode
      );
    } else if (selShape === 'ellipse') {
      context.engine.setContinuousSelectionPreview(
        { type: 'ellipse', centerX: c + 0.5, centerZ: r + 0.5, radiusX: 0.5, radiusZ: 0.5 },
        mode
      );
    } else if (selShape === 'lasso' || selShape === 'polygon') {
      context.engine.setContinuousSelectionPreview(
        { type: 'path', points: [{ x, z }], strokeWidth: 0.1 },
        mode
      );
    } else {
      context.engine.setContinuousSelectionPreview(
        { type: 'rectangle', minX: c, minZ: r, maxX: c + 1, maxZ: r + 1 },
        mode
      );
    }

    return true;
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging) return false;
    const store = useEditorStore.getState();
    if (!store.selectionStart) return false;

    const { r, c } = event.tilePos;
    const { x, z } = event.worldPos;
    const r0 = store.selectionStart.r;
    const c0 = store.selectionStart.c;

    store.setSelectionEnd({ r, c });
    this.dragPoints.push({ x, z, r, c });

    const mode = event.isShift ? 'add' : event.isCtrl || event.isAlt ? 'subtract' : 'normal';
    const selShape = store.selectionMode;

    if (selShape === 'circle') {
      const centerR = (r0 + r) / 2 + 0.5;
      const centerC = (c0 + c) / 2 + 0.5;
      const radius = Math.max(Math.abs(r - r0), Math.abs(c - c0)) / 2 + 0.5;
      context.engine.setContinuousSelectionPreview(
        { type: 'circle', centerX: centerC, centerZ: centerR, radius },
        mode
      );
    } else if (selShape === 'ellipse') {
      const centerR = (r0 + r) / 2 + 0.5;
      const centerC = (c0 + c) / 2 + 0.5;
      const radX = Math.abs(c - c0) / 2 + 0.5;
      const radZ = Math.abs(r - r0) / 2 + 0.5;
      context.engine.setContinuousSelectionPreview(
        { type: 'ellipse', centerX: centerC, centerZ: centerR, radiusX: radX, radiusZ: radZ },
        mode
      );
    } else if (selShape === 'lasso' || selShape === 'polygon') {
      context.engine.setContinuousSelectionPreview(
        { type: 'path', points: this.dragPoints.map((p) => ({ x: p.x, z: p.z })), strokeWidth: 0.1 },
        mode
      );
    } else {
      const minR = Math.min(r0, r);
      const maxR = Math.max(r0, r) + 1;
      const minC = Math.min(c0, c);
      const maxC = Math.max(c0, c) + 1;
      context.engine.setContinuousSelectionPreview(
        { type: 'rectangle', minX: minC, minZ: minR, maxX: maxC, maxZ: maxR },
        mode
      );
    }

    return true;
  }

  public onPointerUp(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging) return false;
    this.isDragging = false;
    const store = useEditorStore.getState();

    if (store.selectionStart && store.selectionEnd) {
      const r0 = store.selectionStart.r;
      const r1 = store.selectionEnd.r;
      const c0 = store.selectionStart.c;
      const c1 = store.selectionEnd.c;
      const mode = event.isShift ? 'add' : event.isCtrl || event.isAlt ? 'subtract' : 'normal';
      const selShape = store.selectionMode;

      if (selShape === 'circle') {
        const centerR = (r0 + r1) / 2 + 0.5;
        const centerC = (c0 + c1) / 2 + 0.5;
        const radius = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) / 2 + 0.5;
        store.setSelectionCircle(centerR, centerC, radius);
      } else if (selShape === 'ellipse') {
        const centerR = (r0 + r1) / 2 + 0.5;
        const centerC = (c0 + c1) / 2 + 0.5;
        const radX = Math.abs(c1 - c0) / 2 + 0.5;
        const radZ = Math.abs(r1 - r0) / 2 + 0.5;
        store.setSelectionEllipse(centerR, centerC, radX, radZ);
      } else if (selShape === 'lasso' || selShape === 'polygon') {
        store.setSelectionPolygon(this.dragPoints);
      } else {
        if (mode === 'normal') {
          store.setSelectionBox(r0, r1, c0, c1);
        } else if (mode === 'add') {
          store.addSelectedBox(r0, r1, c0, c1);
        } else if (mode === 'subtract') {
          store.removeSelectedBox(r0, r1, c0, c1);
        }
      }

      context.engine.clearActionPreview();
      const activeGeom = useEditorStore.getState().activeSelectionGeometry;
      if (activeGeom) {
        context.engine.setContinuousSelectionPreview(activeGeom, mode);
      } else {
        const latestCells = useEditorStore.getState().selectedCells;
        if (latestCells && Object.keys(latestCells).length > 0) {
          context.engine.setMultiSelectionPreview(latestCells);
        } else {
          context.engine.clearSelectionPreview();
        }
      }
    }

    this.dragPoints = [];
    return true;
  }

  public onHover(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    // When not dragging, hover can highlight the tile or vertex under cursor
    return true;
  }

  public onCancel(context: ToolExecutionContext): void {
    this.isDragging = false;
    this.dragPoints = [];
    context.engine.clearActionPreview?.();
  }
}
