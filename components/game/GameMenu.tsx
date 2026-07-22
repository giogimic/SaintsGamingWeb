"use client";

/**
 * GameMenu — pause menu overlay with Party, Inventory, Tuxepedia, Save, Options
 */
import { useState } from "react";
import { useGameStore } from "@/lib/game/store";

interface GameMenuProps {
  onClose: () => void;
}

type MenuTab = "main" | "party" | "inventory" | "tuxepedia" | "save";

export default function GameMenu({ onClose }: GameMenuProps) {
  const [tab, setTab] = useState<MenuTab>("main");
  const party = useGameStore((s) => s.party);
  const inventory = useGameStore((s) => s.inventory);
  const speciesCaught = useGameStore((s) => s.speciesCaught);
  const coins = useGameStore((s) => s.coins);
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.level);
  const battlesWon = useGameStore((s) => s.battlesWon);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 border-2 border-gray-600 rounded-xl w-[600px] max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-white font-bold text-xl">Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-700">
          {(["main", "party", "inventory", "tuxepedia"] as MenuTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 text-sm font-medium capitalize ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {t === "main" ? "Status" : t === "tuxepedia" ? "Saints Dex" : t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {tab === "main" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Level</div>
                  <div className="text-white text-2xl font-bold">{level}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">XP</div>
                  <div className="text-white text-2xl font-bold">{xp}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Coins</div>
                  <div className="text-yellow-400 text-2xl font-bold">{coins}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Battles Won</div>
                  <div className="text-white text-2xl font-bold">{battlesWon}</div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Species Caught</div>
                <div className="text-purple-400 text-2xl font-bold">{speciesCaught.length}</div>
              </div>
            </div>
          )}

          {tab === "party" && (
            <div className="space-y-3">
              {party.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No Beasts in your party yet. Catch some!
                </div>
              ) : (
                party.map((monster) => (
                  <div key={monster.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                    <div className="text-4xl">🐉</div>
                    <div className="flex-1">
                      <div className="text-white font-bold">{monster.name}</div>
                      <div className="text-gray-400 text-sm">
                        Lv.{monster.level} | {monster.types.join("/")}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500">HP</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(monster.currentHp / monster.maxHp) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {monster.currentHp}/{monster.maxHp}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "inventory" && (
            <div className="space-y-2">
              {Object.keys(inventory).length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  Your bag is empty.
                </div>
              ) : (
                Object.entries(inventory).map(([slug, qty]) => (
                  <div key={slug} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <div className="text-white capitalize">{slug.replace(/_/g, " ")}</div>
                    <div className="text-gray-400">×{qty}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "tuxepedia" && (
            <div>
              <div className="text-gray-400 text-sm mb-3">
                {speciesCaught.length} species registered
              </div>
              {speciesCaught.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No species caught yet.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {speciesCaught.map((slug) => (
                    <div key={slug} className="bg-gray-800 rounded-lg p-2 text-center">
                      <div className="text-2xl">🐾</div>
                      <div className="text-white text-xs capitalize truncate">
                        {slug.replace(/_/g, " ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}