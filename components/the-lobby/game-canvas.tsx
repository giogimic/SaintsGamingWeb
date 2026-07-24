
'use client';

import { useEffect, useRef, useState } from 'react';
import EasyStar from 'easystarjs';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from './store';
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from './constants';
import { GAME_MAPS } from './data/maps';
import { QUEST_DB } from './data/quests';
import { getCreatureById, getRandomEncounter, SAINTS_DEX } from './data/saints-dex';
import { setEncryptedAmbient } from './audio';
import VirtualDPad from './VirtualDPad';

// TileRegistry cache
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

const tileRegistryCache: Map<number, TileInfo> = new Map();
const tilesetImages: Map<string, HTMLImageElement> = new Map();

// Load tile registry from API
async function loadTileRegistry() {
  if (tileRegistryCache.size > 0) return;
  
  try {
    const response = await fetch('/api/tile-registry');
    const tiles = await response.json();
    
    for (const tile of tiles) {
      tileRegistryCache.set(tile.tileId, {
        tileId: tile.tileId,
        tilesetName: tile.tilesetName,
        tilesetPath: tile.tilesetPath,
        srcX: tile.srcX,
        srcY: tile.srcY,
        width: tile.width,
        height: tile.height,
        isAnimated: tile.isAnimated,
        animationFrames: tile.animationFrames ? JSON.parse(tile.animationFrames) : undefined,
      });
    }
    
    console.log(`Loaded ${tileRegistryCache.size} tiles from registry`);
  } catch (error) {
    console.error('Failed to load tile registry:', error);
  }
}

// Load tileset image
function loadTilesetImage(path: string): HTMLImageElement {
  if (tilesetImages.has(path)) {
    return tilesetImages.get(path)!;
  }
  
  const img = new Image();
  img.src = path;
  tilesetImages.set(path, img);
  return img;
}

// Get current animation frame for animated tiles
function getAnimationFrame(tile: TileInfo): { srcX: number; srcY: number } {
  if (!tile.isAnimated || !tile.animationFrames || tile.animationFrames.length === 0) {
    return { srcX: tile.srcX, srcY: tile.srcY };
  }
  
  const now = Date.now();
  const totalDuration = tile.animationFrames.reduce((sum, f) => sum + f.duration, 0);
  const elapsed = now % totalDuration;
  
  let accumulated = 0;
  for (const frame of tile.animationFrames) {
    accumulated += frame.duration;
    if (elapsed < accumulated) {
      const frameTile = tileRegistryCache.get(frame.tileId);
      if (frameTile) {
        return { srcX: frameTile.srcX, srcY: frameTile.srcY };
      }
    }
  }
  
  return { srcX: tile.srcX, srcY: tile.srcY };
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [_tileRegistryLoaded, setTileRegistryLoaded] = useState(false);

  useEffect(() => {
    // Load tile registry on mount
    loadTileRegistry().then(() => {
      setTileRegistryLoaded(true);
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const easystar = new EasyStar.js();
    easystar.setAcceptableTiles([0, 2, 3, 4, 5, 6, 8, 9, 10]);

    let currentMapId = useGameStore.getState().currentMapId;
    easystar.setGrid(GAME_MAPS[currentMapId].grid);

    // Socket.io Connection
    const socket = io(window.location.protocol + '//' + window.location.hostname + ':3001');
    socketRef.current = socket;
    
    socket.on('connect', () => {
      const state = useGameStore.getState();
      state.setEmitSocketEvent((event, data) => {
        socket.emit(event, data);
      });
      socket.emit('join_map', {
        mapId: state.currentMapId,
        x: state.player.position.x,
        y: state.player.position.y,
        name: 'Player', // Could be fetched from actual profile or store
        spriteId: state.player.equipment?.head ? 'hero_male' : 'villager_1'
      });
    });

    socket.on('map_players', (players) => {
      useGameStore.getState().setOtherPlayers(players);
    });

    socket.on('player_joined', (data) => {
      useGameStore.getState().updateOtherPlayer(data.socketId, data);
    });

    socket.on('player_moved', (data) => {
      useGameStore.getState().updateOtherPlayer(data.socketId, data);
    });

    socket.on('player_chat', (data) => {
      useGameStore.getState().updateOtherPlayer(data.socketId, { chatMessage: data.message });
      
      // Auto-clear chat message after 5 seconds
      setTimeout(() => {
        const store = useGameStore.getState();
        const op = store.otherPlayers[data.socketId];
        if (op && op.chatMessage === data.message) {
          store.updateOtherPlayer(data.socketId, { chatMessage: undefined });
        }
      }, 5000);
    });

    socket.on('player_left', (socketId) => {
      useGameStore.getState().removeOtherPlayer(socketId);
    });

    socket.on('battle_invite_received', (data) => {
      // For now, auto-accept to keep it simple and testable
      useGameStore.getState().showToast(`Challenge from ${data.name}! Accepting...`);
      socket.emit('accept_battle', data.from);
    });

    socket.on('battle_started', (data) => {
      useGameStore.getState().setActiveBattle(data);
      useGameStore.getState().setGameMode('BATTLE');
    });

    socket.on('battle_update', (data) => {
      // Merges new data into activeBattle
      useGameStore.getState().setActiveBattle({
        ...useGameStore.getState().activeBattle,
        ...data
      });
    });

    socket.on('battle_ended', (data) => {
      const state = useGameStore.getState();
      const myId = socketRef.current?.id;
      if (data.winner === myId) {
        state.showToast('You won the battle!');
      } else {
        state.showToast('You lost the battle...');
      }
      setTimeout(() => {
        state.setActiveBattle(null);
        state.setGameMode('EXPLORING');
      }, 3000);
    });

    // Preload Assets
    const tilesetImg = new Image();
    tilesetImg.src = '/assets/basictiles.png';
    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;
    let isMoving = false;
    
    const initialPos = useGameStore.getState().player.position;
    let currentPixelPos = { x: initialPos.x * TILE_SIZE, y: initialPos.y * TILE_SIZE };
    let targetPixelPos = { ...currentPixelPos };
    
    const speed = 4;

    const unsubMap = useGameStore.subscribe(
      (state) => state.currentMapId,
      (newMapId) => {
        currentMapId = newMapId;
        easystar.setGrid(GAME_MAPS[newMapId].grid);
        const spawnPos = useGameStore.getState().player.position;
        currentPixelPos = { x: spawnPos.x * TILE_SIZE, y: spawnPos.y * TILE_SIZE };
        targetPixelPos = { ...currentPixelPos };
        isMoving = false;
        useGameStore.getState().clearPath();

        if (newMapId === 'PROFESSOR_LAB') {
          const activeDaemon = useGameStore.getState().player.activeDaemonId;
          if (!activeDaemon) {
            useGameStore.getState().setGameMode('PROFESSOR_LAB');
          }
        }
      }
    );

    const checkTileValid = (x: number, y: number) => {
      const mapData = GAME_MAPS[currentMapId];
      if (y < 0 || y >= mapData.grid.length || x < 0 || x >= mapData.grid[0].length) return false;
      const tileValue = mapData.grid[y][x];
      
      if (tileValue === 1) return false;
      
      if (tileValue >= 3) {
        const gateInfo = mapData.gates[tileValue];
        if (gateInfo && gateInfo.requiredElement !== 'None') {
          const activeId = useGameStore.getState().player.activeDaemonId;
          const activeDaemon = activeId ? getCreatureById(activeId) : null;
          
          if (!activeDaemon || (activeDaemon.type_primary !== gateInfo.requiredElement && activeDaemon.type_secondary !== gateInfo.requiredElement)) {
            useGameStore.getState().showToast(gateInfo.errorMessage || 'Path blocked.');
            return false;
          }
        }
      }
      return true;
    };

    const drawMap = (cameraX: number, cameraY: number) => {
      const mapData = GAME_MAPS[currentMapId];
      const _timeOffset = Date.now() * 0.005;
      const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
      const endCol = Math.min(mapData.grid[0].length, Math.floor((cameraX + MAP_COLS * TILE_SIZE) / TILE_SIZE) + 2);
      const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
      const endRow = Math.min(mapData.grid.length, Math.floor((cameraY + MAP_ROWS * TILE_SIZE) / TILE_SIZE) + 2);
      
      for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
          const tile = mapData.grid[y][x];
          
          const destX = x * TILE_SIZE;
          const destY = y * TILE_SIZE;
          const srcSize = 16; // Standard 16x16 baseline

          const registryTile = tileRegistryCache.get(tile);
          if (registryTile) {
            const tileImg = loadTilesetImage(registryTile.tilesetPath);
            const { srcX, srcY } = getAnimationFrame(registryTile);
            if (tileImg.complete && tileImg.naturalWidth > 0) {
              ctx.drawImage(
                tileImg,
                srcX,
                srcY,
                registryTile.width || 16,
                registryTile.height || 16,
                destX,
                destY,
                TILE_SIZE,
                TILE_SIZE
              );
            } else {
              ctx.fillStyle = '#166534';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            }
          } else if (tilesetImg.complete && tilesetImg.naturalWidth > 0) {
            // Basic fallback baseline mapping
            let srcX = 0; let srcY = 0;
            
            if (tile === 0 || tile >= 3) { srcX = 0; srcY = 0; } // Grass
            else if (tile === 1) { srcX = 16; srcY = 0; } // Wall/Tree
            else if (tile === 2) { srcX = 32; srcY = 0; } // Tall Grass
            else if (tile === 5) { srcX = 48; srcY = 0; } // Woodcutting Tree
            else if (tile === 6) { srcX = 64; srcY = 0; } // Ore
            else if (tile === 7) { srcX = 80; srcY = 0; } // Shop
            else if (tile === 8) { srcX = 96; srcY = 0; } // Clinic
            else if (tile === 9) { srcX = 16; srcY = 16; } // Anvil
            else if (tile === 10) { srcX = 112; srcY = 0; } // Water
            else if (tile === 12) { srcX = 48; srcY = 16; } // Base Terminal
            
            ctx.drawImage(tilesetImg, srcX, srcY, srcSize, srcSize, destX, destY, TILE_SIZE, TILE_SIZE);
            
            // Draw animated waves/vines over the base tile for gates
            if (tile >= 3 && tile !== 7 && tile !== 8 && tile !== 9 && tile !== 5 && tile !== 6 && tile !== 10 && tile !== 12) {
               if (tile === 3) {
                   ctx.fillStyle = 'rgba(21, 128, 61, 0.7)'; // Thick vines
                   ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
               } else if (tile === 4) {
                   ctx.fillStyle = 'rgba(56, 189, 248, 0.6)'; // Water blue
                   ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
               } else {
                   ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                   ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
               }
            }
          } else {
            // Fallback Procedural Shapes if image fails or is loading
            if (tile === 0 || tile >= 3) {
              ctx.fillStyle = '#4ade80';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 1) {
              ctx.fillStyle = '#166534';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 2) {
              ctx.fillStyle = '#22c55e';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 5) {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 6) {
              ctx.fillStyle = '#52525b';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 7) {
              ctx.fillStyle = '#eab308';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 8) {
              ctx.fillStyle = '#f87171';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 9) {
              ctx.fillStyle = '#9ca3af'; // Gray for anvil
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 10) {
              ctx.fillStyle = '#0ea5e9';
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 12) {
              ctx.fillStyle = '#1e1b4b'; // Dark blue terminal
              ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#38bdf8'; // Screen glow
              ctx.fillRect(destX + 4, destY + 4, TILE_SIZE - 8, TILE_SIZE - 12);
            }
          }
        }
      }
    };

    // Image Cache for Custom Asset Uploads
    const spriteImageCache: Record<string, HTMLImageElement> = {};

    const renderSpriteImageOrPixel = (
      x: number,
      y: number,
      spriteKey?: string,
      customization?: { skinTone: string; hairColor: string; shirtColor: string; pantsColor: string }
    ) => {
      const key = spriteKey || 'hero_male';
      const isImage = key.startsWith('/') || key.startsWith('http');

      if (isImage) {
        if (!spriteImageCache[key]) {
          const img = new Image();
          img.src = key;
          spriteImageCache[key] = img;
        }
        const cachedImg = spriteImageCache[key];
        if (cachedImg.complete && cachedImg.naturalWidth > 0) {
          // Foot Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(x + TILE_SIZE/2, y + TILE_SIZE - 3, 12, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(cachedImg, x, y, TILE_SIZE, TILE_SIZE);
          return;
        }
      }

      // Foot Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + TILE_SIZE/2, y + TILE_SIZE - 3, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Palette per sprite ID (defaults overridden by customization)
      let mainColor = customization?.shirtColor || '#10b981'; // Emerald Agent
      let subColor = customization ? (customization.shirtColor === '#10b981' ? '#065f46' : customization.shirtColor) : '#065f46';
      const skinTone = customization?.skinTone || '#fcd34d';
      let hairColor = customization?.hairColor || '#3b82f6';
      const pantsColor = customization?.pantsColor || '#18181b';

      if (!customization) {
        if (key === 'mage_1' || key === 'INVOKER' || key === 'CYBER') {
          mainColor = '#a855f7'; // Purple Cybermancer
          subColor = '#581c87';
          hairColor = '#ec4899';
        } else if (key === 'villager_1' || key === 'ARTISAN') {
          mainColor = '#f59e0b'; // Gold Wanderer
          subColor = '#78350f';
          hairColor = '#78350f';
        } else if (key === 'assassin' || key === 'RANGER') {
          mainColor = '#06b6d4'; // Cyan Phantom
          subColor = '#164e63';
          hairColor = '#0f172a';
        } else if (key === 'BRAWLER' || key === 'SURVIVOR') {
          mainColor = '#ef4444'; // Red Brawler
          subColor = '#7f1d1d';
          hairColor = '#451a03';
        }
      }

      // Boots & Legs
      ctx.fillStyle = pantsColor;
      ctx.fillRect(x + 10, y + 21, 4, 7);
      ctx.fillRect(x + 18, y + 21, 4, 7);

      ctx.fillStyle = subColor;
      ctx.fillRect(x + 9, y + 26, 5, 3);
      ctx.fillRect(x + 18, y + 26, 5, 3);

      // Body / Outfit
      ctx.fillStyle = mainColor;
      ctx.fillRect(x + 8, y + 11, 16, 11);

      // Chest Emblem
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 13, y + 13, 6, 5);
      ctx.fillStyle = mainColor;
      ctx.fillRect(x + 14, y + 14, 4, 3);

      // Belt & Buckle
      ctx.fillStyle = '#52525b';
      ctx.fillRect(x + 8, y + 19, 16, 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x + 14, y + 18, 4, 4);

      // Arms
      ctx.fillStyle = subColor;
      ctx.fillRect(x + 5, y + 12, 3, 7);
      ctx.fillRect(x + 24, y + 12, 3, 7);
      ctx.fillStyle = skinTone;
      ctx.fillRect(x + 5, y + 19, 3, 3);
      ctx.fillRect(x + 24, y + 19, 3, 3);

      // Head / Face
      ctx.fillStyle = skinTone;
      ctx.fillRect(x + 9, y + 4, 14, 9);

      // Hair / Hood
      ctx.fillStyle = hairColor;
      ctx.fillRect(x + 8, y + 2, 16, 4);
      ctx.fillRect(x + 8, y + 4, 3, 5);
      ctx.fillRect(x + 21, y + 4, 3, 5);

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 11, y + 7, 3, 3);
      ctx.fillRect(x + 18, y + 7, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 12, y + 7, 1, 1);
      ctx.fillRect(x + 19, y + 7, 1, 1);
    };

    const drawPlayer = () => {
      const playerState = useGameStore.getState().player;
      renderSpriteImageOrPixel(currentPixelPos.x, currentPixelPos.y, playerState.spriteId, playerState.customization);
    };

    const drawEntities = () => {
      const state = useGameStore.getState();
      state.mapEntities.forEach(entity => {
        if (entity.mapId && entity.mapId !== currentMapId) return;

        const ex = entity.position.x * TILE_SIZE;
        const ey = entity.position.y * TILE_SIZE;

        if (entity.type === 'NPC') {
          renderSpriteImageOrPixel(ex, ey, entity.spriteKey || 'villager_1');

          // Quest Indicator floating above head
          const hasQuest = Object.values(QUEST_DB).some(q => q.npcId === entity.id);
          if (hasQuest) {
            ctx.fillStyle = '#fbbf24'; // Golden Quest Mark
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', ex + TILE_SIZE / 2, ey - 6);
          }
        } else if (entity.type === 'ANIMAL') {
          renderSpriteImageOrPixel(ex, ey, entity.spriteKey || 'villager_1');
        } else if (entity.type === 'MONSTER') {
          renderSpriteImageOrPixel(ex, ey, entity.spriteKey || 'assassin');
        }
      });
    };

    const renderLoop = () => {
      const state = useGameStore.getState();
      
      if (state.gameMode === 'EXPLORING') {
        if (!isMoving) {
          if (state.pathQueue.length > 0) {
            const nextPoint = useGameStore.getState().dequeuePath();
            if (nextPoint) {
              if (checkTileValid(nextPoint.x, nextPoint.y)) {
                useGameStore.getState().setPlayerPosition(nextPoint);
                targetPixelPos = { x: nextPoint.x * TILE_SIZE, y: nextPoint.y * TILE_SIZE };
                isMoving = true;
              } else {
                useGameStore.getState().clearPath();
              }
            }
          }
        } else {
          const dx = targetPixelPos.x - currentPixelPos.x;
          const dy = targetPixelPos.y - currentPixelPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= speed) {
            currentPixelPos = { ...targetPixelPos };
            isMoving = false;

            // Emit to server now that we've reached the tile
            const currentLogicalPos = useGameStore.getState().player.position;
            socketRef.current?.emit('move', { 
              x: currentLogicalPos.x, 
              y: currentLogicalPos.y,
              mapId: currentMapId 
            });
            
            const mapData = GAME_MAPS[currentMapId];
            const tileType = mapData.grid[currentLogicalPos.y][currentLogicalPos.x];

            if (tileType === 8) {
              const state = useGameStore.getState();
              if (state.player.hp < state.player.maxHp) {
                state.modifyHp(state.player.maxHp);
                state.showToast('Beast fully rested at the Clinic!');
              }
              setEncryptedAmbient(false);
            } else if (tileType === 5 || tileType === 6 || tileType === 10) {
              // Gathering Nodes - Bounce back to previous tile
              const state = useGameStore.getState();
              state.setPlayerPosition(currentLogicalPos); // revert logical pos
              targetPixelPos = { x: currentLogicalPos.x * TILE_SIZE, y: currentLogicalPos.y * TILE_SIZE };
              
              if (tileType === 5) {
                state.modifyInventory('logs', 1);
                state.gainSkillXp('Woodcutting', 15);
                state.showToast('You chopped some Logs!');
              } else if (tileType === 6) {
                state.modifyInventory('ore', 1);
                state.gainSkillXp('Mining', 20);
                state.showToast('You mined some Ore!');
              } else if (tileType === 10) {
                state.modifyInventory('raw_fish', 1);
                state.gainSkillXp('Fishing', 10);
                state.showToast('You caught a Raw Fish!');
              }
              setEncryptedAmbient(false);
            } else if (tileType === 7) {
              useGameStore.getState().setGameMode('SHOP');
              setEncryptedAmbient(false);
            } else if (tileType >= 3 && tileType !== 7 && tileType !== 8) {
              const gateInfo = mapData.gates[tileType];
              if (gateInfo) {
                useGameStore.getState().changeMap(gateInfo.targetMapId, gateInfo.spawnPoint);
              }
            } else if (tileType === 2) {
              setEncryptedAmbient(true);
              const pool = mapData.encounterPool || [];
              if (pool.length > 0) {
                // Calculate total weight to see if an encounter triggers
                const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
                if (Math.random() < totalWeight) {
                  useGameStore.getState().clearPath();
                  let roll = Math.random() * totalWeight;
                  let selectedEncounter = pool[0];
                  for (const enc of pool) {
                    if (roll < enc.weight) {
                      selectedEncounter = enc;
                      break;
                    }
                    roll -= enc.weight;
                  }
                  
                  const species = getCreatureById(selectedEncounter.speciesId) || SAINTS_DEX[0];
                  const randomLevel = Math.floor(Math.random() * (selectedEncounter.maxLevel - selectedEncounter.minLevel + 1)) + selectedEncounter.minLevel;
                  const creature = { ...species, level: randomLevel };
                  
                  const activeDaemonId = useGameStore.getState().player.activeDaemonId;
                  useGameStore.getState().setActiveBattle({
                    enemy: creature,
                    playerCreature: activeDaemonId 
                      ? getCreatureById(activeDaemonId) 
                      : SAINTS_DEX[0]
                  });
                  useGameStore.getState().setGameMode('BATTLE');
                  useGameStore.getState().showToast(`Wild ${creature.name} (Lv.${randomLevel}) appeared!`);
                }
              } else {
                if (Math.random() < 0.15) {
                  useGameStore.getState().clearPath();
                  const creature = getRandomEncounter();
                  const activeDaemonId = useGameStore.getState().player.activeDaemonId;
                  useGameStore.getState().setActiveBattle({
                    enemy: creature,
                    playerCreature: activeDaemonId 
                      ? getCreatureById(activeDaemonId) 
                      : SAINTS_DEX[0]
                  });
                  useGameStore.getState().setGameMode('BATTLE');
                  useGameStore.getState().showToast(`Wild ${creature.name} appeared!`);
                }
              }
            } else {
              setEncryptedAmbient(false);
            }
          } else {
            currentPixelPos.x += (dx / dist) * speed;
            currentPixelPos.y += (dy / dist) * speed;
          }
        }
      }

      // Calculate Camera Position
      const cameraX = Math.max(0, Math.min(
        currentPixelPos.x - canvas.width / 2 + TILE_SIZE / 2,
        GAME_MAPS[currentMapId].grid[0].length * TILE_SIZE - canvas.width
      ));
      const cameraY = Math.max(0, Math.min(
        currentPixelPos.y - canvas.height / 2 + TILE_SIZE / 2,
        GAME_MAPS[currentMapId].grid.length * TILE_SIZE - canvas.height
      ));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      
      drawMap(cameraX, cameraY);
      drawEntities();

      // Draw Other Players
      Object.entries(state.otherPlayers).forEach(([_id, op]) => {
        const opX = op.x * TILE_SIZE - cameraX;
        const opY = op.y * TILE_SIZE - cameraY;
        
        renderSpriteImageOrPixel(opX, opY, op.spriteId || 'mage_1');

        // Nametag
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(op.name, opX + TILE_SIZE / 2, opY - 4);
        
        // Chat Bubble
        if (op.chatMessage) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(opX + TILE_SIZE / 2 - 40, opY - 30, 80, 20);
          ctx.fillStyle = '#000';
          ctx.font = '10px monospace';
          ctx.fillText(op.chatMessage.substring(0, 15), opX + TILE_SIZE / 2, opY - 16);
        }
      });

      // Draw Local Player
      ctx.save();
      ctx.translate(currentPixelPos.x - cameraX, currentPixelPos.y - cameraY);
      drawPlayer();
      
      if (state.localChat) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(TILE_SIZE / 2 - 40, -30, 80, 20);
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(state.localChat.substring(0, 15), TILE_SIZE / 2, -16);
      }
      
      ctx.restore();
      
      ctx.restore();

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    const handleClick = (e: MouseEvent) => {
      const state = useGameStore.getState();
      if (state.gameMode !== 'EXPLORING') return;

      const rect = canvas.getBoundingClientRect();
      // Adjust click coordinates to account for CSS scaling vs internal resolution
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;
      
      const cameraX = Math.max(0, Math.min(
        currentPixelPos.x - canvas.width / 2 + TILE_SIZE / 2,
        GAME_MAPS[currentMapId].grid[0].length * TILE_SIZE - canvas.width
      ));
      const cameraY = Math.max(0, Math.min(
        currentPixelPos.y - canvas.height / 2 + TILE_SIZE / 2,
        GAME_MAPS[currentMapId].grid.length * TILE_SIZE - canvas.height
      ));

      // Translate click coordinates to map grid coordinates
      const mapPixelX = clickX + cameraX;
      const mapPixelY = clickY + cameraY;
      
      const gridX = Math.floor(mapPixelX / TILE_SIZE);
      const gridY = Math.floor(mapPixelY / TILE_SIZE);

      // Check if clicked on another player
      const clickedPlayerId = Object.keys(state.otherPlayers).find(
        (id) => state.otherPlayers[id].x === gridX && state.otherPlayers[id].y === gridY
      );

      if (clickedPlayerId) {
        socketRef.current?.emit('invite_battle', clickedPlayerId);
        state.showToast(`Challenged ${state.otherPlayers[clickedPlayerId].name} to a battle!`);
        return;
      }

      // Check if clicked on an NPC/Entity
      const clickedEntity = state.mapEntities.find(
        (ent) => ent.position.x === gridX && ent.position.y === gridY && (!ent.mapId || ent.mapId === currentMapId)
      );

      if (clickedEntity && clickedEntity.type === 'NPC') {
        const playerPos = state.player.position;
        const dist = Math.abs(playerPos.x - gridX) + Math.abs(playerPos.y - gridY);
        if (dist <= 2) {
          let dialogText = "Hello there, traveler.";
          const npcQuest = Object.values(QUEST_DB).find(q => q.npcId === clickedEntity.id);
          if (npcQuest) {
            dialogText = Array.isArray(npcQuest.dialogs?.intro) ? npcQuest.dialogs.intro.join(" ") : (Array.isArray(npcQuest.dialogs?.start) ? npcQuest.dialogs.start.join(" ") : "Greetings!");
          } else if (clickedEntity.id === 'npc-1') {
            dialogText = "Welcome to Saints Village. The wilderness outside these walls is extremely dangerous. I'd recommend you get some bronze armor from the Smith before wandering into the tall grass.";
          } else if (clickedEntity.id === 'npc-2') {
            dialogText = "I'm so hungry... The pond to the south-west has fish, but I can't catch them.";
          } else if (clickedEntity.id === 'npc-guard') {
            dialogText = "Halt! The Verdant Outpost is strictly controlled. Prove your strength before passing.";
          }

          state.setActiveDialog({
            npcId: clickedEntity.id,
            text: dialogText
          });
          state.setGameMode('DIALOG');
        } else {
          state.showToast("You need to get closer to talk.");
        }
        return;
      }

      const playerPos = useGameStore.getState().player.position;
      const distToClick = Math.abs(playerPos.x - gridX) + Math.abs(playerPos.y - gridY);
      
      // Check for Resource Gathering BEFORE checkTileValid aborts
      const tileValue = GAME_MAPS[currentMapId].grid[gridY]?.[gridX];
      if (tileValue === 5 || tileValue === 6 || tileValue === 10) {
        if (distToClick <= 1) {
          // Harvest!
          if (tileValue === 5) {
            state.showToast('You chopped some Wood Logs!');
            state.modifyInventory('wood_logs', 1);
            state.gainSkillXp('Woodcutting', 10);
          } else if (tileValue === 6) {
            state.showToast('You mined some Copper Ore!');
            state.modifyInventory('copper_ore', 1);
            state.gainSkillXp('Mining', 10);
          } else if (tileValue === 10) {
            state.showToast('You caught a Raw Fish!');
            state.modifyInventory('raw_fish', 1);
            state.gainSkillXp('Fishing', 10);
          }
          return;
        } else {
          state.showToast('You need to get closer to gather that.');
          return;
        }
      } else if (tileValue === 9) { // Crafting Station
        if (distToClick <= 1) {
          state.setGameMode('CRAFTING');
          return;
        } else {
          state.showToast('You need to get closer to craft.');
          return;
        }
      } else if (tileValue === 12) { // Base Terminal
        if (distToClick <= 1) {
          state.setGameMode('BASE');
          return;
        } else {
          state.showToast('You need to get closer to access the terminal.');
          return;
        }
      }

      if (!checkTileValid(gridX, gridY)) return;

      const startPos = isMoving 
        ? { x: Math.floor(targetPixelPos.x / TILE_SIZE), y: Math.floor(targetPixelPos.y / TILE_SIZE) } 
        : useGameStore.getState().player.position;

      easystar.findPath(startPos.x, startPos.y, gridX, gridY, (path) => {
        if (path && path.length > 0) {
          useGameStore.getState().enqueuePath(path.slice(1));
        }
      });
      easystar.calculate();
    };

    let lastFacing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = 'DOWN';

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.gameMode !== 'EXPLORING') return;
      if (isMoving || state.pathQueue.length > 0) return;

      const pos = state.player.position;
      let nextX = pos.x;
      let nextY = pos.y;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const playerPerk = state.player.perk;
        const jumpDistance = playerPerk === 'ACROBAT' ? 2 : 1;
        let jumpX = pos.x;
        let jumpY = pos.y;

        if (lastFacing === 'UP') jumpY -= jumpDistance;
        else if (lastFacing === 'DOWN') jumpY += jumpDistance;
        else if (lastFacing === 'LEFT') jumpX -= jumpDistance;
        else if (lastFacing === 'RIGHT') jumpX += jumpDistance;

        if (checkTileValid(jumpX, jumpY)) {
          useGameStore.getState().enqueuePath([{ x: jumpX, y: jumpY }]);
          useGameStore.getState().showToast(playerPerk === 'ACROBAT' ? '🦘 DOUBLE JUMP!' : '🦘 HOP!');
        }
        return;
      }

      if (e.key === 'w' || e.key === 'ArrowUp') { nextY -= 1; lastFacing = 'UP'; }
      else if (e.key === 's' || e.key === 'ArrowDown') { nextY += 1; lastFacing = 'DOWN'; }
      else if (e.key === 'a' || e.key === 'ArrowLeft') { nextX -= 1; lastFacing = 'LEFT'; }
      else if (e.key === 'd' || e.key === 'ArrowRight') { nextX += 1; lastFacing = 'RIGHT'; }
      else return;

      if (checkTileValid(nextX, nextY)) {
        useGameStore.getState().enqueuePath([{ x: nextX, y: nextY }]);
      }
    };

    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      unsubMap();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <canvas 
        ref={canvasRef} 
        width={MAP_COLS * TILE_SIZE} 
        height={MAP_ROWS * TILE_SIZE}
        className="border-2 border-emerald-500/30 rounded-lg shadow-[0_0_60px_rgba(16,185,129,0.3)] cursor-pointer bg-[#1a1a2e] max-h-[90vh] w-full max-w-6xl aspect-video object-contain touch-none select-none image-pixelated"
      />
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-3 py-2 text-white text-xs font-mono">
          <div className="text-emerald-400 font-bold">SAINTS TAMER</div>
          <div className="text-gray-400">v1.0.0</div>
        </div>
      </div>
      {/* Controls Hint - Desktop Only */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-3 py-2 text-white text-xs font-mono pointer-events-none hidden md:block">
        <div className="text-emerald-400 font-bold mb-1">CONTROLS</div>
        <div className="text-gray-300">WASD / Click to Move</div>
        <div className="text-gray-300">E - Interact</div>
      </div>
      {/* Virtual D-Pad for Mobile */}
      <VirtualDPad />
    </div>
  );
}
