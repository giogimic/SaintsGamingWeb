"use client";

import { useState, useEffect } from "react";
import { createGameCharacter } from "@/app/actions/game";
import { fetchAllGameAssets } from "@/app/actions/game-dev";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Skull, Sparkles, Wrench, Shield, Zap, ArrowLeft, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { INITIAL_SKILLS } from "./store";

const PRESET_SPRITES = [
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

export function CharacterCreator({ onComplete, onCancel }: { onComplete: (characterId: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [spriteId, setSpriteId] = useState(PRESET_SPRITES[0].id);
  const [classId, setClassId] = useState(CLASSES[0].id);
  const [customAssets, setCustomAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      const res = await fetchAllGameAssets();
      if (res.success && res.data) {
        setCustomAssets(res.data);
      }
    }
    loadAssets();
  }, []);

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
      position: { x: 1, y: 1 },
      level: 1,
      xp: 0,
      hp: 100 + (initialSkills['Constitution']?.level || 1) * 10,
      maxHp: 100 + (initialSkills['Constitution']?.level || 1) * 10,
      credits: 1000,
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

    if (result.success && result.character) {
      toast.success("Character Created! Entering The Lobby...");
      setTimeout(() => {
        onComplete(result.character.id);
      }, 300);
    } else {
      toast.error(result.error || "Failed to create character.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-card/90 border border-border/50 rounded-2xl text-foreground sg-glass shadow-2xl backdrop-blur-xl my-4 overflow-y-auto max-h-[90vh]">
      <div className="flex items-center justify-between mb-4">
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground hover:text-foreground gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </Button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
            CREATE OPERATIVE
          </h1>
        </div>
        <div />
      </div>

      <p className="text-muted-foreground text-center text-sm mb-8">Customize your character identity to enter Saints Gaming Lobby</p>

      <div className="space-y-8">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">OPERATIVE NAME</label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="bg-background/80 border-border/60 text-foreground focus-visible:ring-primary font-bold text-lg h-14 rounded-xl"
            placeholder="Enter Operative Name..."
            maxLength={16}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">SELECT AVATAR / SPRITE</label>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {PRESET_SPRITES.map(sprite => {
              const Icon = sprite.icon;
              return (
                <div 
                  key={sprite.id}
                  onClick={() => setSpriteId(sprite.id)}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all shrink-0 w-32 flex flex-col items-center gap-2 ${spriteId === sprite.id ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105' : 'border-border/40 bg-background/50 hover:border-primary/50'}`}
                >
                  <div className="w-14 h-14 bg-muted/60 rounded-xl flex items-center justify-center border border-border/50 shadow-inner">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-xs text-center font-bold text-foreground">{sprite.label}</p>
                </div>
              );
            })}

            {/* Custom Uploaded Pixel Art Game Assets */}
            {customAssets.map(asset => (
              <div 
                key={asset.id}
                onClick={() => setSpriteId(asset.imageUrl)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all shrink-0 w-32 flex flex-col items-center gap-2 ${spriteId === asset.imageUrl ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105' : 'border-border/40 bg-background/50 hover:border-primary/50'}`}
              >
                <div className="w-14 h-14 bg-muted/60 rounded-xl flex items-center justify-center border border-border/50 shadow-inner overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.imageUrl} alt={asset.name} className="w-10 h-10 object-contain pixelated" />
                </div>
                <p className="text-xs text-center font-bold text-foreground truncate w-full">{asset.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">SELECT STARTING CLASS</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CLASSES.map(c => {
              const Icon = c.icon;
              return (
                <div 
                  key={c.id}
                  onClick={() => setClassId(c.id)}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex flex-col gap-2 ${classId === c.id ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] transform scale-[1.02]' : 'border-border/40 bg-background/50 hover:border-primary/50'}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">{c.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground flex-grow">{c.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(c.bonuses).map(([skill, lvl]) => (
                      <span key={skill} className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
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
          className="w-full h-14 mt-8 text-base font-bold bg-gradient-to-r from-purple-600 via-emerald-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 uppercase tracking-wider"
        >
          {loading ? "INITIALIZING OPERATIVE..." : "ENTER THE LOBBY"}
        </Button>
      </div>
    </div>
  );
}
