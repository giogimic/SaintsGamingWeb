export interface QuaterniusOutfitTextureVariant {
  id: string;
  label: string;
  textureVariantUrl?: string;
}

const VERIFIED_OUTFIT_TEXTURE_VARIANTS: Record<string, QuaterniusOutfitTextureVariant[]> = {
  peasant: [
    { id: 'default', label: 'Original colors' },
    {
      id: 'peasant-2',
      label: 'Color variation 2',
      textureVariantUrl: '/models/quaternius/textures/T_Peasant_2_BaseColor.png',
    },
  ],
  ranger: [
    { id: 'default', label: 'Original colors' },
    {
      id: 'ranger-3',
      label: 'Color variation 3',
      textureVariantUrl: '/models/quaternius/textures/T_Ranger_3_BaseColor.png',
    },
  ],
};

/** Returns color maps verified in the user's supplied Standard archive. */
export function getQuaterniusOutfitTextureVariants(
  family?: string | null,
): QuaterniusOutfitTextureVariant[] {
  const key = family?.trim().toLowerCase();
  return key ? (VERIFIED_OUTFIT_TEXTURE_VARIANTS[key] || []).map((variant) => ({ ...variant })) : [];
}
