"use client";

/**
 * HUD — heads-up display overlay for the overworld
 * Shows party HP, coins, XP, and current map name
 */
import { useGameStore } from "@/lib/game/store";

export default function HUD() {
  const party = useGameStore((s) => s.party);
  const coins = useGameStore((s) => s.coins);
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.level);
  const currentMap = useGameStore((s) => s.currentMap);
  const speciesCaught = useGameStore((s) => s.speciesCaught);

  return (
    <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="flex items-start justify-between p-4">
        {/* Party HP bars */}
        <div className="space-y-1 pointer-events-auto">
          {party.length > 0 ? (
            party.map((monster) => (
              <div key={monster.id} className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 min-w-[200px]">
                <span className="text-white text-sm font-bold truncate max-w-[80px]">
                  {monster.name}
                </span>
                <span className="text-gray-400 text-xs">Lv{monster.level}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(monster.currentHp / monster.maxHp) * 100}%`,
                      backgroundColor:
                        monster.currentHp / monster.maxHp > 0.5
                          ? "#22c55e"
                          : monster.currentHp / monster.maxHp > 0.2
                          ? "#eab308"
                          : "#ef4444",
                    }}
                  />
                </div>
                <span className="text-gray-400 text-xs whitespace-nowrap">
                  {monster.currentHp}/{monster.maxHp}
                </span>
              </div>
            ))
          ) : (
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-gray-500 text-sm">
              No Tuxemon in party
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 text-right space-y-1 pointer-events-auto">
          {currentMap && (
            <div className="text-blue-400 text-sm font-bold">{currentMap.name}</div>
          )}
          <div className="text-yellow-400 text-sm">🪙 {coins}</div>
          <div className="text-green-400 text-sm">⭐ XP: {xp} | Lv: {level}</div>
          <div className="text-purple-400 text-sm">📖 {speciesCaught.length} caught</div>
        </div>
      </div>
    </div>
  );
}