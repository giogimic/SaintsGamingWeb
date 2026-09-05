import React, { useState, useEffect } from "react";
import { Save, Plus, Activity, Crosshair, Droplets, ArrowRight, Skull, Shield, Zap } from "lucide-react";

export function StatusEditorPanel() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    description: "",
    category: "DEBUFF",
    maxStacks: 1,
    durationTurnsDefault: 1,
    durationMsDefault: 5000,
    captureModifier: 1.0,
    colorHex: "#ffffff",
    iconName: "AlertCircle",
    tags: [] as string[],
    tickEffects: [] as any[],
    isActive: true,
  });

  const categoryOptions = ["BUFF", "DEBUFF", "CONTROL", "DAMAGE_OVER_TIME"];
  const elementsList = ["fire", "water", "wind", "earth", "ice", "lightning", "nature", "metal", "crystal", "poison", "sound", "arcane", "spirit", "light", "void", "gravity"];
  const tickEffectTypes = ["damage", "heal", "modify_stat", "stun", "root"];

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/status");
      const data = await res.json();
      if (data.success) {
        setStatuses(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSelect = (slug: string) => {
    const status = statuses.find((s) => s.slug === slug);
    if (status) {
      setSelectedSlug(slug);
      let parsedTags = [];
      let parsedTickEffects = [];
      
      try { parsedTags = JSON.parse(status.tags); } catch(e){}
      try { parsedTickEffects = JSON.parse(status.tickEffects); } catch(e){}

      setFormData({
        ...status,
        tags: parsedTags,
        tickEffects: parsedTickEffects,
      });
    }
  };

  const handleNew = () => {
    setSelectedSlug(null);
    setFormData({
      slug: "",
      name: "",
      description: "",
      category: "DEBUFF",
      maxStacks: 1,
      durationTurnsDefault: 1,
      durationMsDefault: 5000,
      captureModifier: 1.0,
      colorHex: "#ffffff",
      iconName: "AlertCircle",
      tags: [],
      tickEffects: [],
      isActive: true,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: JSON.stringify(formData.tags),
        tickEffects: JSON.stringify(formData.tickEffects),
      };

      const res = await fetch("/api/studio/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (result.success) {
        await fetchStatuses();
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

  const addTickEffect = () => {
    setFormData(prev => ({
      ...prev,
      tickEffects: [...prev.tickEffects, { type: "damage", power: 10, style: "ability" }]
    }));
  };

  const updateTickEffect = (index: number, key: string, value: any) => {
    setFormData(prev => {
      const newEffects = [...prev.tickEffects];
      newEffects[index] = { ...newEffects[index], [key]: value };
      return { ...prev, tickEffects: newEffects };
    });
  };

  const removeTickEffect = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tickEffects: prev.tickEffects.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="flex h-full text-slate-200 text-sm overflow-hidden">
      {/* Sidebar: Status List */}
      <div className="w-64 border-r border-border/50 flex flex-col bg-card/40">
        <div className="p-3 border-b border-border/50 flex justify-between items-center bg-card/85">
          <span className="font-semibold sg-text-gradient">Status Dictionary</span>
          <button onClick={handleNew} className="p-1 hover:bg-primary/20 rounded text-primary transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-muted-foreground text-center py-4">Loading...</div>
          ) : (
            statuses.map((st) => (
              <div 
                key={st.slug}
                onClick={() => handleSelect(st.slug)}
                className={`px-3 py-2 cursor-pointer rounded transition-all flex items-center gap-2 ${selectedSlug === st.slug ? "bg-primary/20 border border-primary/40 text-primary" : "hover:bg-accent/50 text-slate-300"}`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: st.colorHex }}></div>
                {st.name}
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
            <h2 className="text-2xl font-bold sg-text-gradient">{formData.name || "New Status Effect"}</h2>
            <p className="text-muted-foreground mt-1">Design buffs, debuffs, and environmental conditions.</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving || !formData.slug || !formData.name}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 rounded flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Status"}
          </button>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2"><Activity size={18} className="text-primary"/> Fundamentals</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Slug (Unique ID)</label>
                <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 focus:border-primary/50 outline-none transition-colors" placeholder="e.g. burn" disabled={!!selectedSlug}/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Display Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 focus:border-primary/50 outline-none transition-colors" placeholder="Burn"/>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-2 focus:border-primary/50 outline-none transition-colors min-h-[80px]" placeholder="Deals Solar fire damage over time..."/>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs text-muted-foreground mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none">
                    {categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
               </div>
               <div>
                 <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">Is Active <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="ml-2"/></label>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2"><Crosshair size={18} className="text-primary"/> Duration & Multipliers</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max Stacks</label>
                <input type="number" value={formData.maxStacks} onChange={e => setFormData({...formData, maxStacks: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Capture Modifier (Multiplier)</label>
                <input type="number" step="0.1" value={formData.captureModifier || 1.0} onChange={e => setFormData({...formData, captureModifier: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none" placeholder="1.5 = 50% easier to catch"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Duration (Turns, TB)</label>
                <input type="number" value={formData.durationTurnsDefault} onChange={e => setFormData({...formData, durationTurnsDefault: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Duration (ms, Action)</label>
                <input type="number" value={formData.durationMsDefault} onChange={e => setFormData({...formData, durationMsDefault: Number(e.target.value)})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none"/>
              </div>
            </div>

            <div className="p-4 rounded bg-primary/5 border border-primary/20 mt-4">
              <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2"><Zap size={14}/> Elemental / Combat Tags</h4>
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

        {/* Visuals & Tick Effects */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2"><Shield size={18} className="text-primary"/> Visuals</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status Color (Hex)</label>
                <div className="flex gap-2">
                  <input type="color" value={formData.colorHex} onChange={e => setFormData({...formData, colorHex: e.target.value})} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"/>
                  <input type="text" value={formData.colorHex} onChange={e => setFormData({...formData, colorHex: e.target.value})} className="flex-1 bg-black/40 border border-border/50 rounded px-2 py-1 outline-none font-mono text-xs"/>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Lucide Icon Name</label>
                <input type="text" value={formData.iconName} onChange={e => setFormData({...formData, iconName: e.target.value})} className="w-full bg-black/40 border border-border/50 rounded px-3 py-1.5 outline-none" placeholder="e.g. Zap, Flame"/>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex justify-between items-center">
              <span className="flex items-center gap-2"><Skull size={18} className="text-primary"/> Tick Effects</span>
              <button onClick={addTickEffect} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/40">Add Effect</button>
            </h3>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {formData.tickEffects.length === 0 && <p className="text-muted-foreground text-xs italic">No tick effects defined.</p>}
              
              {formData.tickEffects.map((effect, index) => (
                <div key={index} className="p-3 bg-black/40 border border-border/50 rounded relative group">
                  <button onClick={() => removeTickEffect(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-[10px] text-muted-foreground">Type</label>
                      <select value={effect.type} onChange={(e) => updateTickEffect(index, "type", e.target.value)} className="w-full bg-black/60 border border-border/50 rounded px-2 py-1 outline-none text-xs">
                        {tickEffectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    
                    {(effect.type === 'damage' || effect.type === 'heal' || effect.type === 'modify_stat') && (
                      <div>
                        <label className="block text-[10px] text-muted-foreground">{effect.type === 'modify_stat' ? 'Delta' : 'Power'}</label>
                        <input type="number" value={effect.type === 'modify_stat' ? (effect.delta || 0) : (effect.power || 0)} onChange={(e) => updateTickEffect(index, effect.type === 'modify_stat' ? 'delta' : 'power', Number(e.target.value))} className="w-full bg-black/60 border border-border/50 rounded px-2 py-1 outline-none text-xs"/>
                      </div>
                    )}
                  </div>

                  {effect.type === 'modify_stat' && (
                    <div className="mb-2">
                      <label className="block text-[10px] text-muted-foreground">Stat Name</label>
                      <input type="text" value={effect.stat || ""} onChange={(e) => updateTickEffect(index, "stat", e.target.value)} className="w-full bg-black/60 border border-border/50 rounded px-2 py-1 outline-none text-xs" placeholder="e.g. atk, def, speed"/>
                    </div>
                  )}

                  {effect.type === 'damage' && (
                    <div>
                      <label className="block text-[10px] text-muted-foreground">Damage Style</label>
                      <select value={effect.style || 'ability'} onChange={(e) => updateTickEffect(index, "style", e.target.value)} className="w-full bg-black/60 border border-border/50 rounded px-2 py-1 outline-none text-xs">
                        <option value="physical">Physical</option>
                        <option value="ability">Ability</option>
                        <option value="true">True Damage</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
