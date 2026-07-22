"use client";

/**
 * BattleScene — turn-based combat UI
 * Displays player monster vs enemy monster with HP bars, moves, and actions
 */
import { useState } from "react";
import { useGameStore, type BattleMonster, type BattleMove } from "@/lib/game/store";

export default function BattleScene() {
  const battle = useGameStore((s) => s.battle);
  const updateBattle = useGameStore((s) => s.updateBattle);
  const endBattle = useGameStore((s) => s.endBattle);
  const phase = useGameStore((s) => s.phase);

  const [_selectedMove, setSelectedMove] = useState<number>(0);
  const [showMoves, setShowMoves] = useState(false);

  if (!battle || (phase !== "wild_encounter" && phase !== "trainer_battle")) {
    return null;
  }

  const { playerMonster, enemyMonster, isWild, log } = battle;

  const handleFight = () => {
    setShowMoves(true);
  };

  const handleMoveSelect = (moveIndex: number) => {
    setSelectedMove(moveIndex);
    executePlayerTurn(moveIndex);
  };

  const executePlayerTurn = (moveIndex: number) => {
    const move = playerMonster.moves[moveIndex];
    if (!move) return;

    // Calculate damage (simplified)
    const damage = calculateDamage(playerMonster, enemyMonster, move);
    const newEnemyHp = Math.max(0, enemyMonster.currentHp - damage);

    // Update battle state
    const updatedEnemy = { ...enemyMonster, currentHp: newEnemyHp };
    const newLog = [...log, `${playerMonster.name} used ${move.name}! Dealt ${damage} damage.`];

    if (newEnemyHp === 0) {
      // Enemy fainted
      newLog.push(`${enemyMonster.name} fainted!`);
      const xpGained = enemyMonster.level * 10;
      updateBattle({
        enemyMonster: updatedEnemy,
        log: newLog,
        phase: "result",
        result: "win",
        xpGained,
      });
      return;
    }

    // Enemy turn
    setTimeout(() => {
      executeEnemyTurn(updatedEnemy, newLog);
    }, 1000);

    updateBattle({
      enemyMonster: updatedEnemy,
      log: newLog,
      phase: "enemy_turn",
    });
    setShowMoves(false);
  };

  const executeEnemyTurn = (currentEnemy: BattleMonster, currentLog: string[]) => {
    // Enemy picks a random move
    const enemyMoves = currentEnemy.moves.filter((m) => m.pp > 0);
    if (enemyMoves.length === 0) {
      // No moves left, skip turn
      updateBattle({
        phase: "player_turn",
        log: [...currentLog, `${currentEnemy.name} has no moves left!`],
      });
      return;
    }

    const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)];
    const damage = calculateDamage(currentEnemy, playerMonster, enemyMove);
    const newPlayerHp = Math.max(0, playerMonster.currentHp - damage);

    const updatedPlayer = { ...playerMonster, currentHp: newPlayerHp };
    const newLog = [...currentLog, `${currentEnemy.name} used ${enemyMove.name}! Dealt ${damage} damage.`];

    if (newPlayerHp === 0) {
      newLog.push(`${playerMonster.name} fainted!`);
      updateBattle({
        playerMonster: updatedPlayer,
        log: newLog,
        phase: "result",
        result: "lose",
      });
      return;
    }

    updateBattle({
      playerMonster: updatedPlayer,
      log: newLog,
      phase: "player_turn",
    });
  };

  const handleRun = () => {
    if (!isWild) {
      updateBattle({
        log: [...log, "Can't run from a trainer battle!"],
      });
      return;
    }

    // 50% chance to run
    if (Math.random() < 0.5) {
      updateBattle({
        log: [...log, "Got away safely!"],
        phase: "result",
        result: "flee",
      });
    } else {
      updateBattle({
        log: [...log, "Couldn't escape!"],
        phase: "enemy_turn",
      });
      setTimeout(() => {
        executeEnemyTurn(enemyMonster, [...log, "Couldn't escape!"]);
      }, 1000);
    }
  };

  const handleFinish = () => {
    endBattle();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-200 to-green-200 flex flex-col">
      {/* Battle field */}
      <div className="flex-1 relative p-8">
        {/* Enemy monster */}
        <div className="absolute top-8 right-8 text-right">
          <div className="bg-white/90 rounded-lg p-4 shadow-lg mb-2">
            <div className="font-bold text-lg">{enemyMonster.name}</div>
            <div className="text-sm text-gray-600">Lv.{enemyMonster.level}</div>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">HP</span>
                <div className="flex-1 bg-gray-300 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(enemyMonster.currentHp / enemyMonster.maxHp) * 100}%`,
                      backgroundColor: getHpColor(enemyMonster.currentHp, enemyMonster.maxHp),
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-right mt-1">
                {enemyMonster.currentHp}/{enemyMonster.maxHp}
              </div>
            </div>
          </div>
          <div className="text-6xl">👾</div>
        </div>

        {/* Player monster */}
        <div className="absolute bottom-8 left-8">
          <div className="text-6xl mb-2">🐉</div>
          <div className="bg-white/90 rounded-lg p-4 shadow-lg">
            <div className="font-bold text-lg">{playerMonster.name}</div>
            <div className="text-sm text-gray-600">Lv.{playerMonster.level}</div>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">HP</span>
                <div className="flex-1 bg-gray-300 rounded-full h-4 overflow-hidden w-48">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(playerMonster.currentHp / playerMonster.maxHp) * 100}%`,
                      backgroundColor: getHpColor(playerMonster.currentHp, playerMonster.maxHp),
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-right mt-1">
                {playerMonster.currentHp}/{playerMonster.maxHp}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Battle menu */}
      <div className="bg-gray-900 text-white p-6 min-h-[200px]">
        {battle.phase === "result" ? (
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">
              {battle.result === "win" && "You won!"}
              {battle.result === "lose" && "You lost..."}
              {battle.result === "flee" && "Escaped safely!"}
            </div>
            {battle.result === "win" && (
              <div className="text-lg mb-4">
                Gained {battle.xpGained} XP!
              </div>
            )}
            <button
              onClick={handleFinish}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg"
            >
              Continue
            </button>
          </div>
        ) : showMoves ? (
          <div>
            <div className="text-lg font-bold mb-4">Choose a move:</div>
            <div className="grid grid-cols-2 gap-3">
              {playerMonster.moves.map((move, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMoveSelect(idx)}
                  disabled={move.pp === 0}
                  className="p-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 rounded-lg text-left"
                >
                  <div className="font-bold">{move.name}</div>
                  <div className="text-sm text-gray-400">
                    {move.type} | PP: {move.pp}/{move.maxPp}
                    {move.power && ` | Power: ${move.power}`}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMoves(false)}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Back
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 h-20 overflow-y-auto">
              {log.slice(-3).map((line, idx) => (
                <div key={idx} className="text-lg">{line}</div>
              ))}
            </div>
            {battle.phase === "player_turn" && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleFight}
                  className="p-4 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-lg"
                >
                  Fight
                </button>
                <button
                  onClick={handleRun}
                  className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-lg"
                >
                  Run
                </button>
              </div>
            )}
            {battle.phase === "enemy_turn" && (
              <div className="text-center text-lg">Enemy is attacking...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function calculateDamage(
  attacker: BattleMonster,
  defender: BattleMonster,
  move: BattleMove
): number {
  if (!move.power) return 0;

  // Simplified damage formula
  const baseDamage = move.power;
  const _levelFactor = (2 * attacker.level) / 5 + 2;
  const randomFactor = 0.85 + Math.random() * 0.15;

  return Math.max(1, Math.floor(baseDamage * randomFactor));
}

function getHpColor(current: number, max: number): string {
  const ratio = current / max;
  if (ratio > 0.5) return "#22c55e";
  if (ratio > 0.2) return "#eab308";
  return "#ef4444";
}