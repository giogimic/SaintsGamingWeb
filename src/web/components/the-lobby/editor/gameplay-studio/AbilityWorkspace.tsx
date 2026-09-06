import React, { useState, useEffect } from "react";
import { Save, Plus, Wand2, Zap, ArrowRight, Droplets, Swords } from "lucide-react";

export function AbilityWorkspace() {
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
    element1: "none",
    element2: "none",
    skillForm: "strike",
    skillRole: "offense",
    tags: [] as string[],
    vfxConfigJson: {
      type: "sprite_row",
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

  const elementsList = ["fire", "water", "wind", "earth", "ice", "lightning", "nature", "metal", "crystal", "poison", "sound", "arcane", "spirit", "light", "void", "gravity"];
  const formsList = ["strike", "blast", "beam", "field", "trap", "breath", "summon"];
  const rolesList = ["offense", "defense", "control", "utility", "survival"];

  // Directory Tree State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    taxonomy: true,
    stats: false,
    vfx: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      
      try { parsedTags = typeof ability.tags === 'string' ? JSON.parse(ability.tags) : ability.tags; } catch(e){}
      try { parsedVfx = typeof ability.vfxConfigJson === 'string' ? JSON.parse(ability.vfxConfigJson) : ability.vfxConfigJson; } catch(e){}
      try { parsedConditions = typeof ability.conditionsJson === 'string' ? JSON.parse(ability.conditionsJson) : ability.conditionsJson; } catch(e){}

      setFormData({
        ...ability,
        element1: ability.element1 || "none",
        element2: ability.element2 || "none",
        skillForm: ability.skillForm || "strike",
        skillRole: ability.skillRole || "offense",
        tags: parsedTags || [],
        vfxConfigJson: parsedVfx || formData.vfxConfigJson,
        conditionsJson: parsedConditions || formData.conditionsJson,
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
      element1: "none",
      element2: "none",
      skillForm: "strike",
      skillRole: "offense",
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

  return (
    <div className="flex h-full w-full bg-[#050b14]">
      {/* ── Sidebar (List) ── */}
      <div className="w-64 border-r border-border/50 flex flex-col bg-card/40 shrink-0">
        <div className="p-3 border-b border-border/50 flex justify-between items-center bg-card/85">
          <span className="font-semibold text-slate-300">Ability Dictionary</span>
          <button onClick={handleNew} className="p-1 hover:bg-primary/20 rounded text-primary transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            abilities.map((ab) => (
              <button
                key={ab.slug}
                onClick={() => handleSelect(ab.slug)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                  selectedSlug === ab.slug ? "bg-primary text-black font-medium" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <span>{ab.name}</span>
                <span className="text-[10px] opacity-60 uppercase">{ab.element1}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main Editor Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor Toolbar */}
        <div className="h-12 border-b border-border/50 bg-card/85 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
              <Wand2 size={16} />
            </div>
            <div>
              <h2 className="font-medium text-slate-200">{formData.name || "Unnamed Ability"}</h2>
              <div className="text-xs text-muted-foreground font-mono">{formData.slug || "new_ability"}</div>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-primary text-black rounded font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Ability"}
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Settings Tree */}
          <div className="w-80 border-r border-border/50 bg-card/40 overflow-y-auto p-4 space-y-4">
            
            {/* General Settings */}
            <div className="border border-border/50 rounded-md overflow-hidden bg-black/20">
              <button 
                onClick={() => toggleSection('general')}
                className="w-full flex items-center justify-between p-2.5 bg-card/85 text-sm font-medium hover:bg-card transition-colors"
              >
                General Identity
                <span className="text-muted-foreground">{expandedSections.general ? '▼' : '▶'}</span>
              </button>
              {expandedSections.general && (
                <div className="p-3 space-y-3 border-t border-border/50 text-sm">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Internal Slug</label>
                    <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none font-mono text-xs text-primary"/>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Display Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Description & Effects</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none h-20 resize-none text-xs" placeholder="What does it do?"/>
                  </div>
                </div>
              )}
            </div>

            {/* 5-Part Taxonomy (Elements Integration) */}
            <div className="border border-primary/20 rounded-md overflow-hidden bg-primary/5">
              <button 
                onClick={() => toggleSection('taxonomy')}
                className="w-full flex items-center justify-between p-2.5 bg-card/85 text-sm font-medium hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-2 text-primary">
                  <Zap size={14}/>
                  5-Part Taxonomy
                </div>
                <span className="text-muted-foreground">{expandedSections.taxonomy ? '▼' : '▶'}</span>
              </button>
              {expandedSections.taxonomy && (
                <div className="p-3 space-y-3 border-t border-border/50 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase text-muted-foreground mb-1">Primary Element</label>
                      <select value={formData.element1} onChange={e => setFormData({...formData, element1: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-2 py-1 outline-none text-xs capitalize">
                        <option value="none">None</option>
                        {elementsList.map(el => <option key={el} value={el}>{el}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-muted-foreground mb-1">Secondary Element</label>
                      <select value={formData.element2} onChange={e => setFormData({...formData, element2: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-2 py-1 outline-none text-xs capitalize">
                        <option value="none">None</option>
                        {elementsList.map(el => <option key={el} value={el}>{el}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase text-muted-foreground mb-1">Skill Form</label>
                      <select value={formData.skillForm} onChange={e => setFormData({...formData, skillForm: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-2 py-1 outline-none text-xs capitalize">
                        {formsList.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-muted-foreground mb-1">Skill Role</label>
                      <select value={formData.skillRole} onChange={e => setFormData({...formData, skillRole: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-2 py-1 outline-none text-xs capitalize">
                        {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats & Costs */}
            <div className="border border-border/50 rounded-md overflow-hidden bg-black/20">
              <button 
                onClick={() => toggleSection('stats')}
                className="w-full flex items-center justify-between p-2.5 bg-card/85 text-sm font-medium hover:bg-card transition-colors"
              >
                Stats & Costs
                <span className="text-muted-foreground">{expandedSections.stats ? '▼' : '▶'}</span>
              </button>
              {expandedSections.stats && (
                <div className="p-3 space-y-3 border-t border-border/50 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Power</label>
                      <input type="number" value={formData.power} onChange={e => setFormData({...formData, power: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none"/>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Accuracy</label>
                      <input type="number" step="0.1" value={formData.accuracy} onChange={e => setFormData({...formData, accuracy: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Mana Cost</label>
                      <input type="number" value={formData.manaCost} onChange={e => setFormData({...formData, manaCost: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none"/>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Stamina Cost</label>
                      <input type="number" value={formData.staminaCost} onChange={e => setFormData({...formData, staminaCost: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Cooldown (Ticks)</label>
                    <input type="number" value={formData.cooldown} onChange={e => setFormData({...formData, cooldown: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1.5 outline-none"/>
                  </div>
                </div>
              )}
            </div>

            {/* Engine VFX */}
            <div className="border border-border/50 rounded-md overflow-hidden bg-black/20">
              <button 
                onClick={() => toggleSection('vfx')}
                className="w-full flex items-center justify-between p-2.5 bg-card/85 text-sm font-medium hover:bg-card transition-colors"
              >
                Engine VFX
                <span className="text-muted-foreground">{expandedSections.vfx ? '▼' : '▶'}</span>
              </button>
              {expandedSections.vfx && (
                <div className="p-3 space-y-3 border-t border-border/50 text-sm">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">VFX Type</label>
                    <select 
                        value={formData.vfxConfigJson.type} 
                        onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, type: e.target.value}})} 
                        className="w-full bg-black/40 border border-border/50 rounded px-2 py-1 outline-none text-xs"
                      >
                      <option value="sprite_row">Sprite Animation Row (Self)</option>
                      <option value="2d_billboard">2D Billboard Projectile</option>
                      <option value="3d_model">3D Mesh Particle System</option>
                    </select>
                  </div>
                  {formData.vfxConfigJson.type === "sprite_row" ? (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Animation Row Name</label>
                      <input type="text" value={formData.vfxConfigJson.animationRow} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, animationRow: e.target.value}})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1 outline-none text-xs" placeholder="e.g. spellcast"/>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Asset Path</label>
                      <input type="text" value={formData.vfxConfigJson.assetPath} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, assetPath: e.target.value}})} className="w-full bg-black/40 border border-border/50 rounded px-2.5 py-1 outline-none text-xs" placeholder="/assets/..."/>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Tint Color</label>
                      <div className="flex gap-1">
                        <input type="color" value={formData.vfxConfigJson.tintColor} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, tintColor: e.target.value}})} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"/>
                        <input type="text" value={formData.vfxConfigJson.tintColor} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, tintColor: e.target.value}})} className="w-full bg-black/40 border border-border/50 rounded px-1 outline-none text-[10px] font-mono"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Scale</label>
                      <input type="number" step="0.1" value={formData.vfxConfigJson.scale} onChange={e => setFormData({...formData, vfxConfigJson: {...formData.vfxConfigJson, scale: Number(e.target.value)}})} className="w-full bg-black/40 border border-border/50 rounded px-2 py-1 outline-none text-xs"/>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
          
          {/* Main Preview Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-black/50 flex items-center justify-center">
            {/* Ability Card Preview */}
            <div className="w-[340px] rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden relative">
              <div className="h-24 bg-gradient-to-br from-primary/30 to-black relative">
                 {/* Element Icons could go here */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Swords size={48} />
                 </div>
              </div>
              <div className="p-5 relative">
                <div className="absolute -top-10 left-5 w-16 h-16 rounded-lg bg-black border border-primary/50 flex items-center justify-center shadow-lg">
                  <Wand2 className="text-primary" size={24} />
                </div>
                
                <div className="mt-8">
                  <h3 className="text-xl font-bold sg-text-gradient">{formData.name || "Ability Name"}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-wider">{formData.element1}</span>
                    {formData.element2 !== "none" && (
                      <>
                        <span className="text-muted-foreground">+</span>
                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-wider">{formData.element2}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-black/40 border border-border/50 flex flex-col items-center">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold">Form</span>
                    <span className="capitalize">{formData.skillForm}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-border/50 flex flex-col items-center">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold">Role</span>
                    <span className="capitalize">{formData.skillRole}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-border/50 flex flex-col items-center">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold">Power</span>
                    <span>{formData.power}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-border/50 flex flex-col items-center">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold">Costs</span>
                    <span>{formData.manaCost}M / {formData.staminaCost}S</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 rounded bg-black/30 border border-border/30 text-sm leading-relaxed text-slate-300 min-h-16">
                  {formData.description || "No description provided."}
                </div>
                
                {formData.element2 !== "none" && (
                  <div className="mt-4 p-2 rounded bg-primary/10 border border-primary/20 text-xs text-primary text-center font-medium">
                    <Zap className="inline-block w-3 h-3 mr-1" />
                    Fusion Reaction Activated
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
