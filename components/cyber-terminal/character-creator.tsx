"use client";

import { useState } from "react";
import { createGameCharacter } from "@/app/actions/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Skull, Sparkles, Wrench, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { INITIAL_SKILLS } from "./store";

const SPRITES = [
  { id: "hero_male", label: "Agent", icon: User },
  { id: "mage_1", label: "Hacker", icon: Zap },
  { id: "villager_1", label: "Wanderer", icon: Sparkles },
  { id: "assassin", label: "Phantom", icon: Skull },
];

const CLASSES = [
  {
    id: "BRAWLER",
    name: "The Brawler",
    desc: "A frontline fighter with unmatched raw damage output.",
    bonuses: { Attack: 15, Strength: 10, Constitution: 5 },
    icon: Shield
  },
  {
    id: "INVOKER",
    name: "The Invoker",
    desc: "A mystical tactician specializing in summoning algorithms.",
    bonuses: { Summoning: 15, Magic: 10, Defence: 5 },
    icon: Sparkles
  },
  {
    id: "RANGER",
    name: "The Ranger",
    desc: "A swift and deadly scout who strikes from the shadows.",
    bonuses: { Ranged: 15, Agility: 10, Hunter: 5 },
    icon: Zap
  },
  {
    id: "ARTISAN",
    name: "The Artisan",
    desc: "A master of creation, building tools and weapons.",
    bonuses: { Crafting: 15, Smithing: 10, Mining: 5 },
    icon: Wrench
  },
  {
    id: "CYBER",
    name: "The Cybermancer",
    desc: "Blends arcane magic with heavy technological combat.",
    bonuses: { Magic: 10, Attack: 10, Defence: 10 },
    icon: Sparkles
  },
  {
    id: "SURVIVOR",
    name: "The Survivor",
    desc: "Extremely resilient with high health and stamina.",
    bonuses: { Constitution: 15, Defence: 10, Agility: 5 },
    icon: Shield
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
      position: { x: 1, y: 1 }, // Start at coordinates 1,1
      level: 1,
      xp: 0,
      hp: 100 + (initialSkills['Constitution']?.level || 1) * 10,
      maxHp: 100 + (initialSkills['Constitution']?.level || 1) * 10,
      credits: 1000, // Boosted starting credits
      inventory: { 'capture_script': 10, 'patch_kit': 5 },
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
      toast.success("Character Created Successfully!");
      // Allow slight delay before booting into the game
      setTimeout(() => {
        onComplete();
      }, 500);
    } else {
      toast.error(result.error || "Failed to create character. Ensure database is running.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 bg-zinc-950/90 border border-emerald-500/30 rounded-xl text-emerald-50 shadow-[0_0_50px_rgba(16,185,129,0.1)] backdrop-blur-md font-mono mt-4 md:mt-12 overflow-y-auto max-h-[90vh]">
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-emerald-400 text-center animate-pulse">SAINTS TAMER MMO</h1>
      <p className="text-emerald-500/70 text-center mb-8">Character Registration Terminal</p>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-bold text-emerald-400 mb-2">CHARACTER NAME</label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="bg-black/50 border-emerald-500/50 text-emerald-50 focus-visible:ring-emerald-500 font-bold text-lg h-14"
            placeholder="Enter Name..."
            maxLength={16}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-emerald-400 mb-2">SELECT AVATAR</label>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {SPRITES.map(sprite => {
              const Icon = sprite.icon;
              return (
                <div 
                  key={sprite.id}
                  onClick={() => setSpriteId(sprite.id)}
                  className={`p-4 rounded-lg cursor-pointer border-2 transition-all shrink-0 w-32 flex flex-col items-center gap-2 ${spriteId === sprite.id ? 'border-emerald-400 bg-emerald-950/50 shadow-[0_0_15px_rgba(52,211,153,0.3)] scale-105' : 'border-zinc-800 bg-black hover:border-emerald-700'}`}
                >
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 shadow-inner">
                    <Icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-xs text-center font-bold text-emerald-200">{sprite.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-emerald-400 mb-2">SELECT STARTING CLASS</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CLASSES.map(c => {
              const Icon = c.icon;
              return (
                <div 
                  key={c.id}
                  onClick={() => setClassId(c.id)}
                  className={`p-4 rounded-lg cursor-pointer border-2 transition-all flex flex-col gap-2 ${classId === c.id ? 'border-emerald-400 bg-emerald-950/80 shadow-[0_0_15px_rgba(52,211,153,0.3)] transform scale-[1.02]' : 'border-zinc-800 bg-black hover:border-emerald-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-emerald-300">{c.name}</h3>
                  </div>
                  <p className="text-xs text-emerald-500/80 flex-grow">{c.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(c.bonuses).map(([skill, lvl]) => (
                      <span key={skill} className="text-[10px] font-bold bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
                        {skill} +{lvl as number}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button 
          disabled={loading || name.length < 3} 
          onClick={handleCreate}
          className="w-full h-16 mt-8 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-black shadow-[0_0_20px_rgba(5,150,105,0.4)] transition-all disabled:opacity-50 uppercase tracking-widest"
        >
          {loading ? "INITIALIZING SEQUENCE..." : "INITIALIZE CHARACTER"}
        </Button>
      </div>
    </div>
  );
}
