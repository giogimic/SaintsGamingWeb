import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '../editor-store';
import { WorldModelSelector } from './WorldModelSelector';

afterEach(() => {
  useEditorStore.getState().closeAssetPicker();
});

describe('WorldModelSelector 3D asset selection', () => {
  it('keeps the stable asset id, source URL, rig, and animation metadata from the selected creature', () => {
    const onChange = vi.fn();
    const presentation = {
      animationProfileId: 'quaternius_native',
      animations: { mapped: { idle: { sourceKind: 'embedded', clip: 'Idle' } } },
      rigAnalysis: { family: 'HUMANOID_BIPED', totalBones: 54 },
      categorizedAnimations: [{ clipName: 'Idle', suggestedSlots: ['idle'] }],
      skeletonRequirements: { family: 'HUMANOID_BIPED', essentialBones: ['Hips'] },
    };
    const asset = {
      id: 'quat-imp',
      type: 'CREATURE',
      source: '/models/quaternius/imp.glb',
      cdnUrl: '/models/quaternius/imp.glb',
      metadata: { presentation },
      presentation,
    };

    render(
      <WorldModelSelector
        value={{ type: '3D Model', assetId: '', scale: 1 }}
        onChange={onChange}
        assetPickerFilterType="CREATURE"
        assetPickerCategoryFilter="CREATURES"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select 3d model asset/i }));
    const picker = useEditorStore.getState().activeAssetPicker;
    expect(picker?.filterType).toBe('CREATURE');
    expect(picker?.categoryFilter).toBe('CREATURES');

    act(() => picker?.onSelect(asset.source, asset));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'quat-imp',
        modelUrl: '/models/quaternius/imp.glb',
        source: '/models/quaternius/imp.glb',
        animationProfileId: 'quaternius_native',
        animations: presentation.animations,
        rigAnalysis: presentation.rigAnalysis,
        categorizedAnimations: presentation.categorizedAnimations,
        skeletonRequirements: presentation.skeletonRequirements,
      }),
    );
  });
});
