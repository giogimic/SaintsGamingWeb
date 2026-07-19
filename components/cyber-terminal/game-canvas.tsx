'use client';

import { useEffect, useRef } from 'react';
import EasyStar from 'easystarjs';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from './store';
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from './constants';
import { GAME_MAPS } from './data/maps';
import { getCreatureById } from './data/saints-dex';
import { setEncryptedAmbient } from './audio';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
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
            useGameStore.getState().showToast(gateInfo.errorMessage);
            return false;
          }
        }
      }
      return true;
    };

    const drawMap = (cameraX: number, cameraY: number) => {
      const mapData = GAME_MAPS[currentMapId];
      const timeOffset = Date.now() / 500;
      
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

          // If image is loaded, draw sprite. Otherwise fallback to green.
          if (tilesetImg.complete && tilesetImg.naturalWidth > 0) {
            // Very basic sprite mapping placeholders (Assuming standard 8x8 or 16x16 sheet)
            let srcX = 0; let srcY = 0;
            
            if (tile === 0 || tile >= 3) { srcX = 0; srcY = 0; } // Grass
            else if (tile === 1) { srcX = 16; srcY = 0; } // Wall/Tree
            else if (tile === 2) { srcX = 32; srcY = 0; } // Tall Grass
            else if (tile === 5) { srcX = 48; srcY = 0; } // Woodcutting Tree
            else if (tile === 6) { srcX = 64; srcY = 0; } // Ore
            else if (tile === 7) { srcX = 80; srcY = 0; } // Shop
            else if (tile === 8) { srcX = 96; srcY = 0; } // Clinic
            else if (tile === 9) { srcX = 16; srcY = 16; } // Anvil (using arbitrary srcX/Y for now)
            else if (tile === 10) { srcX = 112; srcY = 0; } // Water
            
            ctx.drawImage(tilesetImg, srcX, srcY, srcSize, srcSize, destX, destY, TILE_SIZE, TILE_SIZE);
            
            // Draw animated waves/vines over the base tile for gates
            if (tile >= 3 && tile !== 7 && tile !== 8 && tile !== 9 && tile !== 5 && tile !== 6 && tile !== 10) {
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
            }
          }
        }
      }
    };

    const drawPlayer = () => {
      // Basic LPC Character Placeholder
      // We assume an LPC spritesheet where characters are 64x64, but we'll draw a simplified version
      // Or we can load `/assets/player.png` if it exists!
      ctx.fillStyle = '#ef4444'; // Red hat/body
      ctx.beginPath();
      ctx.arc(
        currentPixelPos.x + TILE_SIZE / 2,
        currentPixelPos.y + TILE_SIZE / 2 + 4,
        TILE_SIZE / 2 - 8,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Face
      ctx.fillStyle = '#fef08a'; // Pale skin tone
      ctx.beginPath();
      ctx.arc(
        currentPixelPos.x + TILE_SIZE / 2,
        currentPixelPos.y + TILE_SIZE / 2 + 6,
        10,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(currentPixelPos.x + TILE_SIZE / 2 - 4, currentPixelPos.y + TILE_SIZE / 2 + 4, 2, 4);
      ctx.fillRect(currentPixelPos.x + TILE_SIZE / 2 + 4, currentPixelPos.y + TILE_SIZE / 2 + 4, 2, 4);
    };

    const drawEntities = () => {
      const state = useGameStore.getState();
      state.mapEntities.forEach(entity => {
        const ex = entity.position.x * TILE_SIZE;
        const ey = entity.position.y * TILE_SIZE;

        if (entity.type === 'NPC') {
          ctx.fillStyle = '#3b82f6'; // Blue for NPC
          ctx.fillRect(ex + 8, ey + 8, TILE_SIZE - 16, TILE_SIZE - 16);
          ctx.fillStyle = '#fff';
          ctx.fillText('NPC', ex + 12, ey + TILE_SIZE / 2);
        } else if (entity.type === 'ANIMAL') {
          ctx.fillStyle = '#d97706'; // Orange for animal
          ctx.beginPath();
          ctx.ellipse(ex + TILE_SIZE/2, ey + TILE_SIZE/2 + 8, 12, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (entity.type === 'MONSTER') {
          ctx.fillStyle = '#dc2626'; // Red for monster
          ctx.beginPath();
          ctx.moveTo(ex + 8, ey + TILE_SIZE - 8);
          ctx.lineTo(ex + TILE_SIZE / 2, ey + 8);
          ctx.lineTo(ex + TILE_SIZE - 8, ey + TILE_SIZE - 8);
          ctx.fill();
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
              if (Math.random() < 0.1) {
                useGameStore.getState().clearPath();
                useGameStore.getState().setGameMode('BATTLE');
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
      Object.entries(state.otherPlayers).forEach(([id, op]) => {
        const opX = op.x * TILE_SIZE - cameraX;
        const opY = op.y * TILE_SIZE - cameraY;
        
        // Simple Placeholder
        ctx.fillStyle = '#a855f7'; // Purple for others
        ctx.beginPath();
        ctx.arc(opX + TILE_SIZE / 2, opY + TILE_SIZE / 2 + 4, TILE_SIZE / 2 - 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(opX + TILE_SIZE / 2, opY + TILE_SIZE / 2 + 6, 10, 0, Math.PI * 2);
        ctx.fill();

        // Nametag
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(op.name, opX + TILE_SIZE / 2, opY - 4);
      });

      // Draw Local Player
      ctx.save();
      ctx.translate(currentPixelPos.x - cameraX, currentPixelPos.y - cameraY);
      drawPlayer();
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

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.gameMode !== 'EXPLORING') return;
      if (isMoving || state.pathQueue.length > 0) return;

      const pos = state.player.position;
      let nextX = pos.x;
      let nextY = pos.y;

      if (e.key === 'w' || e.key === 'ArrowUp') nextY -= 1;
      else if (e.key === 's' || e.key === 'ArrowDown') nextY += 1;
      else if (e.key === 'a' || e.key === 'ArrowLeft') nextX -= 1;
      else if (e.key === 'd' || e.key === 'ArrowRight') nextX += 1;
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
    <canvas 
      ref={canvasRef} 
      width={MAP_COLS * TILE_SIZE} 
      height={MAP_ROWS * TILE_SIZE}
      className="border-4 border-[#333] rounded-lg shadow-[0_0_50px_rgba(74,222,128,0.2)] cursor-pointer bg-[#4ade80] max-h-[85vh] w-full max-w-5xl aspect-video object-contain touch-none select-none image-pixelated"
    />
  );
}
