'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { getCreatureById, getRandomEncounter, TuxemonCreature, calculateDamage, calculateCatchRate } from './data/tuxemon-dex';
import { processAchievements } from './data/achievements';

export default function BattleOverlay() {
  const playerState = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const catchDaemon = useGameStore(state => state.catchDaemon);
  const modifyHp = useGameStore(state => state.modifyHp);
  const gainXp = useGameStore(state => state.gainXp);
  const modifyInventory = useGameStore(state => state.modifyInventory);
  const modifyCredits = useGameStore(state => state.modifyCredits);
  const activeBattle = useGameStore(state => state.activeBattle);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  
  const isPvp = !!activeBattle;
  
  // Local PvE State
  const [enemy, setEnemy] = useState<TuxemonCreature | null>(null);
  const [enemyHp, setEnemyHp] = useState(100);
  const [enemyMaxHp, setEnemyMaxHp] = useState(100);
  const [log, setLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, color: string, isEnemy: boolean}[]>([]);
  const [selectedMove, setSelectedMove] = useState(0);
  const [activeDaemon, setActiveDaemon] = useState<TuxemonCreature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const logRef = useRef<HTMLDivElement>(null);
  
  // Load active daemon
  useEffect(() => {
    async function loadDaemon() {
      if (playerState.activeDaemonId) {
        const creature = await getCreatureById(playerState.activeDaemonId);
        setActiveDaemon(creature);
      }
      setIsLoading(false);
    }
    loadDaemon();
  }, [playerState.activeDaemonId]);
  
  // Load wild encounter
  useEffect(() => {
    if (isPvp || isLoading) return;
    async function loadEncounter() {
      const enc = await getRandomEncounter(useGameStore.getState().currentMapId);
      if (enc) {
        setEnemy(enc);
        const encHp = enc.stat_profile.HP * 2; 
        setEnemyHp(encHp);
        setEnemyMaxHp(encHp);
        setLog([`A wild ${enc.name} appeared!`, `You deployed ${activeDaemon?.name || 'Nothing'}!`]);
      }
    }
    loadEncounter();
  }, [isPvp, isLoading, activeDaemon?.name]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log, activeBattle?.log]);

  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [caughtList, setCaughtList] = useState<TuxemonCreature[]>([]);

  // Load caught creatures for party modal
  useEffect(() => {
    async function loadParty() {
      if (playerState.caughtDaemons && playerState.caughtDaemons.length > 0) {
        const creatures = await Promise.all(
          playerState.caughtDaemons.map(id => getCreatureById(id))
        );
        setCaughtList(creatures.filter((c): c is TuxemonCreature => c !== null));
      }
    }
    loadParty();
  }, [playerState.caughtDaemons]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-[#166534]/95 flex items-center justify-center z-30">
        <div className="text-white text-xl">Loading battle...</div>
      </div>
    );
  }

  if (!activeDaemon) return null;
  if (!isPvp && !enemy) return null;

  const showFloatingText = (text: string, color: string, isEnemy: boolean) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, color, isEnemy }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1000);
  };

  // -------------------------------------------------------------
  // PVE ACTIONS
  // -------------------------------------------------------------
  const pveEnemyTurn = () => {
    setTimeout(() => {
      if (enemyHp <= 0 || !enemy || !activeDaemon) return;
      
      // Enemy uses a random move from its moveset
      const enemyMoves = enemy.moveset.filter(m => m.level <= 50);
      const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)] || { power: 50, type: 'normal', accuracy: 100, name: 'Tackle' };
      
      const { damage, effectiveness, critical, missed } = calculateDamage(enemy, activeDaemon, {
        power: enemyMove.power || 50,
        type: enemyMove.type,
        accuracy: enemyMove.accuracy || 100,
      });
      
      if (missed) {
        setLog(prev => [...prev, `${enemy.name} attacked... but missed!`]);
        setIsPlayerTurn(true);
        return;
      }
      
      let dmgMsg = ``;
      if (critical) dmgMsg += `Critical hit! `;
      if (effectiveness > 1) dmgMsg += `It's highly effective! `;
      if (effectiveness < 1) dmgMsg += `It's not very effective... `;
      
      setLog(prev => [...prev, `${enemy.name} used ${enemyMove.name}! ${dmgMsg}`]);
      showFloatingText(`-${damage}`, '#ef4444', false);
      modifyHp(-damage);
      
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
    if (!isPlayerTurn || !enemy || !activeDaemon) return;
    setIsPlayerTurn(false);
    
    // Use selected move from active daemon's moveset
    const playerMoves = activeDaemon.moveset.filter(m => m.level <= 50);
    const playerMove = playerMoves[selectedMove] || playerMoves[0] || { power: 50, type: 'normal', accuracy: 100, name: 'Tackle' };
    
    const { damage, effectiveness, critical, missed } = calculateDamage(activeDaemon, enemy, {
      power: playerMove.power || 50,
      type: playerMove.type,
      accuracy: playerMove.accuracy || 100,
    });
    
    if (missed) {
      setLog(prev => [...prev, `${activeDaemon.name} used ${playerMove.name}... but missed!`]);
      pveEnemyTurn();
      return;
    }
    
    let dmgMsg = ``;
    if (critical) dmgMsg += `Critical hit! `;
    if (effectiveness > 1) dmgMsg += `It's highly effective! `;
    if (effectiveness < 1) dmgMsg += `It's not very effective... `;
    
    setLog(prev => [...prev, `${activeDaemon.name} used ${playerMove.name}! ${dmgMsg} (-${damage} HP)`]);
    showFloatingText(`-${damage}`, '#38bdf8', true);
    
    const nextEnemyHp = enemyHp - damage;
    setEnemyHp(Math.max(0, nextEnemyHp));
    
    if (nextEnemyHp <= 0) {
      setLog(prev => [...prev, `${enemy.name} was defeated!`]);
      const xpGain = Math.floor(enemy.stat_profile.HP * 0.5);
      
      let droppedItem = null;
      let dropAmount = 0;
      const creditsGained = Math.floor(Math.random() * 20) + 5;
      const dropRoll = Math.random();
      
      if (dropRoll < 0.2) {
        droppedItem = 'wood_log';
        dropAmount = Math.floor(Math.random() * 2) + 1;
      } else if (dropRoll < 0.4) {
        droppedItem = 'copper_ore';
        dropAmount = Math.floor(Math.random() * 2) + 1;
      } else if (dropRoll < 0.5) {
        droppedItem = 'patch_kit';
        dropAmount = 1;
      }

      setTimeout(() => {
        setLog(prev => {
          const messages = [`Gained ${xpGain} XP.`, `Found ${creditsGained} Credits.`];
          if (droppedItem) messages.push(`Dropped: ${dropAmount}x ${droppedItem.replace('_', ' ')}!`);
          return [...prev, ...messages];
        });
        gainXp(xpGain);
        modifyCredits(creditsGained);
        if (droppedItem) modifyInventory(droppedItem, dropAmount);
        processAchievements();
        setTimeout(() => setGameMode('EXPLORING'), 2500);
      }, 1000);
    } else {
      pveEnemyTurn();
    }
  };

  const handleSwitchCreature = async (newCreature: TuxemonCreature) => {
    if (!isPlayerTurn || isPvp) return;
    useGameStore.setState(state => ({
      player: { ...state.player, activeDaemonId: newCreature.id }
    }));
    setActiveDaemon(newCreature);
    setShowPartyModal(false);
    setIsPlayerTurn(false);
    setLog(prev => [...prev, `Switched active beast to ${newCreature.name}!`]);
    pveEnemyTurn();
  };

  const handleUseItem = (itemId: string) => {
    if (!isPlayerTurn || isPvp) return;
    const invCount = playerState.inventory[itemId] || 0;
    if (invCount <= 0) return;

    if (itemId === 'patch_kit') {
      modifyInventory('patch_kit', -1);
      const healAmount = 30;
      modifyHp(healAmount);
      showFloatingText(`+${healAmount} HP`, '#22c55e', false);
      setLog(prev => [...prev, `Used Patch Kit! Recovered ${healAmount} HP.`]);
      setShowItemModal(false);
      setIsPlayerTurn(false);
      pveEnemyTurn();
    } else if (itemId === 'tuxeball' || itemId === 'saints_ball') {
      setShowItemModal(false);
      handleCatch();
    }
  };

  const handleCatch = () => {
    if (isPvp) return;
    if (!isPlayerTurn || !enemy) return;
    setIsPlayerTurn(false);
    
    setLog(prev => [...prev, `Using Tuxeball...`]);
    setTimeout(() => {
      const catchRate = calculateCatchRate(enemy, enemyHp, enemyMaxHp, null, 'standard');
      const roll = Math.random();
      if (roll < catchRate) {
        setLog(prev => [...prev, `Gotcha! ${enemy.name} was caught!`]);
        catchDaemon(enemy.id);
        processAchievements();
        setTimeout(() => setGameMode('EXPLORING'), 2000);
      } else {
        setLog(prev => [...prev, `Oh no! ${enemy.name} broke free!`]);
        pveEnemyTurn();
      }
    }, 1500);
  };

  // -------------------------------------------------------------
  // PVP ACTIONS
  // -------------------------------------------------------------
  const handlePvpAttack = () => {
    if (!activeBattle || !emitSocketEvent) return;
    
    // Use selected move for PvP
    const playerMoves = activeDaemon.moveset.filter(m => m.level <= 50);
    const playerMove = playerMoves[selectedMove] || playerMoves[0] || { power: 50, type: 'normal', accuracy: 100, name: 'Tackle' };
    
    const dmg = Math.max(1, Math.floor((playerMove.power || 50) * 0.5));
    
    emitSocketEvent('battle_action', {
      battleId: activeBattle.id || activeBattle.battleId,
      action: 'ATTACK',
      damage: dmg,
      move: playerMove.name
    });
  };

  const handleFlee = () => {
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
  const displayEnemyMaxHp = isPvp ? 100 : enemyMaxHp;
  
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
          <div className="w-32 h-32 bg-black rounded flex items-center justify-center overflow-hidden border border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.2)] mb-4 mt-4 relative">
            {enemy?.spriteOverworld ? (
              <img src={enemy.spriteOverworld} alt={enemy.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <span className="text-red-900 text-5xl font-mono">?</span>
            )}
            {floatingTexts.filter(ft => ft.isEnemy).map(ft => (
              <div key={ft.id} className="absolute font-bold text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] animate-out slide-out-to-top-8 fade-out duration-1000" style={{ color: ft.color }}>
                {ft.text}
              </div>
            ))}
          </div>
          <h3 className="text-xl font-bold text-slate-200">{displayEnemyName}</h3>
          {!isPvp && enemy && (
            <div className="text-xs text-slate-400 mt-1">
              {enemy.type_primary}{enemy.type_secondary !== 'none' && ` / ${enemy.type_secondary}`}
            </div>
          )}
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
          <div className="w-32 h-32 bg-black rounded flex items-center justify-center overflow-hidden border border-cyan-900/50 shadow-[0_0_20px_rgba(34,211,238,0.2)] mb-4 mt-4 relative">
            {activeDaemon.spriteBack ? (
              <img src={activeDaemon.spriteBack} alt={activeDaemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <span className="text-cyan-900 text-5xl font-mono">?</span>
            )}
            {floatingTexts.filter(ft => !ft.isEnemy).map(ft => (
              <div key={ft.id} className="absolute font-bold text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] animate-out slide-out-to-top-8 fade-out duration-1000" style={{ color: ft.color }}>
                {ft.text}
              </div>
            ))}
          </div>
          <h3 className="text-xl font-bold text-slate-200">{activeDaemon.name}</h3>
          <div className="text-xs text-slate-400 mt-1">
            {activeDaemon.type_primary}{activeDaemon.type_secondary !== 'none' && ` / ${activeDaemon.type_secondary}`}
          </div>
        </div>
      </div>

      {/* Combat Log */}
      <div ref={logRef} className="h-24 bg-black border border-slate-700 rounded p-3 overflow-y-auto mb-4 font-mono text-sm text-slate-300 flex flex-col space-y-1">
        {currentLog.map((entry: string, idx: number) => (
          <div key={idx}>{">"} {entry}</div>
        ))}
      </div>

      {/* Move Selection */}
      {!isPvp && activeDaemon.moveset.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2">Select Move:</div>
          <div className="grid grid-cols-2 gap-2">
            {activeDaemon.moveset.slice(0, 4).map((move, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedMove(idx)}
                className={`p-2 text-xs rounded border ${
                  selectedMove === idx
                    ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400'
                }`}
              >
                {move.name}
                <div className="text-[10px] opacity-70">
                  {move.power ? `PWR:${move.power}` : ''} {move.type}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="grid grid-cols-5 gap-2">
        <button 
          onClick={isPvp ? handlePvpAttack : handlePveAttack} 
          disabled={!isMyTurn}
          className={`p-3 border rounded font-bold text-xs tracking-wider transition-colors ${isMyTurn ? 'bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900/50' : 'bg-slate-900/40 text-slate-600 border-slate-800'}`}
        >
          ATTACK
        </button>
        <button 
          onClick={handleCatch} 
          disabled={!isMyTurn || isPvp}
          className={`p-3 border rounded font-bold text-xs tracking-wider transition-colors ${(!isMyTurn || isPvp) ? 'bg-slate-900/40 text-slate-600 border-slate-800' : 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border-cyan-900/50'}`}
        >
          CAPTURE
        </button>
        <button 
          onClick={() => setShowPartyModal(true)} 
          disabled={!isMyTurn || isPvp}
          className={`p-3 border rounded font-bold text-xs tracking-wider transition-colors ${(!isMyTurn || isPvp) ? 'bg-slate-900/40 text-slate-600 border-slate-800' : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-400 border-purple-900/50'}`}
        >
          PARTY
        </button>
        <button 
          onClick={() => setShowItemModal(true)} 
          disabled={!isMyTurn || isPvp}
          className={`p-3 border rounded font-bold text-xs tracking-wider transition-colors ${(!isMyTurn || isPvp) ? 'bg-slate-900/40 text-slate-600 border-slate-800' : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border-emerald-900/50'}`}
        >
          ITEMS
        </button>
        <button 
          onClick={handleFlee} 
          disabled={!isMyTurn && !isPvp}
          className="p-3 border rounded font-bold text-xs tracking-wider transition-colors bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 border-slate-700/50"
        >
          FLEE
        </button>
      </div>

      {/* Party Selection Modal */}
      {showPartyModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-purple-500/40 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold text-purple-300 mb-3 flex justify-between items-center">
              <span>SELECT BEAST TO DEPLOY</span>
              <button onClick={() => setShowPartyModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {caughtList.length === 0 ? (
                <div className="text-slate-400 text-sm italic">No other beasts caught yet!</div>
              ) : (
                caughtList.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSwitchCreature(c)}
                    disabled={c.id === activeDaemon.id}
                    className={`w-full p-2 rounded border flex items-center justify-between text-left ${
                      c.id === activeDaemon.id
                        ? 'bg-purple-950/20 border-purple-900/40 opacity-50 cursor-not-allowed'
                        : 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-700">
                        {c.spriteOverworld ? (
                          <img src={c.spriteOverworld} alt={c.name} className="w-full h-full object-cover pixelated" />
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">?</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.type_primary} {c.type_secondary !== 'none' && `/ ${c.type_secondary}`}</div>
                      </div>
                    </div>
                    {c.id === activeDaemon.id ? (
                      <span className="text-xs text-purple-400 font-mono">[ACTIVE]</span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-mono">DEPLOY</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Usage Modal */}
      {showItemModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold text-emerald-300 mb-3 flex justify-between items-center">
              <span>SELECT ITEM TO USE</span>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <button
                onClick={() => handleUseItem('patch_kit')}
                disabled={(playerState.inventory['patch_kit'] || 0) <= 0}
                className={`w-full p-2.5 rounded border flex items-center justify-between ${
                  (playerState.inventory['patch_kit'] || 0) > 0
                    ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700 text-slate-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Patch Kit</div>
                  <div className="text-[10px] text-slate-400">Restores 30 HP to active beast</div>
                </div>
                <span className="font-mono text-sm text-emerald-400">x{playerState.inventory['patch_kit'] || 0}</span>
              </button>

              <button
                onClick={() => handleUseItem('tuxeball')}
                disabled={(playerState.inventory['tuxeball'] || 0) <= 0 && (playerState.inventory['saints_ball'] || 0) <= 0}
                className={`w-full p-2.5 rounded border flex items-center justify-between ${
                  ((playerState.inventory['tuxeball'] || 0) > 0 || (playerState.inventory['saints_ball'] || 0) > 0)
                    ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700 text-slate-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Tuxeball</div>
                  <div className="text-[10px] text-slate-400">Attempt to capture wild beast</div>
                </div>
                <span className="font-mono text-sm text-cyan-400">x{(playerState.inventory['tuxeball'] || 0) + (playerState.inventory['saints_ball'] || 0)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}