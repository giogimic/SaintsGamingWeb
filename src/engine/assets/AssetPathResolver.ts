export class AssetPathResolver {
  private static ROOTS = {
    // Classic walk sheets live under /npc (there is no /game-assets/sprites tree).
    sprites: '/game-assets/npc',
    monsters: '/game-assets/monster',
    tilesets: '/game-assets/tilesets',
    items: '/game-assets/items',
    ui: '/game-assets/ui',
    audio: '/game-assets/audio',
    atlases: '/game-assets/atlases',
  };

  /**
   * Resolves canonical web-accessible file path for asset type
   */
  static resolve(type: keyof typeof AssetPathResolver.ROOTS, filename: string): string {
    const cleanFilename = filename.replace(/^[\/\\]+/, '');
    return `${AssetPathResolver.ROOTS[type]}/${cleanFilename}`;
  }

  /**
   * Fallback resolver checking creature-assets path if needed
   */
  static resolveWithFallback(type: keyof typeof AssetPathResolver.ROOTS, filename: string): string[] {
    const canonical = AssetPathResolver.resolve(type, filename);
    const legacyMap: Record<string, string> = {
      sprites: `/game-assets/npc/${filename}`,
      monsters: `/game-assets/monster/${filename}`,
      tilesets: `/game-assets/tilesets/${filename}`,
      items: `/game-assets/items/${filename}`,
      ui: `/game-assets/ui/${filename}`,
      audio: `/game-assets/audio/${filename}`,
      atlases: `/game-assets/atlases/${filename}`,
    };
    return [canonical, legacyMap[type] || canonical];
  }
}
