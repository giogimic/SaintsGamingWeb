"use client";

import { useState } from "react";
import { createGameCharacter } from "@/app/actions/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { toast } from "sonner";
import { INITIAL_SKILLS } from "./store";

const SPRITES = [
  { id: "hero_male", label: "Male Adventurer" },
  { id: "hero_female", label: "Female Adventurer" },
  { id: "villager_1", label: "Villager" },
  { id: "mage_1", label: "Apprentice" },
];

const CLASSES = [
  {
    id: "BRAWLER",
    name: "The Brawler",
    desc: "Starts with high Attack and Strength.",
    bonuses: { Attack: 10, Strength: 10, Constitution: 5 }
  },
  {
    id: "INVOKER",
    name: "The Invoker",
    desc: "Starts with high Summoning and Magic.",
    bonuses: { Summoning: 10, Magic: 10, Defence: 5 }
  },
  {
    id: "RANGER",
    name: "The Ranger",
    desc: "Starts with high Ranged and Agility.",
    bonuses: { Ranged: 10, Agility: 10, Hunter: 5 }
  },
  {
    id: "ARTISAN",
    name: "The Artisan",
    desc: "Starts with high Crafting, Smithing, and Mining.",
    bonuses: { Crafting: 10, Smithing: 10, Mining: 5 }
  }
];

export function CharacterCreator({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState("");
  const [spriteId, setSpriteId] = useState(SPRITES[0].id);
  const [classId, setClassId] = useState(CLASSES[0].id);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || name.length < 3) {
      toast.error("Name must be at least 3 characters.");
      return;
    }

    setLoading(true);

    const selectedClass = CLASSES.find(c => c.id === classId);
    
    // Construct initial skills with class bonuses
    const initialSkills = JSON.parse(JSON.stringify(INITIAL_SKILLS));
    if (selectedClass) {
      Object.entries(selectedClass.bonuses).forEach(([skill, level]) => {
        if (initialSkills[skill]) {
          initialSkills[skill].level = level;
        }
      });
    }

    const initialState = {
      position: { x: 15, y: 16 },
      level: 1,
      xp: 0,
      hp: 100,
      maxHp: 100,
      credits: 500,
      inventory: { 'capture_script': 5, 'patch_kit': 3 },
      skills: initialSkills,
      equipment: { head: null, chest: 'bronze_chestplate', legs: 'bronze_leggings', weapon: 'bronze_sword' },
      combatStyle: 'MELEE',
      activeDaemonId: 'd-001',
      saintRank: 'Rookie',
      caughtDaemons: ['d-001'],
      assignedBeasts: { furnace: null, farm: null, fishing_hut: null }
    };

    const result = await createGameCharacter({
      name,
      spriteId,
      classId,
      initialState: JSON.stringify(initialState)
    });

    if (result.success) {
      toast.success("Character Created!");
      // Boot into game
      onComplete();
    } else {
      toast.error(result.error || "Failed to create character.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-zinc-950/90 border border-emerald-500/30 rounded-xl text-emerald-50 shadow-2xl backdrop-blur-md font-mono mt-12">
      <h1 className="text-3xl font-bold mb-2 text-emerald-400 text-center">SAINTS TAMER MMO</h1>
      <p className="text-emerald-500/70 text-center mb-8">Character Registration Terminal</p>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-bold text-emerald-400 mb-2">CHARACTER NAME</label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="bg-black/50 border-emerald-500/50 text-emerald-50 focus-visible:ring-emerald-500 font-bold text-lg"
            placeholder="Enter Name..."
            maxLength={16}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-emerald-400 mb-2">SELECT SPRITE</label>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {SPRITES.map(sprite => (
              <div 
                key={sprite.id}
                onClick={() => setSpriteId(sprite.id)}
                className={`p-4 rounded-lg cursor-pointer border-2 transition-all shrink-0 w-32 flex flex-col items-center gap-2 ${spriteId === sprite.id ? 'border-emerald-400 bg-emerald-950/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-zinc-800 bg-black hover:border-emerald-700'}`}
              >
                <div className="w-16 h-16 bg-zinc-900 rounded flex items-center justify-center border border-zinc-800">
                  <Image src={`/assets/npcs/${sprite.id}.png`} alt={sprite.label} width={32} height={32} className="pixelated" unoptimized onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <p className="text-xs text-center font-bold">{sprite.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-emerald-400 mb-2">SELECT STARTING CLASS</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLASSES.map(c => (
              <div 
                key={c.id}
                onClick={() => setClassId(c.id)}
                className={`p-4 rounded-lg cursor-pointer border-2 transition-all flex flex-col gap-1 ${classId === c.id ? 'border-emerald-400 bg-emerald-950/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-zinc-800 bg-black hover:border-emerald-700'}`}
              >
                <h3 className="font-bold text-emerald-300">{c.name}</h3>
                <p className="text-xs text-emerald-500/70">{c.desc}</p>
                <div className="flex gap-2 mt-2">
                  {Object.entries(c.bonuses).map(([skill, lvl]) => (
                    <span key={skill} className="text-[10px] bg-emerald-900/50 text-emerald-200 px-2 py-1 rounded">
                      {skill} Lvl {lvl as number}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button 
          disabled={loading || name.length < 3} 
          onClick={handleCreate}
          className="w-full h-16 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-black shadow-[0_0_20px_rgba(5,150,105,0.4)] transition-all disabled:opacity-50"
        >
          {loading ? "INITIALIZING..." : "ENTER WORLD"}
        </Button>
      </div>
    </div>
  );
}
