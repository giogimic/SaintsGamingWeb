"use client";

import { useState } from "react";
import { createGameCharacter } from "@/app/actions/game";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { User, Sparkles, Shield, Zap, ArrowLeft, ArrowRight, Wand2, Swords, Feather, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { INITIAL_SKILLS, useGameStore } from "./store";
import { GAME_SPRITES } from "./data/sprites";

const PERKS = [
  { id: "SWIFT_TRAVELER", name: "Swift Traveler", desc: "+25% Movement Speed across all maps.", icon: Zap },
  { id: "ACROBAT", name: "Acrobat", desc: "Perform 2-tile Double Jumps over obstacles.", icon: Feather },
  { id: "PACK_MULE", name: "Pack Mule", desc: "+50% Inventory Carry Weight Capacity.", icon: Shield },
  { id: "MASTER_TAMER", name: "Master Tamer", desc: "+15% Catch Rate boost for wild Beasts.", icon: User },
  { id: "STAMINA_SURGE", name: "Stamina Surge", desc: "+30 Max Health & accelerated health regen.", icon: Sparkles }
];

const CLASSES = [
  { id: "WARRIOR", name: "Warrior", desc: "A frontline fighter with high health and physical power.", bonuses: { Attack: 15, Strength: 10, Constitution: 5 }, icon: Swords, color: "text-red-500", bgColor: "bg-red-50", borderColor: "border-red-400" },
  { id: "MAGE", name: "Mage", desc: "An arcane spellcaster specializing in elemental magic.", bonuses: { Magic: 15, Defence: 5 }, icon: Wand2, color: "text-blue-500", bgColor: "bg-blue-50", borderColor: "border-blue-400" },
  { id: "THIEF", name: "Thief", desc: "A swift scout who excels at agility and ranged attacks.", bonuses: { Ranged: 15, Agility: 10 }, icon: Feather, color: "text-emerald-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-400" }
];

type CreatorStep = 'ORIGIN' | 'APPEARANCE' | 'GIFT' | 'REVIEW';

export function CharacterCreator({ onComplete, onCancel }: { onComplete: (characterId: string) => void; onCancel?: () => void }) {
  const [step, setStep] = useState<CreatorStep>('ORIGIN');
  const [name, setName] = useState("");
  const [spriteId, setSpriteId] = useState(GAME_SPRITES[0]);
  const [classId, setClassId] = useState(CLASSES[0].id);
  const [perkId, setPerkId] = useState(PERKS[0].id);
  const [loading, setLoading] = useState(false);
  const [spritePage, setSpritePage] = useState(0);

  const spritesPerPage = 24;
  const currentSprites = GAME_SPRITES.slice(spritePage * spritesPerPage, (spritePage + 1) * spritesPerPage);
  const totalPages = Math.ceil(GAME_SPRITES.length / spritesPerPage);

  const handleCreate = async () => {
    if (!name || name.length < 3) {
      toast.error("Name must be at least 3 characters.");
      return;
    }
    setLoading(true);
    
    const selectedClass = CLASSES.find(c => c.id === classId);
    
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
      customization: { skinTone: '#fcd34d', hairColor: '#3b82f6', shirtColor: '#10b981', pantsColor: '#18181b' },
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

  const getStepProgress = () => {
    switch (step) {
      case 'ORIGIN': return 25;
      case 'APPEARANCE': return 50;
      case 'GIFT': return 75;
      case 'REVIEW': return 100;
      default: return 0;
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full overflow-y-auto z-[100]"
      style={{ backgroundColor: 'rgba(240, 248, 255, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8">
        
        {/* Progress Header */}
        <div className="w-full max-w-4xl mb-4 flex items-center justify-between text-slate-500 font-bold text-xs uppercase tracking-widest px-4">
          <div className={`flex items-center gap-2 ${step === 'ORIGIN' ? 'text-blue-600' : ''}`}>1. Origin <ChevronRight className="w-4 h-4 opacity-30" /></div>
          <div className={`flex items-center gap-2 ${step === 'APPEARANCE' ? 'text-blue-600' : ''}`}>2. Appearance <ChevronRight className="w-4 h-4 opacity-30" /></div>
          <div className={`flex items-center gap-2 ${step === 'GIFT' ? 'text-blue-600' : ''}`}>3. Gift <ChevronRight className="w-4 h-4 opacity-30" /></div>
          <div className={`flex items-center gap-2 ${step === 'REVIEW' ? 'text-blue-600' : ''}`}>4. Finalize</div>
        </div>

        <div className="w-full max-w-4xl bg-white border-4 border-slate-200 rounded-[2rem] text-slate-800 shadow-2xl overflow-hidden relative">
          
          <div className="h-2 w-full bg-slate-100">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${getStepProgress()}%` }} />
          </div>

          <div className="p-6 md:p-10">
            {step === 'ORIGIN' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                  {onCancel ? (
                    <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full font-bold">
                      <ArrowLeft className="w-5 h-5 mr-1" /> Back
                    </Button>
                  ) : <div />}
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Origin</h2>
                  <div className="w-16" />
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 mb-8">
                  <label className="block text-sm font-extrabold tracking-widest text-slate-400 uppercase mb-3 px-1">Character Name</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="bg-white border-2 border-slate-200 text-slate-800 focus-visible:ring-blue-400 focus-visible:border-blue-400 font-extrabold text-xl h-14 rounded-2xl shadow-sm placeholder:text-slate-300"
                    placeholder="Enter hero name..."
                    maxLength={16}
                  />
                </div>

                <label className="block text-sm font-extrabold tracking-widest text-slate-400 uppercase mb-3 px-1">Class</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {CLASSES.map(c => {
                    const Icon = c.icon;
                    const isActive = classId === c.id;
                    return (
                      <div 
                        key={c.id}
                        onClick={() => setClassId(c.id)}
                        className={`p-5 rounded-3xl cursor-pointer border-4 transition-all duration-200 flex flex-col gap-3 ${isActive ? `${c.borderColor} ${c.bgColor} shadow-md scale-[1.02]` : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 hover:scale-[1.01]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-2xl ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                            <Icon className={`w-6 h-6 ${isActive ? c.color : 'text-slate-400'}`} />
                          </div>
                          <h3 className={`text-xl font-extrabold ${isActive ? c.color : 'text-slate-700'}`}>{c.name}</h3>
                        </div>
                        <p className="text-sm font-bold text-slate-500 flex-grow leading-relaxed">{c.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button 
                    disabled={name.length < 3}
                    onClick={() => setStep('APPEARANCE')}
                    className="h-14 px-8 text-lg font-extrabold bg-blue-500 hover:bg-blue-400 text-white rounded-2xl shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-[2px] transition-all uppercase tracking-wide"
                  >
                    Next: Appearance <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 'APPEARANCE' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <Button variant="ghost" size="sm" onClick={() => setStep('ORIGIN')} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full font-bold">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back
                  </Button>
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Appearance</h2>
                  <div className="w-16" />
                </div>

                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-6">
                  {currentSprites.map(sprite => {
                    const isActive = spriteId === sprite;
                    return (
                      <div 
                        key={sprite}
                        onClick={() => setSpriteId(sprite)}
                        className={`aspect-square rounded-2xl cursor-pointer border-4 transition-all duration-200 flex items-center justify-center relative overflow-hidden ${isActive ? 'border-blue-400 bg-blue-50 shadow-md scale-105 z-10' : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'}`}
                      >
                        <div 
                          className="w-12 h-12 pixelated bg-no-repeat transition-transform"
                          style={{ 
                            backgroundImage: `url('/game-assets/characters/${sprite}.png')`,
                            backgroundPosition: '0px -64px',
                            backgroundSize: '96px 128px',
                            width: '32px',
                            height: '32px',
                            transform: isActive ? 'scale(1.5)' : 'scale(1.2)'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mb-8">
                  <Button 
                    variant="outline" 
                    disabled={spritePage === 0} 
                    onClick={() => setSpritePage(p => p - 1)}
                    className="font-bold border-2 text-slate-500 rounded-xl"
                  >
                    Prev
                  </Button>
                  <span className="font-extrabold text-slate-400 tracking-widest text-sm">
                    PAGE {spritePage + 1} OF {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={spritePage === totalPages - 1} 
                    onClick={() => setSpritePage(p => p + 1)}
                    className="font-bold border-2 text-slate-500 rounded-xl"
                  >
                    Next
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setStep('GIFT')}
                    className="h-14 px-8 text-lg font-extrabold bg-blue-500 hover:bg-blue-400 text-white rounded-2xl shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-[2px] transition-all uppercase tracking-wide"
                  >
                    Next: Gift <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 'GIFT' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <Button variant="ghost" size="sm" onClick={() => setStep('APPEARANCE')} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full font-bold">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back
                  </Button>
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gift</h2>
                  <div className="w-16" />
                </div>

                <label className="block text-sm font-extrabold tracking-widest text-slate-400 uppercase mb-3 px-1">Select A Starting Perk</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {PERKS.map(p => {
                    const Icon = p.icon;
                    const isActive = perkId === p.id;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => setPerkId(p.id)}
                        className={`p-5 rounded-3xl cursor-pointer border-4 transition-all duration-200 flex items-start gap-4 ${isActive ? 'border-amber-400 bg-amber-50 shadow-md scale-[1.02]' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 hover:scale-[1.01]'}`}
                      >
                        <div className={`p-3 rounded-2xl shrink-0 ${isActive ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Icon className="w-6 h-6" strokeWidth={3} />
                        </div>
                        <div>
                          <h3 className={`font-extrabold text-lg mb-1 ${isActive ? 'text-amber-600' : 'text-slate-700'}`}>{p.name}</h3>
                          <p className="text-sm font-bold text-slate-500 leading-tight">{p.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setStep('REVIEW')}
                    className="h-14 px-8 text-lg font-extrabold bg-blue-500 hover:bg-blue-400 text-white rounded-2xl shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-[2px] transition-all uppercase tracking-wide"
                  >
                    Next: Review <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 'REVIEW' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <Button variant="ghost" size="sm" onClick={() => setStep('GIFT')} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full font-bold">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back
                  </Button>
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Finalize</h2>
                  <div className="w-16" />
                </div>

                <div className="bg-slate-50 rounded-3xl border-2 border-slate-100 p-8 mb-8 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                  <div className="w-32 h-32 bg-white rounded-3xl border-4 border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                    <div 
                      className="w-12 h-12 pixelated bg-no-repeat"
                      style={{ 
                        backgroundImage: `url('/game-assets/characters/${spriteId}.png')`,
                        backgroundPosition: '0px -64px',
                        backgroundSize: '96px 128px',
                        width: '32px',
                        height: '32px',
                        transform: 'scale(2.5)'
                      }}
                    />
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-4xl font-extrabold text-slate-800 mb-2">{name}</h3>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <span className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl font-extrabold uppercase tracking-widest text-sm border-2 border-blue-200">
                        {CLASSES.find(c => c.id === classId)?.name}
                      </span>
                      <span className="px-4 py-2 bg-amber-100 text-amber-600 rounded-xl font-extrabold uppercase tracking-widest text-sm border-2 border-amber-200">
                        {PERKS.find(p => p.id === perkId)?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    disabled={loading} 
                    onClick={handleCreate}
                    className="w-full md:w-auto h-16 px-10 text-xl font-extrabold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white rounded-2xl shadow-[0_4px_0_0_#10b981] hover:shadow-[0_2px_0_0_#10b981] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest flex items-center gap-3"
                  >
                    {loading ? "SAVING..." : "START ADVENTURE"}
                    {!loading && <Sparkles className="w-6 h-6" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
