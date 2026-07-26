export class AssetPathResolver {
  private static ROOTS = {
    sprites: '/game-assets/sprites',
    monsters: '/game-assets/monsters',
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
   * Fallback resolver checking tuxemon-assets path if needed
   */
  static resolveWithFallback(type: keyof typeof AssetPathResolver.ROOTS, filename: string): string[] {
    const canonical = AssetPathResolver.resolve(type, filename);
    const legacyMap: Record<string, string> = {
      sprites: `/tuxemon-assets/npc/${filename}`,
      monsters: `/tuxemon-assets/monster/${filename}`,
      tilesets: `/tuxemon-assets/tilesets/${filename}`,
      items: `/tuxemon-assets/items/${filename}`,
      ui: `/tuxemon-assets/ui/${filename}`,
      audio: `/tuxemon-assets/audio/${filename}`,
      atlases: `/tuxemon-assets/atlases/${filename}`,
    };
    return [canonical, legacyMap[type] || canonical];
  }
}
