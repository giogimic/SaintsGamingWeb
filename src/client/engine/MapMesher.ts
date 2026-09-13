/**
 * Map Mesher — Builds flat tile ground and 3D voxel chunks for the active map.
 *
 * Ported from the monolith's BabylonEngine tile loading and VoxelChunkMesher
 * usage. Subscribes to `useWorldStore.activeMapData` and automatically
 * rebuilds the scene geometry when the map document changes.
 *
 * For TILE maps:  renders a greedy-batched ground plane with tileset UVs.
 * For VOXEL/FRACTAL maps: delegates chunk meshing to VoxelChunkMesher.
 */
import * as BABYLON from '@babylonjs/core';
import { useWorldStore } from '../state/useWorldStore';
import { VoxelChunkMesher } from '@/engine/voxel/VoxelChunkMesher';
import { VoxelChunk, CHUNK_TOTAL_CELLS } from '@/shared/game/voxel/VoxelChunk';
import { VoxelWorld, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import {
  resolveTilesetTextureUrl,
  tilesetUvForGid,
  stripTiledGidFlags,
  type TilesetUvInput,
} from '@/shared/game/tileBatchHelpers';

export class MapMesher {
  private scene: BABYLON.Scene | null = null;
  private tileRoot: BABYLON.TransformNode | null = null;
  private voxelRoot: BABYLON.TransformNode | null = null;
  private tileMeshes: Map<string, BABYLON.Mesh> = new Map();
  private voxelChunkMesher: VoxelChunkMesher | null = null;
  private voxelWorld: VoxelWorld | null = null;
  private unsubscribe: (() => void) | null = null;

  public initialize(scene: BABYLON.Scene) {
    this.scene = scene;
    this.tileRoot = new BABYLON.TransformNode('tileRoot', scene);
    this.voxelRoot = new BABYLON.TransformNode('voxelRoot', scene);
    this.voxelChunkMesher = new VoxelChunkMesher(scene);
    this.unsubscribe = useWorldStore.subscribe(
      (state: any) => state.activeMapData,
      (mapData: any) => this.buildMap(mapData)
    );
    this.onStudioCellsChanged = this.onStudioCellsChanged.bind(this);
    this.onStudioVoxelsChanged = this.onStudioVoxelsChanged.bind(this);
    window.addEventListener('studio:map-cells-changed', this.onStudioCellsChanged);
    window.addEventListener('studio_voxels_changed', this.onStudioVoxelsChanged);
    const initialData = useWorldStore.getState().activeMapData;
    if (initialData) this.buildMap(initialData);
  }

  private buildMap(mapData: any) {
    if (!this.scene || !this.tileRoot || !mapData) return;
    this.clearMap();
    const mapType: string = (mapData.mapType || 'TILE').toUpperCase();
    if (mapType === 'VOXEL' || mapType === 'FRACTAL' || mapType === 'HYBRID') this.buildVoxelMap(mapData);
    else this.buildTileMap(mapData);
  }

  private buildTileMap(mapData: any) {
    if (!this.scene || !this.tileRoot) return;
    const grid: number[][] = mapData.grid || mapData.tiles;
    if (!grid || grid.length === 0) { this.buildFallbackGround(mapData); return; }
    const mapHeight = grid.length;
    const mapWidth = grid[0]?.length || 0;
    const tileSize = mapData.tileSize || mapData.blockSizePx || 1;
    const tilesets: any[] = mapData.tilesets || [];
    const ground = BABYLON.MeshBuilder.CreateGround('tileGround', { width: mapWidth * tileSize, height: mapHeight * tileSize }, this.scene);
    ground.parent = this.tileRoot;
    ground.position.x = (mapWidth * tileSize) / 2 - tileSize / 2;
    ground.position.z = -(mapHeight * tileSize) / 2 + tileSize / 2;
    ground.position.y = -0.05;
    const mat = new BABYLON.StandardMaterial('tileGroundMat', this.scene);
    if (tilesets.length > 0 && tilesets[0].imageSource) {
      const textureUrl = resolveTilesetTextureUrl(tilesets[0].imageSource);
      if (textureUrl) { const tex = new BABYLON.Texture(textureUrl, this.scene, true, false, BABYLON.Texture.NEAREST_SAMPLINGMODE); tex.hasAlpha = true; mat.diffuseTexture = tex; }
    }
    if (!mat.diffuseTexture) mat.diffuseColor = new BABYLON.Color3(0.29, 0.52, 0.02);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    ground.material = mat;
    this.tileMeshes.set('tileGround', ground);
    const tileLayers = mapData.tileLayers || [];
    for (let li = 0; li < tileLayers.length; li++) {
      const layer = tileLayers[li];
      if (!layer.grid || layer.grid.length === 0) continue;
      this.buildTileLayer(layer, li, mapWidth, mapHeight, tileSize, tilesets);
    }
    console.log(`[MapMesher] Built tile map: ${mapWidth}x${mapHeight}, ${tileLayers.length} layers`);
  }

  private buildTileLayer(layer: { name: string; grid: number[][] }, layerIndex: number, mapWidth: number, mapHeight: number, tileSize: number, tilesets: any[]) {
    if (!this.scene || !this.tileRoot) return;
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
    let vertCount = 0;
    const yOffset = 0.01 * (layerIndex + 1);
    for (let row = 0; row < layer.grid.length; row++) for (let col = 0; col < (layer.grid[row]?.length || 0); col++) {
      const rawGid = layer.grid[row][col]; if (!rawGid || rawGid === 0) continue;
      const gid = stripTiledGidFlags(rawGid); if (gid === 0) continue;
      const wx = col * tileSize, wz = -row * tileSize, ss = tileSize;
      positions.push(wx, yOffset, wz, wx + ss, yOffset, wz, wx + ss, yOffset, wz - ss, wx, yOffset, wz - ss);
      normals.push(0,1,0,0,1,0,0,1,0,0,1,0);
      let matchedTs: TilesetUvInput | null = null;
      for (let ti = tilesets.length - 1; ti >= 0; ti--) if (tilesets[ti].firstgid <= gid) { matchedTs = tilesets[ti] as TilesetUvInput; break; }
      if (matchedTs) { const uv = tilesetUvForGid(gid, matchedTs); uvs.push(uv[0],uv[7],uv[2],uv[7],uv[2],uv[1],uv[0],uv[1]); }
      else uvs.push(0,0,1,0,1,1,0,1);
      const base=vertCount; indices.push(base,base+1,base+2,base,base+2,base+3); vertCount+=4;
    }
    if (!positions.length) return;
    const meshName=`tileLayer_${layerIndex}_${layer.name}`;
    const mesh=new BABYLON.Mesh(meshName,this.scene); mesh.parent=this.tileRoot;
    const vertexData=new BABYLON.VertexData(); vertexData.positions=positions; vertexData.normals=normals; vertexData.uvs=uvs; vertexData.indices=indices; vertexData.applyToMesh(mesh);
    const mat=new BABYLON.StandardMaterial(`${meshName}_mat`,this.scene);
    if (tilesets.length>0 && tilesets[0].imageSource) { const textureUrl=resolveTilesetTextureUrl(tilesets[0].imageSource); if(textureUrl){const tex=new BABYLON.Texture(textureUrl,this.scene,true,false,BABYLON.Texture.NEAREST_SAMPLINGMODE);tex.hasAlpha=true;mat.diffuseTexture=tex;} }
    mat.specularColor=new BABYLON.Color3(0,0,0); mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHATEST; mat.alphaCutOff=0.5; mesh.material=mat; this.tileMeshes.set(meshName,mesh);
  }

  private buildVoxelMap(mapData: any) {
    if (!this.scene || !this.voxelChunkMesher) return;
    console.log(`[MapMesher] buildVoxelMap called for ${mapData.id}. Awaiting WorldStreamer.`);
  }

  public startVoxelStreaming() {
    this.clearMap();
    this.voxelWorld = new VoxelWorld({ id: 'streamed' });
    console.log(`[MapMesher] Started voxel streaming mode. Waiting for chunks...`);
  }

  public loadStreamedChunk(chunkData: { cx: number; cy: number; cz: number; low: Uint32Array; high: Uint32Array }) {
    if (!this.voxelWorld || !this.voxelChunkMesher || !this.voxelRoot) return;
    const chunk = this.voxelWorld.getChunk(chunkData.cx, chunkData.cz, chunkData.cy, true);
    if (!chunk) return;
    const low = chunkData.low.length === CHUNK_TOTAL_CELLS * 2 ? chunkData.low.subarray(0, CHUNK_TOTAL_CELLS) : chunkData.low;
    const high = chunkData.high.length === CHUNK_TOTAL_CELLS * 2 ? chunkData.high.subarray(CHUNK_TOTAL_CELLS) : chunkData.high;
    if (low.length !== CHUNK_TOTAL_CELLS || high.length !== CHUNK_TOTAL_CELLS) {
      console.warn('[MapMesher] Ignoring malformed streamed chunk payload', { cx: chunkData.cx, cy: chunkData.cy, cz: chunkData.cz, lowLength: low.length, highLength: high.length });
      return;
    }
    chunk.dataLow.set(low); chunk.dataHigh.set(high); chunk.isDirty = true;
    if (!chunk.isEmpty()) { const result=this.voxelChunkMesher.meshChunk(this.voxelWorld,chunk); if(result?.mesh) result.mesh.parent=this.voxelRoot; }
  }

  public loadEncodedChunk(bytes: Uint8Array | ArrayBuffer | number[]): void {
    try {
      const data=bytes instanceof Uint8Array ? bytes : bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes);
      const chunk=VoxelChunk.deserializePaletteRLEBinary(data);
      this.loadStreamedChunk({cx:chunk.cx,cy:chunk.cy,cz:chunk.cz,low:chunk.dataLow,high:chunk.dataHigh});
    } catch(error) { console.error('[MapMesher] Failed to decode streamed voxel chunk:',error); }
  }

  public applyVoxelEdit(cx: number, cy: number, cz: number) {
    if (!this.voxelWorld || !this.voxelChunkMesher || !this.voxelRoot) return;
    const chunk=this.voxelWorld.getChunk(cx,cz,cy); if(!chunk) return;
    chunk.isDirty=true; const result=this.voxelChunkMesher.meshChunk(this.voxelWorld,chunk); if(result?.mesh) result.mesh.parent=this.voxelRoot;
  }

  private buildFallbackGround(mapData: any) {
    if (!this.scene || !this.tileRoot) return;
    const w=mapData.width||30,h=mapData.height||30;
    const ground=BABYLON.MeshBuilder.CreateGround('fallbackGround',{width:w,height:h},this.scene); ground.parent=this.tileRoot; ground.position.y=-0.1;
    const mat=new BABYLON.StandardMaterial('fallbackGroundMat',this.scene); mat.diffuseColor=new BABYLON.Color3(0.1,0.3,0.1); mat.specularColor=new BABYLON.Color3(0,0,0); ground.material=mat; this.tileMeshes.set('fallbackGround',ground);
    console.log(`[MapMesher] Built fallback ground: ${w}x${h}`);
  }

  private onStudioCellsChanged(e: Event) {
    const detail=(e as CustomEvent).detail; if(!detail?.cells?.length)return;
    const mapData=useWorldStore.getState().activeMapData; if(mapData)this.buildTileMap(mapData);
  }
  private onStudioVoxelsChanged(e: Event) {
    const detail=(e as CustomEvent).detail; if(!detail?.voxels?.length)return;
    for(const v of detail.voxels)this.applyVoxelEdit(v.wx,v.wy,v.wz);
  }

  private clearMap() {
    this.tileMeshes.forEach(mesh=>mesh.dispose()); this.tileMeshes.clear();
    if(this.tileRoot)this.tileRoot.getChildren().forEach(c=>c.dispose());
    if(this.voxelRoot)this.voxelRoot.getChildren().forEach(c=>c.dispose());
    this.voxelWorld=null;
  }
  public dispose() {
    this.unsubscribe?.(); window.removeEventListener('studio:map-cells-changed',this.onStudioCellsChanged); window.removeEventListener('studio_voxels_changed',this.onStudioVoxelsChanged);
    this.clearMap(); this.tileRoot?.dispose(); this.voxelRoot?.dispose(); this.voxelChunkMesher=null; this.scene=null;
  }
  public getVoxelWorld(): VoxelWorld | null { return this.voxelWorld; }
}
export const mapMesher=new MapMesher();
