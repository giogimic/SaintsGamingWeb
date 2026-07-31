"use client";

import { useState, useEffect } from "react";
import { createGameCharacter } from "@/app/actions/game";
import { fetchAllGameAssets } from "@/app/actions/game-dev";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { User, Skull, Sparkles, Wrench, Shield, Zap, ArrowLeft, Gamepad2, Wand2, Swords, Feather } from "lucide-react";
import { toast } from "sonner";
import { INITIAL_SKILLS, useGameStore } from "./store";

const PRESET_SPRITES = [
  { id: "warrior", label: "Hero", icon: Swords },
  { id: "heroine", label: "Heroine", icon: Sparkles },
  { id: "adventurer", label: "Explorer", icon: User },
  { id: "catgirl", label: "Scout", icon: Feather },
  { id: "dragonrider", label: "Knight", icon: Shield },
  { id: "alchemist", label: "Mage", icon: Wand2 },
  { id: "firefighter", label: "Guard", icon: Skull },
  { id: "fashionista", label: "Villager", icon: User },
];

const PERKS = [
  {
    id: "SWIFT_TRAVELER",
    name: "Swift Traveler",
    desc: "+25% Movement Speed across all maps.",
    icon: Zap
  },
  {
    id: "ACROBAT",
    name: "Acrobat",
    desc: "Perform 2-tile Double Jumps over obstacles.",
    icon: Feather
  },
  {
    id: "PACK_MULE",
    name: "Pack Mule",
    desc: "+50% Inventory Carry Weight Capacity.",
    icon: Shield
  },
  {
    id: "MASTER_TAMER",
    name: "Master Tamer",
    desc: "+15% Catch Rate boost for wild Beasts.",
    icon: User
  },
  {
    id: "STAMINA_SURGE",
    name: "Stamina Surge",
    desc: "+30 Max Health & accelerated health regen.",
    icon: Sparkles
  }
];

const CLASSES = [
  {
    id: "WARRIOR",
    name: "Warrior",
    desc: "A frontline fighter with high health and raw physical power.",
    bonuses: { Attack: 15, Strength: 10, Constitution: 5 },
    icon: Swords,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-400"
  },
  {
    id: "MAGE",
    name: "Mage",
    desc: "An arcane spellcaster specializing in elemental magic.",
    bonuses: { Magic: 15, Defence: 5 },
    icon: Wand2,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400"
  },
  {
    id: "THIEF",
    name: "Thief",
    desc: "A swift scout who excels at agility and ranged attacks.",
    bonuses: { Ranged: 15, Agility: 10 },
    icon: Feather,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400"
  }
];

export function CharacterCreator({ onComplete, onCancel }: { onComplete: (characterId: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [spriteId, setSpriteId] = useState(PRESET_SPRITES[0].id);
  const [classId, setClassId] = useState(CLASSES[0].id);
  const [perkId, setPerkId] = useState(PERKS[0].id);
  const [customAssets, setCustomAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Customization state
  const [skinTone, setSkinTone] = useState('#fcd34d');
  const [hairColor, setHairColor] = useState('#3b82f6');
  const [shirtColor, setShirtColor] = useState('#10b981');
  const [pantsColor, setPantsColor] = useState('#18181b');

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
      currentMapId: 'DEMO_SANDBOX',
      position: { x: 14, y: 15 },
      level: 1,
      xp: 0,
      hp: (perkId === 'STAMINA_SURGE' ? 130 : 100) + (initialSkills['Constitution']?.level || 1) * 10,
      maxHp: (perkId === 'STAMINA_SURGE' ? 130 : 100) + (initialSkills['Constitution']?.level || 1) * 10,
      credits: 1000,
      inventory: { 'capture_script': 10, 'patch_kit': 5 },
      skills: initialSkills,
      equipment: { head: null, chest: 'bronze_chestplate', legs: 'bronze_leggings', weapon: 'bronze_sword' },
      customization: { skinTone, hairColor, shirtColor, pantsColor },
      combatStyle: classId,
      activeDaemonId: 'd-001',
      saintRank: 'Rookie',
      caughtDaemons: ['d-001'],
      assignedBeasts: { furnace: null, farm: null, fishing_hut: null },
      perk: perkId,
      maxWeight: perkId === 'PACK_MULE' ? 150 : 100,
      maxPartySize: 4
    };

    const result = await createGameCharacter({
      name,
      spriteId,
      classId,
      initialState: JSON.stringify(initialState)
    });

    if (result.success && result.character) {
      toast.success("Character Created! Entering The World...");
      setTimeout(() => {
        onComplete(result.character.id);
      }, 300);
    } else {
      toast.error(result.error || "Failed to create character.");
      setLoading(false);
      if (result.error === 'Unauthorized') {
        useGameStore.getState().setGameMode('LOGIN');
        window.dispatchEvent(new CustomEvent('close_creator'));
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full overflow-y-auto bg-slate-100" 
      style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '30px 30px' }}
    >
      <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl bg-white border-4 border-slate-200 rounded-[2rem] text-slate-800 shadow-2xl p-6 md:p-10 relative">
          
          <div className="flex items-center justify-between mb-2">
            {onCancel ? (
              <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 gap-1 rounded-full px-4 font-bold">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-8 h-8 text-blue-500" />
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                Create Your Character
              </h1>
            </div>
            <div />
          </div>

          <p className="text-slate-500 font-medium text-center text-sm md:text-base mb-10">Choose your path and prepare for your adventure!</p>

          <div className="space-y-10">
            {/* NAME */}
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
              <label className="block text-sm font-extrabold tracking-wide text-slate-700 mb-3">CHARACTER NAME</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="bg-white border-2 border-slate-200 text-slate-800 focus-visible:ring-blue-400 focus-visible:border-blue-400 font-bold text-xl h-14 rounded-2xl shadow-sm placeholder:text-slate-300"
                placeholder="Enter a fun name..."
                maxLength={16}
              />
            </div>

            {/* AVATAR */}
            <div>
              <label className="block text-sm font-extrabold tracking-wide text-slate-700 mb-3 px-2">SELECT AVATAR</label>
              <div className="flex gap-4 overflow-x-auto pb-4 px-2 hide-scrollbar">
                {PRESET_SPRITES.map(sprite => {
                  const Icon = sprite.icon;
                  const isActive = spriteId === sprite.id;
                  return (
                    <div 
                      key={sprite.id}
                      onClick={() => setSpriteId(sprite.id)}
                      className={`p-4 rounded-3xl cursor-pointer border-4 transition-all duration-200 shrink-0 w-32 flex flex-col items-center gap-3 ${isActive ? 'border-blue-400 bg-blue-50 shadow-md scale-105' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-blue-400 text-white shadow-inner' : 'bg-slate-100 text-slate-400'}`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <p className={`text-sm text-center font-bold ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>{sprite.label}</p>
                    </div>
                  );
                })}

                {/* Custom Uploaded Assets */}
                {customAssets.map(asset => {
                  const isActive = spriteId === asset.imageUrl;
                  return (
                    <div 
                      key={asset.id}
                      onClick={() => setSpriteId(asset.imageUrl)}
                      className={`p-4 rounded-3xl cursor-pointer border-4 transition-all duration-200 shrink-0 w-32 flex flex-col items-center gap-3 ${isActive ? 'border-blue-400 bg-blue-50 shadow-md scale-105' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.imageUrl} alt={asset.name} className="w-10 h-10 object-contain pixelated" />
                      </div>
                      <p className={`text-sm text-center font-bold truncate w-full ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>{asset.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CUSTOMIZATION */}
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
              <label className="block text-sm font-extrabold tracking-wide text-slate-700 mb-4">CUSTOMIZE COLORS</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Skin Tone</label>
                  <div className="flex gap-2">
                    {['#fcd34d', '#f87171', '#d97706', '#78350f', '#86efac'].map(color => (
                      <button 
                        key={color} 
                        onClick={() => setSkinTone(color)}
                        className={`w-8 h-8 rounded-full border-4 transition-all shadow-sm ${skinTone === color ? 'border-white scale-125 ring-2 ring-slate-300' : 'border-transparent hover:scale-110'}`} 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Hair Color</label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#ec4899', '#eab308', '#ef4444', '#1e293b'].map(color => (
                      <button 
                        key={color} 
                        onClick={() => setHairColor(color)}
                        className={`w-8 h-8 rounded-full border-4 transition-all shadow-sm ${hairColor === color ? 'border-white scale-125 ring-2 ring-slate-300' : 'border-transparent hover:scale-110'}`} 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Shirt</label>
                  <div className="flex gap-2">
                    {['#10b981', '#6366f1', '#f43f5e', '#a855f7', '#f97316'].map(color => (
                      <button 
                        key={color} 
                        onClick={() => setShirtColor(color)}
                        className={`w-8 h-8 rounded-full border-4 transition-all shadow-sm ${shirtColor === color ? 'border-white scale-125 ring-2 ring-slate-300' : 'border-transparent hover:scale-110'}`} 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Pants</label>
                  <div className="flex gap-2">
                    {['#18181b', '#0f172a', '#451a03', '#164e63', '#312e81'].map(color => (
                      <button 
                        key={color} 
                        onClick={() => setPantsColor(color)}
                        className={`w-8 h-8 rounded-full border-4 transition-all shadow-sm ${pantsColor === color ? 'border-white scale-125 ring-2 ring-slate-300' : 'border-transparent hover:scale-110'}`} 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CLASSES */}
            <div>
              <label className="block text-sm font-extrabold tracking-wide text-slate-700 mb-3 px-2">CHOOSE YOUR CLASS</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
                {CLASSES.map(c => {
                  const Icon = c.icon;
                  const isActive = classId === c.id;
                  return (
                    <div 
                      key={c.id}
                      onClick={() => setClassId(c.id)}
                      className={`p-5 rounded-3xl cursor-pointer border-4 transition-all duration-200 flex flex-col gap-3 ${isActive ? `${c.borderColor} ${c.bgColor} shadow-md scale-105` : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 hover:scale-[1.02]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                          <Icon className={`w-6 h-6 ${isActive ? c.color : 'text-slate-400'}`} />
                        </div>
                        <h3 className={`text-lg font-extrabold ${isActive ? c.color : 'text-slate-700'}`}>{c.name}</h3>
                      </div>
                      <p className="text-sm font-medium text-slate-500 flex-grow leading-relaxed">{c.desc}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(c.bonuses).map(([skill, lvl]) => (
                          <span key={skill} className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isActive ? 'bg-white text-slate-700 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                            {skill} <span className={c.color}>+{lvl as number}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PERKS */}
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
              <label className="block text-sm font-extrabold tracking-wide text-slate-700 mb-4">SELECT A UNIQUE PERK</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PERKS.map(p => {
                  const Icon = p.icon;
                  const isActive = perkId === p.id;
                  return (
                    <div 
                      key={p.id}
                      onClick={() => setPerkId(p.id)}
                      className={`p-4 rounded-2xl cursor-pointer border-4 transition-all duration-200 flex items-start gap-3 ${isActive ? 'border-amber-400 bg-amber-50 shadow-sm scale-105' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`font-extrabold text-sm mb-1 ${isActive ? 'text-amber-600' : 'text-slate-700'}`}>{p.name}</h3>
                        <p className="text-xs font-medium text-slate-500 leading-tight">{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button 
              disabled={loading || name.length < 3} 
              onClick={handleCreate}
              className="w-full h-16 mt-4 text-lg font-extrabold bg-blue-500 hover:bg-blue-400 active:scale-95 text-white rounded-2xl shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest"
            >
              {loading ? "SAVING..." : "START ADVENTURE"}
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
}
