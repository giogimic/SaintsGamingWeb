'use client';

import { useRef } from 'react';
import { useEditorStore } from '@/web/components/the-lobby/editor/editor-store';
import { definitionOpValue } from '@/shared/game/definitionOps';

/**
 * Blur-snapshot definition undo for catalog forms (bible 30).
 * Mirrors QuestEditorPanel v1 — top-of-stack must match resourceKey.
 */
export function useDefinitionFormHistory<T>(resourceKey: string) {
  const definitionOpStack = useEditorStore((s) => s.definitionOpStack);
  const recordDefinitionChange = useEditorStore((s) => s.recordDefinitionChange);
  const undoDefinitionChange = useEditorStore((s) => s.undoDefinitionChange);
  const redoDefinitionChange = useEditorStore((s) => s.redoDefinitionChange);
  const clearDefinitionStackFor = useEditorStore((s) => s.clearDefinitionStackFor);

  const formRef = useRef<T | null>(null);
  const baselineRef = useRef<T | null>(null);

  const topUndo = definitionOpStack.undo[definitionOpStack.undo.length - 1];
  const topRedo = definitionOpStack.redo[definitionOpStack.redo.length - 1];
  const canUndoDefinition = topUndo?.resourceKey === resourceKey;
  const canRedoDefinition = topRedo?.resourceKey === resourceKey;

  const syncFormRef = (value: T) => {
    formRef.current = value;
  };

  const onFieldFocus = () => {
    if (formRef.current == null) return;
    baselineRef.current = structuredClone(formRef.current);
  };

  const onFieldBlur = () => {
    const baseline = baselineRef.current;
    baselineRef.current = null;
    if (!baseline || formRef.current == null) return;
    if (JSON.stringify(baseline) === JSON.stringify(formRef.current)) return;
    recordDefinitionChange(resourceKey, baseline, formRef.current);
  };

  const commitStructural = (serapht: T) => {
    if (formRef.current != null) {
      recordDefinitionChange(resourceKey, formRef.current, serapht);
    }
    formRef.current = serapht;
  };

  const applyHistory = (
    direction: 'undo' | 'redo',
    apply: (value: T) => void
  ) => {
    const top =
      direction === 'undo'
        ? definitionOpStack.undo[definitionOpStack.undo.length - 1]
        : definitionOpStack.redo[definitionOpStack.redo.length - 1];
    if (!top || top.resourceKey !== resourceKey) return;
    const op =
      direction === 'undo' ? undoDefinitionChange() : redoDefinitionChange();
    if (!op) return;
    const value = definitionOpValue(op, direction);
    apply(value as T);
    formRef.current = value as T;
  };

  return {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
    clearDefinitionStackFor,
  };
}
