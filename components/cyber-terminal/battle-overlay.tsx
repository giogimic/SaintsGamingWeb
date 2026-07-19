'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { getCreatureById, getRandomEncounter, CreatureSchema } from './data/saints-dex';
import { getCombatMultiplier } from './combat';
import { processAchievements } from './data/achievements';

export default function BattleOverlay() {
  const playerState = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const catchDaemon = useGameStore(state => state.catchDaemon);
  const modifyHp = useGameStore(state => state.modifyHp);
  const gainXp = useGameStore(state => state.gainXp);
  const activeBattle = useGameStore(state => state.activeBattle);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  
  const isPvp = !!activeBattle;
  
  // Local PvE State
  const [enemy, setEnemy] = useState<CreatureSchema | null>(null);
  const [enemyHp, setEnemyHp] = useState(100);
  const [enemyMaxHp, setEnemyMaxHp] = useState(100);
  const [log, setLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  
  const activeDaemon = playerState.activeDaemonId ? getCreatureById(playerState.activeDaemonId) : null;
  const logRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isPvp) return; // Don't trigger wild encounter if in PvP
    const enc = getRandomEncounter();
    if (enc) {
      setEnemy(enc);
      const encHp = enc.stat_profile.HP * 2; 
      setEnemyHp(encHp);
      setEnemyMaxHp(encHp);
      setLog([`A wild ${enc.name} appeared!`, `You deployed ${activeDaemon?.name || 'Nothing'}!`]);
    }
  }, [isPvp]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log, activeBattle?.log]);

  if (!activeDaemon) return null;
  if (!isPvp && !enemy) return null;

  // -------------------------------------------------------------
  // PVE ACTIONS
  // -------------------------------------------------------------
  const pveEnemyTurn = () => {
    setTimeout(() => {
      if (enemyHp <= 0 || !enemy) return;
      
      const multiplier = getCombatMultiplier(enemy.type_primary, activeDaemon.type_primary);
      const baseDmg = enemy.stat_profile.ATK * 0.2;
      const dmg = Math.max(1, Math.floor(baseDmg * multiplier));
      
      let dmgMsg = ``;
      if (multiplier > 1) dmgMsg = `It's highly effective!`;
      if (multiplier < 1) dmgMsg = `It's not very effective...`;
      
      setLog(prev => [...prev, `${enemy.name} attacks! ${dmgMsg}`]);
      modifyHp(-dmg);
      
      const newPlayerHp = useGameStore.getState().player.hp;
      if (newPlayerHp <= 0) {
        setLog(prev => [...prev, `${activeDaemon.name} was defeated. You blacked out.`]);
        setTimeout(() => {
           modifyHp(playerState.maxHp);
           setGameMode('EXPLORING');
        }, 2000);
      } else {
        setIsPlayerTurn(true);
      }
    }, 1500);
  };

  const handlePveAttack = () => {
    if (!isPlayerTurn || !enemy) return;
    setIsPlayerTurn(false);

    const multiplier = getCombatMultiplier(activeDaemon.type_primary, enemy.type_primary);
    const baseDmg = activeDaemon.stat_profile.ATK * 0.3 * (1 + playerState.level * 0.1);
    const dmg = Math.max(1, Math.floor(baseDmg * multiplier));
    
    let dmgMsg = ``;
    if (multiplier > 1) dmgMsg = `It's highly effective!`;
    if (multiplier < 1) dmgMsg = `It's not very effective...`;
    
    setLog(prev => [...prev, `${activeDaemon.name} attacks! ${dmgMsg} (-${dmg} HP)`]);
    
    const nextEnemyHp = enemyHp - dmg;
    setEnemyHp(Math.max(0, nextEnemyHp));
    
    if (nextEnemyHp <= 0) {
      setLog(prev => [...prev, `${enemy.name} was deleted!`]);
      const xpGain = Math.floor(enemy.stat_profile.HP * 0.5);
      setTimeout(() => {
        setLog(prev => [...prev, `Gained ${xpGain} XP.`]);
        gainXp(xpGain);
        processAchievements();
        setTimeout(() => setGameMode('EXPLORING'), 2000);
      }, 1000);
    } else {
      pveEnemyTurn();
    }
  };

  const handleCatch = () => {
    if (isPvp) return; // Cannot catch in PvP
    if (!isPlayerTurn || !enemy) return;
    setIsPlayerTurn(false);
    
    setLog(prev => [...prev, `Using Binding Crystal...`]);
    setTimeout(() => {
      const catchRate = 1 - (enemyHp / enemyMaxHp);
      const roll = Math.random();
      if (roll < 0.2 + (catchRate * 0.6)) {
        setLog(prev => [...prev, `Gotcha! ${enemy.name} was bound.`]);
        catchDaemon(enemy.id);
        processAchievements();
        setTimeout(() => setGameMode('EXPLORING'), 2000);
      } else {
        setLog(prev => [...prev, `Oh no! The wild Beast broke free!`]);
        pveEnemyTurn();
      }
    }, 1500);
  };

  // -------------------------------------------------------------
  // PVP ACTIONS
  // -------------------------------------------------------------
  const handlePvpAttack = () => {
    if (!activeBattle || !emitSocketEvent) return;
    // Calculate damage locally then send it so server can apply it
    // In a fully secure MMO, server calculates damage based on stored stats.
    const dmg = 25 + Math.floor(Math.random() * 10);
    emitSocketEvent('battle_action', {
      battleId: activeBattle.id || activeBattle.battleId,
      action: 'ATTACK',
      damage: dmg
    });
  };

  const handleFlee = () => {
    // In PvE, run away. In PvP, forfeit (Not fully implemented on server yet, so just leave)
    if (isPvp) {
      useGameStore.getState().setActiveBattle(null);
    }
    setGameMode('EXPLORING');
  };

  // Determine current active state
  const isMyTurn = isPvp ? (activeBattle.isPlayerTurn || activeBattle.turn) : isPlayerTurn;
  const currentLog = isPvp ? (activeBattle.log || []) : log;
  
  const displayEnemyName = isPvp ? (activeBattle.opponent?.name || 'Opponent') : (enemy?.name || 'Unknown');
  const displayEnemyHp = isPvp ? (activeBattle.oppHp !== undefined ? activeBattle.oppHp : 100) : enemyHp;
  const displayEnemyMaxHp = isPvp ? 100 : enemyMaxHp; // PvP max HP is 100 for now
  
  const displayPlayerHp = isPvp ? (activeBattle.myHp !== undefined ? activeBattle.myHp : 100) : playerState.hp;
  const displayPlayerMaxHp = isPvp ? 100 : playerState.maxHp;

  const playerHpPercent = Math.max(0, (displayPlayerHp / displayPlayerMaxHp) * 100);
  const enemyHpPercent = Math.max(0, (displayEnemyHp / displayEnemyMaxHp) * 100);

  return (
    <div className="absolute inset-0 bg-[#166534]/95 flex flex-col p-6 border-4 border-[#14532d] rounded-lg backdrop-blur-sm z-30 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-4 border-b-2 border-[#14532d] pb-2">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-widest uppercase shadow-black drop-shadow-md">
          {isPvp ? 'PVP BATTLE' : 'WILD ENCOUNTER'}
        </h2>
        <span className="text-green-200 font-bold text-sm bg-black/50 px-2 py-1 rounded">LOCATION: {useGameStore.getState().currentMapId}</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 mb-4">
        {/* Enemy Side */}
        <div className="flex-1 flex flex-col items-center justify-center border border-slate-800 rounded-lg bg-slate-900/50 p-4 relative">
          <div className="w-full mb-2">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-red-400">HP</span>
              <span className="text-slate-400">{displayEnemyHp}/{displayEnemyMaxHp}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${enemyHpPercent}%` }} />
            </div>
          </div>
          <div className="w-32 h-32 bg-black rounded flex items-center justify-center overflow-hidden border border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.2)] mb-4 mt-4">
            {(!isPvp && enemy?.assetPath) ? (
              <img src={enemy.assetPath} alt={enemy.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <span className="text-red-900 text-5xl font-mono">?</span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-200">{displayEnemyName}</h3>
        </div>
        
        {/* Player Side */}
        <div className="flex-1 flex flex-col items-center justify-center border border-slate-800 rounded-lg bg-slate-900/50 p-4 relative">
          <div className="w-full mb-2">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-cyan-400">HP</span>
              <span className="text-slate-400">{displayPlayerHp}/{displayPlayerMaxHp}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${playerHpPercent}%` }} />
            </div>
          </div>
          <div className="w-32 h-32 bg-black rounded flex items-center justify-center overflow-hidden border border-cyan-900/50 shadow-[0_0_20px_rgba(34,211,238,0.2)] mb-4 mt-4">
            {activeDaemon.assetPath ? (
              <img src={activeDaemon.assetPath} alt={activeDaemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <span className="text-cyan-900 text-5xl font-mono">?</span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-200">{activeDaemon.name}</h3>
        </div>
      </div>

      {/* Combat Log */}
      <div ref={logRef} className="h-24 bg-black border border-slate-700 rounded p-3 overflow-y-auto mb-4 font-mono text-sm text-slate-300 flex flex-col space-y-1">
        {currentLog.map((entry: string, idx: number) => (
          <div key={idx}>{">"} {entry}</div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button 
          onClick={isPvp ? handlePvpAttack : handlePveAttack} 
          disabled={!isMyTurn}
          className={`p-3 border rounded font-bold tracking-wider transition-colors ${isMyTurn ? 'bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900/50' : 'bg-slate-900/40 text-slate-600 border-slate-800'}`}
        >
          ATTACK
        </button>
        <button 
          onClick={handleCatch} 
          disabled={!isMyTurn || isPvp}
          className={`p-3 border rounded font-bold tracking-wider transition-colors ${(!isMyTurn || isPvp) ? 'bg-slate-900/40 text-slate-600 border-slate-800' : 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border-cyan-900/50'}`}
        >
          CAPTURE
        </button>
        <button 
          onClick={handleFlee} 
          disabled={!isMyTurn && !isPvp} // In PvP you can forfeit anytime
          className="p-3 border rounded font-bold tracking-wider transition-colors bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 border-slate-700/50"
        >
          FLEE
        </button>
      </div>
    </div>
  );
}
