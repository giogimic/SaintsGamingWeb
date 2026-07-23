/**
 * WebGL Game Renderer using PixiJS
 * 
 * This class handles all WebGL rendering for the game, including:
 * - Tile map rendering with sprite batching
 * - Entity rendering (NPCs, players, monsters)
 * - Camera system for viewport management
 * - Texture atlas loading and management
 */

import { Application, Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { TILE_SIZE } from '@/components/the-lobby/constants';

interface AtlasFrame {
  filename: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AtlasData {
  filename: string;
  width: number;
  height: number;
  frames: AtlasFrame[];
}

interface TileInfo {
  tileId: number;
  tilesetName: string;
  tilesetPath: string;
  srcX: number;
  srcY: number;
  width: number;
  height: number;
  isAnimated: boolean;
  animationFrames?: Array<{ tileId: number; duration: number }>;
}

export class GameRenderer {
  private app: Application;
  private worldContainer: Container;
  private entityContainer: Container;
  private uiContainer: Container;
  
  private atlases: Map<string, Texture> = new Map();
  private atlasData: Map<string, AtlasData> = new Map();
  private tileTextures: Map<number, Texture> = new Map();
  
  private camera = {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  };
  
  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application({
      view: canvas,
      width: this.camera.width,
      height: this.camera.height,
      resolution: window.devicePixelRatio || 1,
      antialias: false, // Pixel art should be crisp
      backgroundColor: 0x000000,
    });
    
    // Create layer containers
    this.worldContainer = new Container();
    this.entityContainer = new Container();
    this.uiContainer = new Container();
    
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.uiContainer);
    
    // Disable image smoothing for pixel-perfect rendering
    this.app.renderer.background.color = 0x000000;
  }
  
  /**
   * Load texture atlases from JSON metadata
   */
  async loadAtlases(): Promise<void> {
    const atlasNames = [
      'tilesets_outdoor',
      'tilesets_indoor',
      'tilesets_buildings',
      'tilesets_cave',
      'tilesets_terrain',
      'npc_atlas',
      'item_atlas',
    ];
    
    for (const name of atlasNames) {
      try {
        // Load atlas metadata
        const metaResponse = await fetch(`/tuxemon-assets/atlases/${name}.json`);
        const metaData: AtlasData = await metaResponse.json();
        this.atlasData.set(name, metaData);
        
        // Load atlas texture
        const texture = await Texture.from(`/tuxemon-assets/atlases/${name}.png`);
        this.atlases.set(name, texture);
        
        console.log(`✓ Loaded atlas: ${name}`);
      } catch (error) {
        console.error(`✗ Failed to load atlas: ${name}`, error);
      }
    }
  }
  
  /**
   * Load tile registry from API
   */
  async loadTileRegistry(): Promise<Map<number, TileInfo>> {
    const tileRegistry = new Map<number, TileInfo>();
    
    try {
      const response = await fetch('/api/tile-registry');
      const tiles: TileInfo[] = await response.json();
      
      for (const tile of tiles) {
        tileRegistry.set(tile.tileId, tile);
      }
      
      console.log(`✓ Loaded ${tileRegistry.size} tiles from registry`);
    } catch (error) {
      console.error('✗ Failed to load tile registry', error);
    }
    
    return tileRegistry;
  }
  
  /**
   * Get texture for a specific tile from atlas
   */
  getTileTexture(tileInfo: TileInfo): Texture | null {
    // Check cache
    if (this.tileTextures.has(tileInfo.tileId)) {
      return this.tileTextures.get(tileInfo.tileId)!;
    }
    
    // Find which atlas contains this tileset
    for (const [atlasName, atlasData] of this.atlasData.entries()) {
      const frame = atlasData.frames.find(f => f.filename === tileInfo.tilesetPath);
      
      if (frame) {
        const atlasTexture = this.atlases.get(atlasName);
        if (!atlasTexture) continue;
        
        // Create texture from atlas region
        const texture = new Texture(
          atlasTexture.baseTexture,
          new Rectangle(
            frame.x + tileInfo.srcX,
            frame.y + tileInfo.srcY,
            tileInfo.width,
            tileInfo.height
          )
        );
        
        this.tileTextures.set(tileInfo.tileId, texture);
        return texture;
      }
    }
    
    return null;
  }
  
  /**
   * Render tile map with WebGL sprite batching
   */
  renderTileMap(
    mapData: { grid: number[][]; width: number; height: number },
    tileRegistry: Map<number, TileInfo>
  ): void {
    // Clear existing tiles
    this.worldContainer.removeChildren();
    
    // Calculate viewport bounds
    const startCol = Math.max(0, Math.floor(this.camera.x / TILE_SIZE));
    const endCol = Math.min(
      mapData.width,
      Math.ceil((this.camera.x + this.camera.width) / TILE_SIZE)
    );
    const startRow = Math.max(0, Math.floor(this.camera.y / TILE_SIZE));
    const endRow = Math.min(
      mapData.height,
      Math.ceil((this.camera.y + this.camera.height) / TILE_SIZE)
    );
    
    // Render visible tiles only (viewport culling)
    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tileId = mapData.grid[y][x];
        const tileInfo = tileRegistry.get(tileId);
        
        if (!tileInfo) continue;
        
        const texture = this.getTileTexture(tileInfo);
        if (!texture) continue;
        
        const sprite = new Sprite(texture);
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
        
        // Handle animated tiles
        if (tileInfo.isAnimated && tileInfo.animationFrames) {
          // TODO: Implement animation system
          // For now, just render the base frame
        }
        
        this.worldContainer.addChild(sprite);
      }
    }
    
    console.log(`✓ Rendered ${this.worldContainer.children.length} tiles`);
  }
  
  /**
   * Render entities (NPCs, players, monsters)
   */
  renderEntities(
    entities: Array<{
      id: string;
      type: 'NPC' | 'PLAYER' | 'MONSTER';
      spriteKey: string;
      position: { x: number; y: number };
    }>
  ): void {
    // Clear existing entities
    this.entityContainer.removeChildren();
    
    for (const entity of entities) {
      // Find NPC texture from atlas
      const npcAtlas = this.atlasData.get('npc_atlas');
      if (!npcAtlas) continue;
      
      const frame = npcAtlas.frames.find(f => f.filename === `${entity.spriteKey}.png`);
      if (!frame) continue;
      
      const atlasTexture = this.atlases.get('npc_atlas');
      if (!atlasTexture) continue;
      
      const texture = new Texture(
        atlasTexture.baseTexture,
        new Rectangle(frame.x, frame.y, frame.width, frame.height)
      );
      
      const sprite = new Sprite(texture);
      sprite.x = entity.position.x * TILE_SIZE;
      sprite.y = entity.position.y * TILE_SIZE;
      
      this.entityContainer.addChild(sprite);
    }
    
    console.log(`✓ Rendered ${this.entityContainer.children.length} entities`);
  }
  
  /**
   * Update camera position
   */
  updateCamera(targetX: number, targetY: number, mapWidth: number, mapHeight: number): void {
    // Center camera on target
    this.camera.x = targetX * TILE_SIZE - this.camera.width / 2;
    this.camera.y = targetY * TILE_SIZE - this.camera.height / 2;
    
    // Clamp to map bounds
    this.camera.x = Math.max(0, Math.min(this.camera.x, mapWidth * TILE_SIZE - this.camera.width));
    this.camera.y = Math.max(0, Math.min(this.camera.y, mapHeight * TILE_SIZE - this.camera.height));
    
    // Apply camera transform to containers
    this.worldContainer.x = -this.camera.x;
    this.worldContainer.y = -this.camera.y;
    this.entityContainer.x = -this.camera.x;
    this.entityContainer.y = -this.camera.y;
  }
  
  /**
   * Start the render loop
   */
  startRenderLoop(updateCallback: () => void): void {
    this.app.ticker.add(() => {
      updateCallback();
    });
  }
  
  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.camera.width = width;
    this.camera.height = height;
    this.app.renderer.resize(width, height);
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.app.destroy();
    this.atlases.clear();
    this.atlasData.clear();
    this.tileTextures.clear();
  }
}