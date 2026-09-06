import re

with open(r'c:\Users\Matth\OneDrive\Desktop\Saints Web\src\web\components\the-lobby\editor\panels\StudioSettingsPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Chevron imports
content = content.replace("  Compass,\n} from 'lucide-react';", "  Compass,\n  ChevronDown,\n  ChevronRight,\n} from 'lucide-react';")

# 2. Add state
state_code = """  const [activeTab, setActiveTab] = useState<'comms' | 'capture' | 'visuals' | 'realm' | 'diagnostics' | 'devtools' | 'simulation' | 'streaming'>('visuals');
  const [openVisualSections, setOpenVisualSections] = useState({
    lighting: true,
    atmosphere: false,
    terrain: false,
    environment: false,
  });

  const toggleVisualSection = (key: keyof typeof openVisualSections) => {
    setOpenVisualSections((prev) => ({ ...prev, [key]: !prev[key] }));
    soundSynth?.playUiClick?.();
  };"""
content = content.replace("  const [activeTab, setActiveTab] = useState<'comms' | 'capture' | 'visuals' | 'realm' | 'diagnostics' | 'devtools' | 'simulation' | 'streaming'>('visuals');", state_code)

# Helper function to wrap a section
def wrap_section(content, comment_start, next_comment, state_key, icon_code, title):
    start_idx = content.find(comment_start)
    if start_idx == -1: return content
    
    end_idx = content.find(next_comment, start_idx)
    if end_idx == -1: return content
    
    block = content[start_idx:end_idx]
    title_end_idx = block.find("</div>\n", block.find("uppercase tracking-wider")) + 7
    inner_content = block[title_end_idx:block.rfind("</div>")]
    
    new_block = f"""            {comment_start}
            <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg transition-all">
              <button
                type="button"
                onClick={{() => toggleVisualSection('{state_key}')}}
                className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-[#cbb26a] font-bold text-left hover:bg-black/50/20 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-[11px]">
                  {icon_code} {title}
                </span>
                {{openVisualSections.{state_key} ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}}
              </button>
              {{openVisualSections.{state_key} && (
                <div className="p-3 space-y-3 border-t border-[#806f47]/20 bg-[#050b14]/50">
{inner_content}                </div>
              )}}
            </div>\n\n"""
            
    return content.replace(block, new_block)

# Fix a missing END VISUALS comment
if "{/* ── END VISUALS ── */}" not in content:
    content = content.replace("            {/* ── SOUL LINK CHAT ── */}", "            {/* ── END VISUALS ── */}\n            {/* ── SOUL LINK CHAT ── */}")
    
# There is no END VISUALS comment, but there is "            {activeTab === 'comms' && (" 
content = content.replace("            {activeTab === 'comms'", "            {/* ── END VISUALS ── */}\n            {activeTab === 'comms'")

content = wrap_section(content, "{/* Lighting & Shadows */}", "{/* Atmosphere & Fog */}", "lighting", '<Sun className="w-3.5 h-3.5 text-amber-400" />', "Lighting & Shadow Cascades")
content = wrap_section(content, "{/* Atmosphere & Fog */}", "{/* 2.5D Elevation & Water */}", "atmosphere", '<Sparkles className="w-3.5 h-3.5 text-cyan-400" />', "Atmospheric Fog & Sky Depth")
content = wrap_section(content, "{/* 2.5D Elevation & Water */}", "{/* Environment: Time of Day Atmosphere */}", "terrain", '<Layers className="w-3.5 h-3.5 text-teal-400" />', "Terrain Elevation & Water Simulation")
content = wrap_section(content, "{/* Environment: Time of Day Atmosphere */}", "            {/* ── END VISUALS ── */}", "environment", '<Sparkles className="w-3.5 h-3.5 text-amber-400" />', "Time of Day Atmosphere")

with open(r'c:\Users\Matth\OneDrive\Desktop\Saints Web\src\web\components\the-lobby\editor\panels\StudioSettingsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
