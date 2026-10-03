'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TreePine, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { useGameStore } from '../../store';
import { listFoliageDefs, upsertFoliageDef, deleteFoliageDef } from '@/app/actions/studio/environment';

export const FoliageStudioPanel: React.FC = () => {
  const showToast = useGameStore((state) => state.showToast);
  const [foliageList, setFoliageList] = useState<any[]>([]);
  const [selectedFoliage, setSelectedFoliage] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchFoliage = async () => {
    setIsLoading(true);
    const res = await listFoliageDefs();
    if (res.success && res.data) {
      setFoliageList(res.data);
    } else {
      showToast('Failed to load foliage: ' + res.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFoliage();
  }, []);

  const handleAddNew = () => {
    const newItem = {
      id: '',
      name: 'New Environment Item',
      category: 'Tree',
      isInvincible: true,
      health: null,
      respawnRate: null,
      description: '',
      visualData: ''
    };
    setSelectedFoliage(newItem);
  };

  const handleSave = async () => {
    if (!selectedFoliage) return;
    setIsSaving(true);
    const res = await upsertFoliageDef({
      id: selectedFoliage.id || undefined,
      name: selectedFoliage.name,
      category: selectedFoliage.category,
      description: selectedFoliage.description,
      isInvincible: selectedFoliage.isInvincible,
      health: selectedFoliage.isInvincible ? null : selectedFoliage.health || 0,
      respawnRate: selectedFoliage.isInvincible ? null : selectedFoliage.respawnRate || 0,
      visualData: selectedFoliage.visualData || null
    });
    
    if (res.success && res.data) {
      showToast(`Saved ${res.data.name}`);
      setSelectedFoliage(res.data);
      await fetchFoliage();
    } else {
      showToast('Error saving: ' + res.error);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedFoliage || !selectedFoliage.id) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    setIsSaving(true);
    const res = await deleteFoliageDef(selectedFoliage.id);
    if (res.success) {
      showToast('Item deleted.');
      setSelectedFoliage(null);
      await fetchFoliage();
    } else {
      showToast('Failed to delete: ' + res.error);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex h-full bg-[#050b14] text-gray-200 text-xs overflow-hidden font-sans">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-border/40 flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <TreePine className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-foreground text-sm">Foliage / Environment</span>
          </div>
          <button onClick={handleAddNew} className="p-1 rounded hover:bg-primary/20 text-primary transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            foliageList.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedFoliage(item)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  selectedFoliage?.id === item.id ? 'bg-primary/20 border border-primary/40 text-primary' : 'hover:bg-card/60 text-muted-foreground'
                }`}
              >
                <span>{item.name}</span>
                <span className="text-[10px] opacity-60">{item.category}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="w-2/3 flex flex-col">
        {selectedFoliage ? (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {selectedFoliage.name}
              </h3>
              <div className="flex items-center gap-2">
                {selectedFoliage.id && (
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Item Name</label>
                <input
                  type="text"
                  value={selectedFoliage.name}
                  onChange={(e) => setSelectedFoliage({ ...selectedFoliage, name: e.target.value })}
                  className="w-full bg-card/60 border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Description</label>
                <textarea
                  value={selectedFoliage.description || ''}
                  onChange={(e) => setSelectedFoliage({ ...selectedFoliage, description: e.target.value })}
                  className="w-full bg-card/60 border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Visual Data (JSON / Model Ref)</label>
                <textarea
                  value={selectedFoliage.visualData || ''}
                  onChange={(e) => setSelectedFoliage({ ...selectedFoliage, visualData: e.target.value })}
                  className="w-full bg-card/60 border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono text-[10px] min-h-[60px]"
                  placeholder={`{\n  "model": "tree_pine_1",\n  "scale": 1.2\n}`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Category</label>
                <select
                  value={selectedFoliage.category}
                  onChange={(e) => setSelectedFoliage({ ...selectedFoliage, category: e.target.value })}
                  className="w-full bg-card/60 border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="Tree">Tree</option>
                  <option value="Rock">Rock / Mineral</option>
                  <option value="Bush">Bush / Forage</option>
                  <option value="Plant">Plant / Decor</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-4 p-3 bg-card/40 rounded-lg border border-border/30">
                <input
                  type="checkbox"
                  id="invincible"
                  checked={selectedFoliage.isInvincible}
                  onChange={(e) => setSelectedFoliage({ ...selectedFoliage, isInvincible: e.target.checked })}
                  className="accent-primary w-4 h-4"
                />
                <label htmlFor="invincible" className="text-[12px] text-foreground cursor-pointer font-medium">Is Invincible / Unbreakable</label>
              </div>

              {!selectedFoliage.isInvincible && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Health Points</label>
                    <input
                      type="number"
                      value={selectedFoliage.health || 0}
                      onChange={(e) => setSelectedFoliage({ ...selectedFoliage, health: parseInt(e.target.value) })}
                      className="w-full bg-card/60 border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Respawn Rate (seconds)</label>
                    <input
                      type="number"
                      value={selectedFoliage.respawnRate || 0}
                      onChange={(e) => setSelectedFoliage({ ...selectedFoliage, respawnRate: parseInt(e.target.value) })}
                      className="w-full bg-card/60 border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
            Select an environment item to edit
          </div>
        )}
      </div>
    </div>
  );
};
