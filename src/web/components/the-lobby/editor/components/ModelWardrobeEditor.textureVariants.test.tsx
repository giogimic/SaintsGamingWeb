import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModelWardrobeEditor } from './ModelWardrobeEditor';

describe('ModelWardrobeEditor Quaternius texture variants', () => {
  it('persists an alternate Peasant base-color selection on the wardrobe item', () => {
    const onChange = vi.fn();
    const item = {
      assetId: 'quat-male_peasant_body',
      label: 'Male Peasant Body',
      category: 'clothing',
      variantFamily: 'peasant',
      defaultVisible: true,
    };

    render(
      <ModelWardrobeEditor
        modelAssetId=""
        value={[item]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Colors for Male Peasant Body'), {
      target: { value: '/models/quaternius/textures/T_Peasant_2_BaseColor.png' },
    });

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        assetId: item.assetId,
        textureVariantUrl: '/models/quaternius/textures/T_Peasant_2_BaseColor.png',
      }),
    ]);

    fireEvent.change(screen.getByLabelText('Colors for Male Peasant Body'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.not.objectContaining({ textureVariantUrl: expect.anything() }),
    ]);
  });

  it('offers the Ranger color set 3 on Ranger pieces', () => {
    const onChange = vi.fn();
    render(
      <ModelWardrobeEditor
        modelAssetId=""
        value={[
          {
            assetId: 'quat-female_ranger_body',
            label: 'Female Ranger Body',
            category: 'clothing',
            variantFamily: 'ranger',
            defaultVisible: true,
          },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Colors for Female Ranger Body'), {
      target: { value: '/models/quaternius/textures/T_Ranger_3_BaseColor.png' },
    });

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        textureVariantUrl: '/models/quaternius/textures/T_Ranger_3_BaseColor.png',
      }),
    ]);
  });

  it('does not offer a Quaternius color selector for unrelated wardrobe items', () => {
    render(
      <ModelWardrobeEditor
        modelAssetId=""
        value={[
          {
            assetId: 'custom-leather-coat',
            label: 'Custom Leather Coat',
            category: 'clothing',
            defaultVisible: true,
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Colors for Custom Leather Coat')).not.toBeInTheDocument();
  });
});
