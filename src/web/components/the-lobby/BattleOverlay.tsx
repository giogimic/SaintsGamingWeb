'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, BattleState } from './store';
export default function BattleOverlay({ onAction }: { onAction?: (action: any) => void }) {
  const { activeBattle, setActiveBattle, setGameMode } = useGameStore();
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Sync log array
  useEffect(() => {
    if (activeBattle?.log) {
      setLogMessages(activeBattle.log);
    }
  }, [activeBattle?.log]);

  // Scroll to bottom of log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logMessages]);

  if (!activeBattle) return null;

  const handleAction = (action: string, itemId?: string, moveId?: string) => {
    if (activeBattle.phase !== 'WAITING_FOR_INPUT') return;
    
    // Optimistically update phase to prevent spam
    setActiveBattle({ ...activeBattle, phase: 'RESOLUTION' });

    if (onAction) {
      onAction({
        battleId: activeBattle.id,
        action,
        itemId,
        moveId
      });
    } else {
      window.dispatchEvent(new CustomEvent('emit_socket_event', {
        detail: {
          event: 'battle_submit_action',
          data: {
            battleId: activeBattle.id,
            action,
            itemId,
            moveId
          }
        }
      }));
    }
  };

  const isPlayerTurn = activeBattle.phase === 'WAITING_FOR_INPUT';

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto flex items-center justify-center bg-black/80 backdrop-blur-md font-['Outfit']">
      
      {/* Background Graphic */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
         <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-900/50 to-transparent skew-y-6 transform origin-top-left" />
         <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-red-900/50 to-transparent -skew-y-6 transform origin-bottom-right" />
      </div>

      <div className="relative w-full max-w-5xl h-[80vh] flex flex-col justify-between p-8">
        
        {/* Top Section: Enemy */}
        <div className="flex justify-between items-start w-full">
          <div className="w-1/3" /> {/* Spacer */}
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-1/2 flex items-center justify-end space-x-6"
          >
            {/* Enemy HUD */}
            <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-lg flex-1 sg-glass">
              <div className="flex justify-between text-white font-bold text-xl mb-2">
                <span>{activeBattle.wildCreature.name}</span>
                <span className="text-blue-400">Lv {activeBattle.wildCreature.level}</span>
              </div>
              
              <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-500 to-green-400"
                  initial={{ width: '100%' }}
                  animate={{ width: `${Math.max(0, (activeBattle.wildCreature.hp / activeBattle.wildCreature.maxHp) * 100)}%` }}
                  transition={{ duration: 0.5, type: 'spring' }}
                />
              </div>
            </div>
            
            {/* Enemy Sprite */}
            <div className="w-48 h-48 relative drop-shadow-[0_0_15px_rgba(255,100,100,0.5)]">
              <img 
                src={
                  activeBattle.wildCreature.spriteKey.startsWith('/')
                    ? activeBattle.wildCreature.spriteKey
                    : `/game-assets/${activeBattle.wildCreature.spriteKey}.png`
                } 
                alt={activeBattle.wildCreature.name}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </motion.div>
        </div>

        {/* Middle Section: Player */}
        <div className="flex justify-between items-end w-full">
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-1/2 flex items-end justify-start space-x-6"
          >
            {/* Player Sprite */}
            <div className="w-64 h-64 relative drop-shadow-[0_0_15px_rgba(100,100,255,0.5)]">
               {/* Note: In a real game, this would be the back sprite. We'll reuse the front for demo */}
              <img 
                src={
                  activeBattle.playerCreature.spriteKey.startsWith('/')
                    ? activeBattle.playerCreature.spriteKey
                    : `/game-assets/${activeBattle.playerCreature.spriteKey}.png`
                } 
                alt={activeBattle.playerCreature.name}
                className="w-full h-full object-contain -scale-x-100"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Player HUD */}
            <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-lg flex-1 mb-12 sg-glass">
              <div className="flex justify-between text-white font-bold text-xl mb-2">
                <span>{activeBattle.playerCreature.name}</span>
                <span className="text-blue-400">Lv {activeBattle.playerCreature.level}</span>
              </div>
              
              <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800 mb-2">
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-500 to-green-400"
                  initial={{ width: '100%' }}
                  animate={{ width: `${Math.max(0, (activeBattle.playerCreature.hp / activeBattle.playerCreature.maxHp) * 100)}%` }}
                  transition={{ duration: 0.5, type: 'spring' }}
                />
              </div>
              <div className="text-right text-slate-300 font-mono">
                {activeBattle.playerCreature.hp} / {activeBattle.playerCreature.maxHp}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section: Command Box & Combat Log */}
        <div className="w-full flex gap-4 h-48">
          
          {/* Action Log */}
          <div className="flex-1 bg-slate-900/90 border-2 border-slate-700 rounded-xl p-4 overflow-y-auto font-mono text-lg text-slate-200 sg-glass shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
            <AnimatePresence>
              {logMessages.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2"
                >
                  <span className="text-blue-500 mr-2">{'>'}</span> {msg}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>

          {/* Command Menu */}
          <div className="w-1/3 grid grid-cols-2 gap-4">
            <button 
              disabled={!isPlayerTurn}
              onClick={() => handleAction('FIGHT', undefined, 'Tackle')}
              className={`p-4 rounded-xl font-bold text-2xl tracking-wider transition-all duration-200 
                ${isPlayerTurn 
                  ? 'bg-gradient-to-br from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)] hover:scale-105' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
            >
              FIGHT
            </button>
            <button 
              disabled={!isPlayerTurn}
              onClick={() => handleAction('ITEM', 'binding_crystal')}
              className={`p-4 rounded-xl font-bold text-2xl tracking-wider transition-all duration-200 
                ${isPlayerTurn 
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(150,0,255,0.4)] hover:scale-105' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
            >
              CRYSTAL
            </button>
            <button 
              disabled={!isPlayerTurn}
              onClick={() => {}}
              className={`p-4 rounded-xl font-bold text-2xl tracking-wider transition-all duration-200 
                ${isPlayerTurn 
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-[0_0_15px_rgba(0,150,255,0.4)] hover:scale-105' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
            >
              SWAP
            </button>
            <button 
              disabled={!isPlayerTurn}
              onClick={() => handleAction('FLEE')}
              className={`p-4 rounded-xl font-bold text-2xl tracking-wider transition-all duration-200 
                ${isPlayerTurn 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 border border-slate-500' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
            >
              FLEE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
