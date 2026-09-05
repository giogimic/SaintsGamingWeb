import React, { useState, useEffect } from "react";
import { Save, Plus, Swords, Zap, Wand2, Crosshair, Droplets, ArrowRight } from "lucide-react";
import { useEditorStore } from "../editor-store";

export function AbilityEditorPanel() {
  const [abilities, setAbilities] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    type: "skill",
    domain: "both",
    style: "MAGIC",
    power: 10,
    accuracy: 1.0,
    cooldown: 0,
    manaCost: 0,
    staminaCost: 0,
    isCapture: false,
    target: "enemy",
    description: "",
    tags: [] as string[],
    vfxConfigJson: {
      type: "sprite_row", // "sprite_row", "2d_billboard", "3d_model"
      assetPath: "",
      animationRow: "spellcast",
      tintColor: "#ffffff",
      scale: 1.0,
    },
    conditionsJson: {
      requiresElement: "",
      requiresAbility: "",
    },
    consumableItemId: "",
  });

  const elementsList = ["Fire", "Water", "Wind", "Earth", "Ice", "Lightning", "Nature", "Metal", "Crystal", "Poison", "Sound", "Arcane", "Spirit", "Light", "Void", "Gravity"];
  const styleOptions = ["MELEE", "MAGIC", "RANGED", "SUPPORT", "TECH"];
  const targetOptions = ["enemy", "self", "ally", "aoe_enemies", "aoe_allies", "tile"];

  useEffect(() => {
    fetchAbilities();
  }, []);

  const fetchAbilities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/abilities");
      const data = await res.json();
      if (data.success) {
        setAbilities(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSelect = (slug: string) => {
    const ability = abilities.find((a) => a.slug === slug);
    if (ability) {
      setSelectedSlug(slug);
      let parsedTags = [];
      let parsedVfx = formData.vfxConfigJson;
      let parsedConditions = formData.conditionsJson;
      
      try { parsedTags = JSON.parse(ability.tags); } catch(e){}
      try { parsedVfx = JSON.parse(ability.vfxConfigJson); } catch(e){}
      try { parsedConditions = JSON.parse(ability.conditionsJson); } catch(e){}

      setFormData({
        ...ability,
        tags: parsedTags,
        vfxConfigJson: parsedVfx,
        conditionsJson: parsedConditions,
      });
    }
  };

  const handleNew = () => {
    setSelectedSlug(null);
    setFormData({
      slug: "",
      name: "",
      type: "skill",
      domain: "both",
      style: "MAGIC",
      power: 10,
      accuracy: 1.0,
      cooldown: 0,
      manaCost: 0,
      staminaCost: 0,
      isCapture: false,
      target: "enemy",
      description: "",
      tags: [],
      vfxConfigJson: { type: "sprite_row", assetPath: "", animationRow: "spellcast", tintColor: "#ffffff", scale: 1.0 },
      conditionsJson: { requiresElement: "", requiresAbility: "" },
      consumableItemId: "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: JSON.stringify(formData.tags),
        vfxConfigJson: JSON.stringify(formData.vfxConfigJson),
        conditionsJson: JSON.stringify(formData.conditionsJson),
      };

      const res = await fetch("/api/studio/abilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (result.success) {
        await fetchAbilities();
        setSelectedSlug(result.data.slug);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const toggleTag = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    setFormData(prev => {
      const newTags = prev.tags.includes(lowerTag) 
        ? prev.tags.filter(t => t !== lowerTag)
        : [...prev.tags, lowerTag];
      return { ...prev, tags: newTags };
    });
  };

  return (
    <div className="flex h-full bg-[#050b14] text-slate-200 text-sm overflow-hidden border border-border/50 rounded-lg">
      {/* Sidebar: Ability List */}
      <div className="w-64 border-r border-border/50 flex flex-col bg-card/40">
        <div className="p-3 border-b border-border/50 flex justify-between items-center bg-card/85">
          <span className="font-semibold sg-text-gradient">Ability Studio</span>
          <button onClick={handleNew} className="p-1 hover:bg-primary/20 rounded text-primary transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-muted-foreground text-center py-4">Loading...</div>
          ) : (
            abilities.map((ab) => (
              <div 
                key={ab.slug}
                onClick={() => handleSelect(ab.slug)}
                className={`px-3 py-2 cursor-pointer rounded transition-all ${selectedSlug === ab.slug ? "bg-primary/20 border border-primary/40 text-primary" : "hover:bg-accent/50 text-slate-300"}`}
              >
                {ab.name}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gradient-to-br from-[#050b14] to-slate-900/50">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold sg-text-gradient">{formData.name || "New Ability"}</h2>
            <p className="text-muted-foreground mt-1">Design visually stunning combat skills and elemental logic.</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving || !formData.slug || !formData.name}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 rounded flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Ability"}
          </button>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2"><Swords size={18} className="text-primary"/> Fundamentals</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Slug (Unique ID)</label>
                <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 focus:border-primary/50 outline-none transition-colors" placeholder="e.g. fire_bolt" disabled={!!selectedSlug}/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Display Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 focus:border-primary/50 outline-none transition-colors" placeholder="Fire Bolt"/>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-2 focus:border-primary/50 outline-none transition-colors min-h-[80px]" placeholder="A blazing bolt of fire..."/>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div>
                  <label className="block text-xs text-muted-foreground mb-1">Combat Style</label>
                  <select value={formData.style} onChange={e => setFormData({...formData, style: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none">
                    {styleOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs text-muted-foreground mb-1">Target</label>
                  <select value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none">
                    {targetOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs text-muted-foreground mb-1">Domain</label>
                  <select value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none">
                    <option value="both">Both (RT & TB)</option>
                    <option value="player_rt">Player (Action RPG)</option>
                    <option value="creature_tb">Creature (Turn-based)</option>
                  </select>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2"><Crosshair size={18} className="text-primary"/> Stats & Costs</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Power</label>
                <input type="number" value={formData.power} onChange={e => setFormData({...formData, power: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Accuracy (0-1.0)</label>
                <input type="number" step="0.1" value={formData.accuracy} onChange={e => setFormData({...formData, accuracy: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Mana Cost</label>
                <input type="number" value={formData.manaCost} onChange={e => setFormData({...formData, manaCost: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cooldown (ms)</label>
                <input type="number" value={formData.cooldown} onChange={e => setFormData({...formData, cooldown: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
            </div>

            <div className="p-4 rounded bg-primary/5 border border-primary/20 mt-4">
              <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2"><Zap size={14}/> Elemental Core Mapping (Tags)</h4>
              <div className="flex flex-wrap gap-2">
                {elementsList.map(el => (
                  <button 
                    key={el}
                    onClick={() => toggleTag(el)}
                    className={`px-2 py-1 text-xs rounded-full border transition-all ${formData.tags.includes(el.toLowerCase()) ? "bg-primary text-black border-primary font-semibold" : "bg-black/40 border-border/50 text-muted-foreground hover:border-primary/50"}`}
                  >
                    {el}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* VFX & Conditions */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2"><Wand2 size={18} className="text-primary"/> Engine VFX</h3>
            
            <div>
               <label className="block text-xs text-muted-foreground mb-1">VFX Type</label>
               <select 
                  value={formData.vfxConfigJson.type} 
                  onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, type: e.target.value}})} 
                  className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none mb-1"
                >
                 <option value="sprite_row">Sprite Animation Row (Self)</option>
                 <option value="2d_billboard">2D Billboard Projectile</option>
                 <option value="3d_model">3D Mesh Particle System</option>
               </select>
               <p className="text-xs text-muted-foreground">
                 {formData.vfxConfigJson.type === "sprite_row" && "Uses a 2D spritesheet animation (e.g., a sword slash or spellcast motion) attached directly to the caster."}
                 {formData.vfxConfigJson.type === "2d_billboard" && "Uses a 2D image sequence that always faces the camera, acting as a flying projectile."}
                 {formData.vfxConfigJson.type === "3d_model" && "Uses a Babylon.js 3D Mesh (.glb) or particle JSON for rich volumetric effects."}
               </p>
            </div>

            {formData.vfxConfigJson.type === "sprite_row" ? (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Animation Row Name</label>
                <input type="text" value={formData.vfxConfigJson.animationRow} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, animationRow: e.target.value}})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none" placeholder="e.g. spellcast, thrust, slash"/>
                <p className="text-xs text-muted-foreground mt-1">Matches the ACTION_ROWS map in spriteDefinitions.</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Asset Path</label>
                <input type="text" value={formData.vfxConfigJson.assetPath} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, assetPath: e.target.value}})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none" placeholder="e.g. /assets/vfx/fireball.glb"/>
                <div className="mt-2 p-3 bg-black/20 border border-primary/20 rounded-md">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">Need free assets for your abilities?</p>
                  <p className="text-xs text-slate-400">
                    Check out open-source repositories like <a href="https://kenney.nl/assets" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Kenney.nl</a>, <a href="https://opengameart.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenGameArt</a>, or <a href="https://itch.io/game-assets" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Itch.io</a> to find sprites, 3D meshes, and particle effects for your game.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tint Color (Hex)</label>
                <div className="flex gap-2">
                  <input type="color" value={formData.vfxConfigJson.tintColor} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, tintColor: e.target.value}})} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"/>
                  <input type="text" value={formData.vfxConfigJson.tintColor} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, tintColor: e.target.value}})} className="flex-1 bg-black/40 border border-border/50 rounded px-2 py-1 outline-none font-mono text-xs"/>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">VFX Scale</label>
                <input type="number" step="0.1" value={formData.vfxConfigJson.scale} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, scale: Number(e.target.value)}})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2"><ArrowRight size={18} className="text-primary"/> Progression & Conditions</h3>
            
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Requires Element to Unlock</label>
              <select value={formData.conditionsJson.requiresElement} onChange={e => setFormData({...formData, conditionsJson: {...formData.conditionsJson, requiresElement: e.target.value}})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none">
                <option value="">None</option>
                {elementsList.map(el => <option key={el} value={el.toLowerCase()}>{el}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Requires Prior Ability Slug</label>
              <input type="text" value={formData.conditionsJson.requiresAbility} onChange={e => setFormData({...formData, conditionsJson: {...formData.conditionsJson, requiresAbility: e.target.value}})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none" placeholder="e.g. fire_bolt"/>
            </div>

            <div className="p-4 rounded bg-card/60 border border-border/50 mt-4">
              <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2"><Droplets size={14} className="text-primary"/> Auto-Generated Consumable</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A "Skill Book" item is automatically generated in the database when this ability is created. Players can find and consume this item to permanently learn the skill.
              </p>
              <div className="mt-3 text-xs font-mono bg-black/50 p-2 rounded flex items-center justify-between">
                <span className="text-slate-400">Item Slug:</span>
                <span className="text-primary">{formData.consumableItemId || `item_skillbook_${formData.slug || "new"}`}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
