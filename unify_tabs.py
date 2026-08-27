import os
import re

PANELS_DIR = "src/web/components/the-lobby/editor/panels"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Strip harsh dark backgrounds from main container / content area
    # Replace bg-[#05080e] or bg-slate-900/x with transparent or lighter sg-glass aesthetics
    content = re.sub(r'bg-\[\#05080e\]', 'bg-transparent', content)
    content = re.sub(r'bg-slate-900/60\s+p-4\s+border\s+border-slate-800\s+rounded-lg', 'sg-glass p-4 rounded-lg', content)
    content = re.sub(r'bg-black/60', 'bg-black/20', content)
    content = re.sub(r'bg-slate-900', 'bg-transparent', content)
    content = re.sub(r'bg-slate-950', 'bg-transparent', content)
    
    # Replace solid inner borders
    content = re.sub(r'border-slate-800', 'border-[#806f47]/20', content)
    content = re.sub(r'border-slate-700', 'border-[#806f47]/30', content)

    # 2. Unify Tab Buttons
    # Pattern: `... ${ activeTab === '...' ? '...bg-amber-500/20...' : '...bg-slate-800...' }`
    # Replace active states with `bg-[#cbb26a]/20 text-[#e2d5b3] border-b-2 border-[#cbb26a]`
    # Replace inactive states with `text-slate-400 hover:text-slate-200 hover:bg-white/5`
    
    # We will use a regex to find button className logic for tabs
    # Example: 
    # activeTab === 'OVERVIEW'
    #   ? 'bg-slate-800 text-amber-300 border-b-2 border-amber-400'
    #   : 'text-slate-400 hover:text-slate-200'
    
    # A bit hard to regex perfectly, let's do targeted replacements for the known color classes
    
    # Inactive hover
    content = re.sub(r'hover:bg-slate-800/40', 'hover:bg-white/5', content)
    content = re.sub(r'hover:bg-slate-800', 'hover:bg-white/5', content)
    
    # Active tab colors - we want them to look premium gold/glass instead of rainbow
    
    # Replace border-b-2 border-amber-400 -> border-b-2 border-[#cbb26a]
    content = re.sub(r'border-b-2 border-amber-400', 'border-b-2 border-[#cbb26a]', content)
    # Replace bg-slate-800 text-amber-300 -> bg-[#cbb26a]/10 text-[#e2d5b3]
    content = re.sub(r'bg-slate-800 text-amber-300', 'bg-[#cbb26a]/10 text-[#e2d5b3]', content)

    # Replace rainbow active tabs in GameplayStudioPanels
    # bg-amber-500/20 text-amber-300 border-t border-x border-amber-500/40
    content = re.sub(r'bg-amber-500/20 text-amber-300 border-t border-x border-amber-500/40', 'bg-[#cbb26a]/20 text-[#e2d5b3] border-t border-x border-[#cbb26a]/40', content)
    content = re.sub(r'bg-rose-500/20 text-rose-300 border-t border-x border-rose-500/40', 'bg-[#cbb26a]/20 text-[#e2d5b3] border-t border-x border-[#cbb26a]/40', content)
    content = re.sub(r'bg-cyan-500/20 text-cyan-300 border-t border-x border-cyan-500/40', 'bg-[#cbb26a]/20 text-[#e2d5b3] border-t border-x border-[#cbb26a]/40', content)
    content = re.sub(r'bg-emerald-500/20 text-emerald-300 border-t border-x border-emerald-500/40', 'bg-[#cbb26a]/20 text-[#e2d5b3] border-t border-x border-[#cbb26a]/40', content)
    content = re.sub(r'bg-purple-500/20 text-purple-300 border-t border-x border-purple-500/40', 'bg-[#cbb26a]/20 text-[#e2d5b3] border-t border-x border-[#cbb26a]/40', content)

    # Replace solid black backgrounds in input elements or lists
    content = re.sub(r'bg-black', 'bg-black/50', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {os.path.basename(filepath)}")

for filename in os.listdir(PANELS_DIR):
    if filename.endswith(".tsx"):
        process_file(os.path.join(PANELS_DIR, filename))
