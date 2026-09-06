import sys
import re

file_path = r'c:\Users\Matth\OneDrive\Desktop\Saints Web\src\web\components\the-lobby\editor\panels\MapListPanel.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<div className="flex flex-col h-full bg-[#050b14]'
end_marker = '{/* ═══════════════════════════════════════════════════════════\n          POPOUT WINDOW: CREATE NEW REALM MAP'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Failed to find markers')
    sys.exit(1)

new_ui = """<div className="flex flex-col h-full bg-[#050b14] text-slate-200 font-mono select-none overflow-hidden">
      {/* ── SIDEBAR HEADER ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#081220] border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {studioMode === 'voxel' ? 'Voxel Maps' : 'Tile Maps'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => mutateMaps()} className="p-1 rounded text-muted-foreground hover:text-slate-200 hover:bg-white/10" title="Reload">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <button onClick={() => setShowCreateModal(true)} className="p-1 rounded text-primary hover:bg-primary/20" title="New Map">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="p-2 shrink-0 border-b border-border/20">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search maps..."
            className="w-full pl-7 pr-2 py-1 bg-black/40 border border-border/40 rounded text-xs text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* ── DIRECTORY TREE ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {categories.filter(c => c !== 'ALL').map(cat => {
          const catMaps = filtered.filter(m => (m.category || 'Town') === cat);
          if (catMaps.length === 0) return null;
          return (
            <div key={cat} className="mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="w-3 h-3 flex items-center justify-center"><ArrowRight className="w-2 h-2" /></div>
                {cat} ({catMaps.length})
              </div>
              <div className="flex flex-col">
                {catMaps.map(map => {
                  const isCurrent = (currentMapId || '').toUpperCase() === map.id.toUpperCase();
                  const pubVersion = (map as any).publishedVersion || (map as any).version || 1;
                  return (
                    <div
                      key={map.id}
                      onClick={() => handleWarp(map.id)}
                      className={`group flex items-center justify-between px-2 py-1 mx-1 rounded cursor-pointer transition-colors ${
                        isCurrent ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Compass className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <div className="min-w-0">
                          <div className={`text-xs truncate ${isCurrent ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                            {map.name || map.id}
                          </div>
                          <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="truncate">{map.id}</span>
                            <span className="px-1 rounded bg-black/30 text-amber-500/80">v{pubVersion}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0 bg-[#050b14]/80 px-1 rounded" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <button onClick={() => setSettingsModalMapId(map.id)} className="p-1 text-slate-400 hover:text-white" title="Settings">
                            <Settings className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => handleOpenVersions(map.id)} className="p-1 text-slate-400 hover:text-amber-300" title="History">
                          <History className="w-3 h-3" />
                        </button>
                        {canEdit && map.id.toUpperCase() !== spawnMapId && (
                          <button onClick={() => setDeleteTargetMapId(map.id)} className="p-1 text-slate-400 hover:text-rose-400" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No maps found.
          </div>
        )}
      </div>

      """

new_content = content[:start_idx] + new_ui + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('UI replaced successfully')
