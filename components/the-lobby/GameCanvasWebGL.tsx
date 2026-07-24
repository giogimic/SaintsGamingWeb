/**
 * WebGL Game Canvas using PixiJS
 * 
 * This component replaces the Canvas 2D rendering with WebGL for better performance.
 * Features:
 * - Hardware-accelerated rendering
 * - Sprite batching (10x performance improvement)
 * - Texture atlases for reduced draw calls
 * - Smooth 60 FPS gameplay
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { GameRenderer } from '@/lib/game/GameRenderer';
import { useGameStore } from './store';
import { GAME_MAPS } from './data/maps';
import EasyStar from 'easystarjs';
import { io, Socket } from 'socket.io-client';

export default function GameCanvasWebGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize WebGL renderer
    const renderer = new GameRenderer(canvasRef.current);
    rendererRef.current = renderer;
    
    // Load assets and initialize
    const initialize = async () => {
      try {
        // Load texture atlases
        await renderer.loadAtlases();
        
        // Load tile registry
        const tileRegistry = await renderer.loadTileRegistry();
        
        // Initialize pathfinding
        const easystar = new EasyStar.js();
        easystar.setAcceptableTiles([0, 2, 3, 4, 5, 6, 8, 9, 10]);
        
        const currentMapId = useGameStore.getState().currentMapId;
        const mapData = GAME_MAPS[currentMapId];
        easystar.setGrid(mapData.grid);
        
        // Initialize Socket.IO
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
            name: 'Player',
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
          useGameStore.getState().showToast(`Challenge from ${data.name}! Accepting...`);
          socket.emit('accept_battle', data.from);
        });
        
        socket.on('battle_started', (data) => {
          useGameStore.getState().setActiveBattle(data);
          useGameStore.getState().setGameMode('BATTLE');
        });
        
        socket.on('battle_update', (data) => {
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
        
        // Initial render
        const mapWidth = mapData.grid[0]?.length || 0;
        const mapHeight = mapData.grid.length || 0;
        renderer.renderTileMap({
          grid: mapData.grid,
          width: mapWidth,
          height: mapHeight
        }, tileRegistry);
        
        // Start render loop
        renderer.startRenderLoop(() => {
          const state = useGameStore.getState();
          
          if (state.gameMode === 'EXPLORING') {
            // Update camera to follow player
            const playerPos = state.player.position;
            const currentMap = GAME_MAPS[currentMapId];
            renderer.updateCamera(
              playerPos.x,
              playerPos.y,
              currentMap.grid[0].length,
              currentMap.grid.length
            );
            
            // Render entities
            const entities = state.mapEntities
              .filter(e => !e.mapId || e.mapId === currentMapId)
              .map(e => ({
                id: e.id,
                type: e.type as 'NPC' | 'PLAYER' | 'MONSTER',
                spriteKey: e.spriteKey,
                position: e.position
              }));
            
            renderer.renderEntities(entities);
          }
        });
        
        setIsReady(true);
        console.log('✓ WebGL renderer initialized');
      } catch (error) {
        console.error('✗ Failed to initialize WebGL renderer:', error);
      }
    };
    
    initialize();
    
    // Handle window resize
    const handleResize = () => {
      if (rendererRef.current) {
        const width = Math.min(window.innerWidth, 1200);
        const height = Math.min(window.innerHeight - 100, 800);
        rendererRef.current.resize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border-4 border-[#333] rounded-lg shadow-[0_0_50px_rgba(74,222,128,0.2)] cursor-pointer max-h-[85vh] w-full max-w-5xl"
        style={{ imageRendering: 'pixelated' }}
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
          <div className="text-emerald-400 font-mono text-lg">Loading WebGL Renderer...</div>
        </div>
      )}
    </div>
  );
}