export interface ModelWardrobeItem {
  type?: '3D Model' | '3D Sprite' | '2D Sprite' | '2D Box Sprite' | 'Other';
  assetId: string;
  label?: string;
  category?: string;
  isModular?: boolean;
  attachmentMode?: 'RIGID_SOCKET' | 'SKINNED';
  socket?: string;
  defaultVisible?: boolean;
  availableInCharacterCreation?: boolean;
  hidesComponents?: string[];
  [key: string]: unknown;
}

export function parseModelWardrobeItems(value: unknown): ModelWardrobeItem[] {
  let data: any = value;
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const items = Array.isArray(data.modularAttachments)
    ? data.modularAttachments
    : Array.isArray(data.worldModel?.modularAttachments)
      ? data.worldModel.modularAttachments
      : [];
  return items.filter((item: any) => item && typeof item.assetId === 'string' && item.assetId.trim());
}

/** Keep each archetype outfit intact while applying the creator's choices. */
export function applyCharacterCreationWardrobe(
  visualData: string | null | undefined,
  selectedAssetIds: string[],
): string {
  let data: any = {};
  try {
    const parsed = JSON.parse(visualData || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
  } catch {
    data = {};
  }

  const selected = new Set(selectedAssetIds);
  const attachments = parseModelWardrobeItems(data);
  const nextAttachments = attachments.map((item) => {
    if (!item.availableInCharacterCreation) return item;
    return { ...item, defaultVisible: selected.has(item.assetId) };
  });

  if (Array.isArray(data.modularAttachments)) data.modularAttachments = nextAttachments;
  if (data.worldModel && Array.isArray(data.worldModel.modularAttachments)) {
    data.worldModel = { ...data.worldModel, modularAttachments: nextAttachments };
  }
  if (!Array.isArray(data.modularAttachments) && !Array.isArray(data.worldModel?.modularAttachments)) {
    data.modularAttachments = nextAttachments;
  }
  return JSON.stringify(data);
}
