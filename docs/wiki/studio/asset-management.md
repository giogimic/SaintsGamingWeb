# Asset Management & Modular Sprite Compositing

Saints Gaming uses a **Modular Sprite Standard** combined with structured texture atlases and dynamic layer compositing.

---

## 1. Modular Sprite Compositing System

Player characters and humanoid NPCs are assembled dynamically by layering discrete sprite components:

```
┌──────────────────────────────────────────────────────────┐
│                Modular Layer Composition                 │
├──────────────────────────────────────────────────────────┤
│ 6. Weapon / Tool Overlay     (e.g., Rune Shortsword)     │
│ 5. Headgear / Helmet         (e.g., Dragon Full Helm)    │
│ 4. Chestplate / Tunic        (e.g., Steel Platebody)     │
│ 3. Leggings / Greaves        (e.g., Iron Platelegs)      │
│ 2. Hairstyle & Facial Hair   (e.g., Messy Brown)         │
│ 1. Base Body Model           (e.g., Male / Female Pale)  │
└──────────────────────────────────────────────────────────┘
```

The compositing engine renders layers in order to a shared texture buffer or stacks billboard planes in Babylon.js.

---

## 2. Sprite Sheet Frame Layout & Dimensions

Standard overworld characters utilize 4-directional sprite sheets:

| Direction | Row Index | Frame Sequence (Columns 0–2) |
| :--- | :--- | :--- |
| **North (Up)** | Row 0 | Step Left $\to$ Idle $\to$ Step Right |
| **West (Left)** | Row 1 | Step Left $\to$ Idle $\to$ Step Right |
| **South (Down)** | Row 2 | Step Left $\to$ Idle $\to$ Step Right |
| **East (Right)** | Row 3 | Step Left $\to$ Idle $\to$ Step Right |

- **Sheet Dimensions:** $96 \times 128\text{ px}$ (3 frames wide $\times$ 4 rows high, each frame $32 \times 32\text{ px}$), or standard $64 \times 64\text{ px}$ walk cycles ($576 \times 256\text{ px}$).
- **Texture Sampling:** Babylon.js textures use `Texture.NEAREST_SAMPLINGMODE` to preserve sharp pixel art edges without bilinear blur.

---

## 3. Tileset Management & Global Tile IDs (GIDs)

Tilesets are organized as rectangular texture sheets:
- **Atlas Slicing:** A $256 \times 256\text{ px}$ tileset sliced into $16 \times 16\text{ px}$ tiles yields $16 \times 16 = 256$ distinct GID offsets.
- **Global Indexing:** GIDs are calculated linearly:
  $$\text{GID} = \text{TilesetBaseGID} + (r \times \text{AtlasCols} + c)$$
- **Batching:** Babylon.js combines identical GIDs into shared chunk meshes to minimize GPU draw calls.

---

## 4. Custom Sprite Upload & Moderation Workflow

Creators can import custom sprite sheets and tilesets via `/api/assets/upload`:

1. **Upload:** Creator submits image file (PNG / WebP) through the Studio Asset Browser.
2. **Dimension Validation:** The backend verifies power-of-two compatibility or standard frame grid divisions ($32\text{px}$, $64\text{px}$).
3. **Asset Registry:** Metadata is persisted to the `UsableAsset` database table with the uploader's user ID.
4. **Immediate Availability:** The new sprite immediately appears in Studio dropdowns and character compositors.
