/**
 * Tuxemon Battle Scene - WebGL-based battle rendering with PixiJS
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Text, Graphics } from 'pixi.js';
import { BattleMonster, calculateDamage, attemptCapture } from '@/lib/game/battle-engine';

interface BattleSceneProps {
  playerMonster: BattleMonster;
  enemyMonster: BattleMonster;
  onBattleEnd: (result: 'win' | 'lose' | 'capture' | 'flee') => void;
}

export default function TuxemonBattleScene({ playerMonster, enemyMonster, onBattleEnd }: BattleSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>(['Battle started!']);
  const [currentPhase, setCurrentPhase] = useState<'player_turn' | 'enemy_turn' | 'animating' | 'result'>('player_turn');
  const [showMoves, setShowMoves] = useState(false);
  const [playerHp, setPlayerHp] = useState(playerMonster.currentHp);
  const [enemyHp, setEnemyHp] = useState(enemyMonster.currentHp);

  useEffect(() => {
    if (!canvasRef.current) return;

    let app: Application | null = null;
    try {
      const pixiSettings = (require('pixi.js') as any).settings;
      if (pixiSettings && 'CHECK_MAX_IF_STATEMENTS_IN_SHADER' in pixiSettings) {
        pixiSettings.CHECK_MAX_IF_STATEMENTS_IN_SHADER = false;
      }

      app = new Application({
        view: canvasRef.current,
        width: 800,
        height: 600,
        backgroundColor: 0x87ceeb, // Sky blue
        resolution: window.devicePixelRatio || 1,
        antialias: true,
      });
    } catch (e) {
      console.warn('WebGL init warning in TuxemonBattleScene:', e);
      try {
        app = new Application({
          view: canvasRef.current,
          width: 800,
          height: 600,
          backgroundColor: 0x87ceeb,
          forceCanvas: true,
        });
      } catch (err2) {
        console.error('Fallback canvas init failed:', err2);
        return;
      }
    }

    if (!app) return;
    appRef.current = app;

    // Create battle scene layers
    const backgroundLayer = new Container();
    const monsterLayer = new Container();
    const uiLayer = new Container();

    app.stage.addChild(backgroundLayer);
    app.stage.addChild(monsterLayer);
    app.stage.addChild(uiLayer);

    // Draw battle background
    const background = new Graphics();
    background.beginFill(0x87ceeb);
    background.drawRect(0, 0, 800, 400);
    background.endFill();
    background.beginFill(0x90ee90);
    background.drawRect(0, 400, 800, 200);
    background.endFill();
    backgroundLayer.addChild(background);

    // Draw enemy monster (top right)
    const enemySprite = new Graphics();
    enemySprite.beginFill(0xff6b6b);
    enemySprite.drawCircle(0, 0, 50);
    enemySprite.endFill();
    enemySprite.x = 600;
    enemySprite.y = 200;
    monsterLayer.addChild(enemySprite);

    // Enemy HP bar
    const enemyHpBar = new Graphics();
    enemyHpBar.beginFill(0x333333);
    enemyHpBar.drawRect(0, 0, 200, 20);
    enemyHpBar.endFill();
    enemyHpBar.x = 500;
    enemyHpBar.y = 100;
    uiLayer.addChild(enemyHpBar);

    const enemyHpFill = new Graphics();
    enemyHpFill.beginFill(0x00ff00);
    enemyHpFill.drawRect(0, 0, 200, 20);
    enemyHpFill.endFill();
    enemyHpBar.addChild(enemyHpFill);

    // Enemy name and level
    const enemyName = new Text(`${enemyMonster.nickname} Lv.${enemyMonster.level}`, {
      fontSize: 18,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    enemyName.x = 500;
    enemyName.y = 80;
    uiLayer.addChild(enemyName);

    // Draw player monster (bottom left)
    const playerSprite = new Graphics();
    playerSprite.beginFill(0x4ecdc4);
    playerSprite.drawCircle(0, 0, 60);
    playerSprite.endFill();
    playerSprite.x = 200;
    playerSprite.y = 350;
    monsterLayer.addChild(playerSprite);

    // Player HP bar
    const playerHpBar = new Graphics();
    playerHpBar.beginFill(0x333333);
    playerHpBar.drawRect(0, 0, 200, 20);
    playerHpBar.endFill();
    playerHpBar.x = 100;
    playerHpBar.y = 450;
    uiLayer.addChild(playerHpBar);

    const playerHpFill = new Graphics();
    playerHpFill.beginFill(0x00ff00);
    playerHpFill.drawRect(0, 0, 200, 20);
    playerHpFill.endFill();
    playerHpBar.addChild(playerHpFill);

    // Player name and level
    const playerName = new Text(`${playerMonster.nickname} Lv.${playerMonster.level}`, {
      fontSize: 18,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    playerName.x = 100;
    playerName.y = 430;
    uiLayer.addChild(playerName);

    // Cleanup
    return () => {
      app.destroy();
    };
  }, [playerMonster, enemyMonster]);

  // Update HP bars
  useEffect(() => {
    if (!appRef.current) return;

    const playerPercent = playerHp / playerMonster.maxHp;
    const enemyPercent = enemyHp / enemyMonster.maxHp;
    // Log state updates if needed
  }, [playerHp, enemyHp, playerMonster, enemyMonster]);

  const handleAttack = async (moveIndex: number) => {
    if (currentPhase !== 'player_turn') return;

    setCurrentPhase('animating');
    setShowMoves(false);

    const move = playerMonster.moves[moveIndex];
    if (!move) return;

    // Player attacks
    const { damage, effectiveness, critical } = calculateDamage(playerMonster, enemyMonster, move);
    const newEnemyHp = Math.max(0, enemyHp - damage);
    setEnemyHp(newEnemyHp);

    let logMessage = `${playerMonster.nickname} used ${move.name}!`;
    if (critical) logMessage += ' Critical hit!';
    if (effectiveness > 1) logMessage += " It's super effective!";
    if (effectiveness < 1) logMessage += " It's not very effective...";

    setBattleLog(prev => [...prev, logMessage]);

    // Check if enemy fainted
    if (newEnemyHp === 0) {
      setBattleLog(prev => [...prev, `${enemyMonster.nickname} fainted!`]);
      setTimeout(() => {
        onBattleEnd('win');
      }, 2000);
      return;
    }

    // Enemy turn
    setTimeout(() => {
      setCurrentPhase('enemy_turn');
      enemyAttack(newEnemyHp);
    }, 1500);
  };

  const enemyAttack = (currentPlayerHp: number) => {
    // Enemy picks a random move
    const enemyMoves = enemyMonster.moves.filter(m => m.pp > 0);
    if (enemyMoves.length === 0) {
      setBattleLog(prev => [...prev, `${enemyMonster.nickname} has no moves left!`]);
      setTimeout(() => {
        setCurrentPhase('player_turn');
      }, 1500);
      return;
    }

    const move = enemyMoves[Math.floor(Math.random() * enemyMoves.length)];
    const { damage, effectiveness, critical } = calculateDamage(enemyMonster, playerMonster, move);
    const newPlayerHp = Math.max(0, currentPlayerHp - damage);
    setPlayerHp(newPlayerHp);

    let logMessage = `${enemyMonster.nickname} used ${move.name}!`;
    if (critical) logMessage += ' Critical hit!';
    if (effectiveness > 1) logMessage += " It's super effective!";
    if (effectiveness < 1) logMessage += " It's not very effective...";

    setBattleLog(prev => [...prev, logMessage]);

    // Check if player fainted
    if (newPlayerHp === 0) {
      setBattleLog(prev => [...prev, `${playerMonster.nickname} fainted!`]);
      setTimeout(() => {
        onBattleEnd('lose');
      }, 2000);
      return;
    }

    setTimeout(() => {
      setCurrentPhase('player_turn');
    }, 1500);
  };

  const handleCapture = () => {
    if (currentPhase !== 'player_turn') return;

    setCurrentPhase('animating');
    const success = attemptCapture(enemyMonster, 'tuxeball');

    if (success) {
      setBattleLog(prev => [...prev, `Gotcha! ${enemyMonster.nickname} was caught!`]);
      setTimeout(() => {
        onBattleEnd('capture');
      }, 2000);
    } else {
      setBattleLog(prev => [...prev, `Oh no! ${enemyMonster.nickname} broke free!`]);
      setTimeout(() => {
        setCurrentPhase('enemy_turn');
        enemyAttack(playerHp);
      }, 1500);
    }
  };

  const handleRun = () => {
    if (currentPhase !== 'player_turn') return;

    // 50% chance to run
    if (Math.random() < 0.5) {
      setBattleLog(prev => [...prev, 'Got away safely!']);
      setTimeout(() => {
        onBattleEnd('flee');
      }, 1500);
    } else {
      setBattleLog(prev => [...prev, "Can't escape!"]);
      setTimeout(() => {
        setCurrentPhase('enemy_turn');
        enemyAttack(playerHp);
      }, 1500);
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Battle UI Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-white p-4">
        {/* Battle Log */}
        <div className="h-20 overflow-y-auto mb-4 text-sm">
          {battleLog.slice(-3).map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
        </div>

        {/* Action Buttons */}
        {currentPhase === 'player_turn' && !showMoves && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowMoves(true)}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold"
            >
              FIGHT
            </button>
            <button
              onClick={handleCapture}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold"
            >
              CATCH
            </button>
            <button
              onClick={handleRun}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold"
            >
              RUN
            </button>
          </div>
        )}

        {/* Move Selection */}
        {showMoves && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {playerMonster.moves.map((move, i) => (
                <button
                  key={i}
                  onClick={() => handleAttack(i)}
                  disabled={move.pp === 0}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 px-4 py-2 rounded text-sm"
                >
                  <div className="font-bold">{move.name}</div>
                  <div className="text-xs">PP: {move.pp}/{move.maxPp}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMoves(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
            >
              Back
            </button>
          </div>
        )}

        {/* Animating/Enemy Turn */}
        {(currentPhase === 'animating' || currentPhase === 'enemy_turn') && (
          <div className="text-center text-lg font-bold">
            {currentPhase === 'enemy_turn' ? 'Enemy is attacking...' : '...'}
          </div>
        )}
      </div>
    </div>
  );
}