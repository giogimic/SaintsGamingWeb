/**
 * Game State Store — Zustand
 * Central state management for the Tuxemon game engine
 */
import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────

export type GamePhase =
  | "loading"
  | "overworld"
  | "wild_encounter"
  | "trainer_battle"
  | "dialogue"
  | "menu"
  | "map_editor";

export type Direction = "up" | "down" | "left" | "right";

export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Position;
  direction: Direction;
  moving: boolean;
  spriteFrame: number;
}

export interface BattleMove {
  techniqueSlug: string;
  name: string;
  type: string;
  pp: number;
  maxPp: number;
  power: number | null;
  accuracy: number | null;
}

export interface BattleMonster {
  id: string;
  speciesSlug: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  types: string[];
  moves: BattleMove[];
  spriteFront: string;
  spriteBack: string;
  status: string | null;
  xp: number;
}

export interface BattleState {
  phase: "intro" | "player_turn" | "enemy_turn" | "animate" | "result";
  playerMonster: BattleMonster;
  enemyMonster: BattleMonster;
  isWild: boolean;
  turnCount: number;
  log: string[];
  result: "win" | "lose" | "capture" | "flee" | null;
  xpGained: number;
  coinsGained: number;
}

export interface DialogueState {
  npcId: string;
  npcName: string;
  lines: string[];
  currentLine: number;
  choices?: { text: string; action: string }[];
}

export interface NPCData {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
  direction: Direction;
  dialogue?: string[];
  isTrainer?: boolean;
  party?: string[]; // monster slugs
}

export interface GateData {
  x: number;
  y: number;
  width: number;
  height: number;
  targetMap: string;
  targetX: number;
  targetY: number;
}

export interface MapData {
  slug: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
  collision: boolean[][];
  npcs: NPCData[];
  gates: GateData[];
  encounterZone?: string;
  music?: string;
  environment?: string;
}

// ─── Store ───────────────────────────────────────────────────────

interface GameState {
  // Meta
  phase: GamePhase;
  userId: string | null;

  // Player
  player: PlayerState;
  currentMap: MapData | null;

  // Battle
  battle: BattleState | null;

  // Dialogue
  dialogue: DialogueState | null;

  // Inventory (item slug → quantity)
  inventory: Record<string, number>;

  // Party (player's Tuxemon)
  party: BattleMonster[];

  // Stats
  coins: number;
  xp: number;
  level: number;
  speciesCaught: string[];
  battlesWon: number;

  // Actions
  setPhase: (phase: GamePhase) => void;
  setUserId: (id: string | null) => void;
  setPlayer: (update: Partial<PlayerState>) => void;
  setCurrentMap: (map: MapData | null) => void;
  startBattle: (enemy: BattleMonster, isWild: boolean) => void;
  updateBattle: (update: Partial<BattleState>) => void;
  endBattle: () => void;
  startDialogue: (dialogue: DialogueState) => void;
  advanceDialogue: () => void;
  endDialogue: () => void;
  addToInventory: (itemSlug: string, qty: number) => void;
  removeFromInventory: (itemSlug: string, qty: number) => void;
  addToParty: (monster: BattleMonster) => void;
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  recordCapture: (speciesSlug: string) => void;
  reset: () => void;
}

const initialState = {
  phase: "loading" as GamePhase,
  userId: null as string | null,
  player: {
    position: { x: 5, y: 5 },
    direction: "down" as Direction,
    moving: false,
    spriteFrame: 0,
  },
  currentMap: null as MapData | null,
  battle: null as BattleState | null,
  dialogue: null as DialogueState | null,
  inventory: {} as Record<string, number>,
  party: [] as BattleMonster[],
  coins: 0,
  xp: 0,
  level: 1,
  speciesCaught: [] as string[],
  battlesWon: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setUserId: (id) => set({ userId: id }),

  setPlayer: (update) =>
    set((s) => ({ player: { ...s.player, ...update } })),

  setCurrentMap: (map) => set({ currentMap: map }),

  startBattle: (enemy, isWild) => {
    const party = get().party;
    const playerMonster = party.find((m) => m.currentHp > 0) || party[0];
    if (!playerMonster) return;

    set({
      phase: isWild ? "wild_encounter" : "trainer_battle",
      battle: {
        phase: "intro",
        playerMonster: { ...playerMonster },
        enemyMonster: { ...enemy },
        isWild,
        turnCount: 0,
        log: [`A wild ${enemy.name} appeared!`],
        result: null,
        xpGained: 0,
        coinsGained: 0,
      },
    });
  },

  updateBattle: (update) =>
    set((s) => ({
      battle: s.battle ? { ...s.battle, ...update } : null,
    })),

  endBattle: () => {
    const battle = get().battle;
    if (!battle) return;

    // Sync battle results back to party
    if (battle.result === "win" || battle.result === "capture") {
      set((s) => ({
        battlesWon: s.battlesWon + 1,
        xp: s.xp + battle.xpGained,
        coins: s.coins + battle.coinsGained,
      }));
    }

    // Update player monster HP in party
    const party = get().party.map((m) =>
      m.id === battle.playerMonster.id
        ? { ...m, currentHp: battle.playerMonster.currentHp }
        : m
    );

    set({
      party,
      battle: null,
      phase: "overworld",
    });
  },

  startDialogue: (dialogue) => {
    set({ phase: "dialogue", dialogue });
  },

  advanceDialogue: () => {
    const d = get().dialogue;
    if (!d) return;
    if (d.currentLine < d.lines.length - 1) {
      set({ dialogue: { ...d, currentLine: d.currentLine + 1 } });
    } else {
      get().endDialogue();
    }
  },

  endDialogue: () => {
    set({ phase: "overworld", dialogue: null });
  },

  addToInventory: (itemSlug, qty) =>
    set((s) => ({
      inventory: {
        ...s.inventory,
        [itemSlug]: (s.inventory[itemSlug] || 0) + qty,
      },
    })),

  removeFromInventory: (itemSlug, qty) =>
    set((s) => {
      const current = s.inventory[itemSlug] || 0;
      const newQty = Math.max(0, current - qty);
      const inv = { ...s.inventory };
      if (newQty === 0) delete inv[itemSlug];
      else inv[itemSlug] = newQty;
      return { inventory: inv };
    }),

  addToParty: (monster) =>
    set((s) => ({
      party: s.party.length < 6 ? [...s.party, monster] : s.party,
    })),

  addXp: (amount) => set((s) => ({ xp: s.xp + amount })),
  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

  recordCapture: (speciesSlug) =>
    set((s) => ({
      speciesCaught: s.speciesCaught.includes(speciesSlug)
        ? s.speciesCaught
        : [...s.speciesCaught, speciesSlug],
    })),

  reset: () => set(initialState),
}));