export interface SpriteFrame {
  sheetPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction?: 'down' | 'up' | 'left' | 'right';
  frameIndex?: number; // 0=standing, 1=left foot, 2=right foot
  isAnimated: boolean;
  frameCount?: number;
  frameRate?: number;
}

export interface TileFrame {
  tileId: number;
  localId: number;
  sheetPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SpriteSheetSlicer {
  /**
   * Slice NPC sprite sheets (48x128 pixels: 3 columns x 4 rows of 16x32 frames)
   * Row 0: down (3 walk frames)
   * Row 1: up (3 walk frames)
   * Row 2: left (3 walk frames)
   * Row 3: right (3 walk frames)
   */
  static sliceNpcSheet(sheetPath: string): SpriteFrame[] {
    const FRAME_W = 16;
    const FRAME_H = 32;
    const COLS = 3;
    const ROWS = 4;
    const DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
    const frames: SpriteFrame[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        frames.push({
          sheetPath,
          x: col * FRAME_W,
          y: row * FRAME_H,
          width: FRAME_W,
          height: FRAME_H,
          direction: DIRECTIONS[row],
          frameIndex: col,
          isAnimated: true,
          frameCount: 3,
          frameRate: 8,
        });
      }
    }
    return frames;
  }

  /**
   * Slice Monster Overworld sheets (48x64 or 48x48: 3 columns x 4 rows of 16x16 or 16x24)
   */
  static sliceMonsterOverworldSheet(sheetPath: string, frameWidth = 16, frameHeight = 16): SpriteFrame[] {
    const COLS = 3;
    const ROWS = 4;
    const DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
    const frames: SpriteFrame[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        frames.push({
          sheetPath,
          x: col * frameWidth,
          y: row * frameHeight,
          width: frameWidth,
          height: frameHeight,
          direction: DIRECTIONS[row],
          frameIndex: col,
          isAnimated: true,
          frameCount: 3,
          frameRate: 8,
        });
      }
    }
    return frames;
  }

  /**
   * Single frame monster sprite (front/back battle sprite)
   */
  static sliceSingleFrame(sheetPath: string, width = 64, height = 64): SpriteFrame {
    return {
      sheetPath,
      x: 0,
      y: 0,
      width,
      height,
      isAnimated: false,
      frameCount: 1,
    };
  }

  /**
   * Slice tileset sheet into grid cells
   */
  static sliceTileset(
    sheetPath: string,
    columns: number,
    rows: number,
    tileWidth = 16,
    tileHeight = 16,
    firstgid = 1
  ): TileFrame[] {
    const tiles: TileFrame[] = [];
    const totalTiles = columns * rows;

    for (let i = 0; i < totalTiles; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      tiles.push({
        tileId: firstgid + i,
        localId: i,
        sheetPath,
        x: col * tileWidth,
        y: row * tileHeight,
        width: tileWidth,
        height: tileHeight,
      });
    }
    return tiles;
  }

  /**
   * Extract intelligent tags from filename and path
   */
  static deriveTagsFromFilename(filename: string, categoryPath: string): string[] {
    const tags = new Set<string>(['creature']);
    const cleanName = filename.toLowerCase().replace(/\.[^/.]+$/, '');
    const pathParts = categoryPath.toLowerCase().split(/[/\\]/);

    pathParts.forEach((part) => {
      if (part && !['public', 'game-assets', 'creature-assets'].includes(part)) {
        tags.add(part);
      }
    });

    if (/hero|heroine|adventurer|player/i.test(cleanName)) tags.add('hero');
    if (/warrior|brute|dragonrider|firefighter|boss|ceo/i.test(cleanName)) tags.add('combat');
    if (/barmaid|florist|fisher|beachcomber|fashionista/i.test(cleanName)) tags.add('civilian');
    if (/female|heroine|catgirl|christie|florist/i.test(cleanName)) tags.add('female');
    if (/male|warrior|brute|adventurer|cooldude/i.test(cleanName)) tags.add('male');
    if (/_black|_blonde|_brown|_fiery|_green|_red|_blue|_violet|_gray/i.test(cleanName)) {
      const match = cleanName.match(/_([a-z]+)$/i);
      if (match) tags.add(match[1]);
    }

    return Array.from(tags);
  }
}
