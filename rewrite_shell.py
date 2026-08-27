import re

with open("src/web/components/the-lobby/editor/StudioEditorShell.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove flexlayout imports
content = re.sub(
    r"import \{ Layout, Model, TabNode, IJsonModel, Action, Actions, DockLocation \} from 'flexlayout-react';\n",
    "",
    content
)

# 2. Add DraggablePanel import
content = content.replace(
    "import { RuleDebuggerOverlay } from './RuleDebuggerOverlay';",
    "import { RuleDebuggerOverlay } from './RuleDebuggerOverlay';\nimport { DraggablePanel } from './DraggablePanel';"
)

# 3. Remove initialLayout
content = re.sub(
    r"const initialLayout: IJsonModel = \{[\s\S]*?^};\n",
    "",
    content,
    flags=re.MULTILINE
)

# 4. Remove layoutRef and model state
content = re.sub(r"  const layoutRef = useRef<any>\(null\);\n", "", content)
content = re.sub(r"  const \[model\] = useState\(\(\) => Model\.fromJson\(initialLayout\)\);\n", "", content)

# 5. Fix handleOpenDock to use openPanel
handleOpenDock_replacement = """  useEffect(() => {
    const handleOpenDock = (e: Event) => {
      const customEv = e as CustomEvent<{ panelId: PanelId }>;
      const panelId = customEv.detail?.panelId;
      if (!panelId) return;
      useEditorStore.getState().openPanel(panelId);
    };

    window.addEventListener('studio_open_dock', handleOpenDock);
    return () => window.removeEventListener('studio_open_dock', handleOpenDock);
  }, []);"""
content = re.sub(
    r"  // Handle dynamic dock panel opening[\s\S]*?\}, \[model\]\);",
    "  // Handle dynamic dock panel opening\n" + handleOpenDock_replacement,
    content
)

# 6. Fix handleOpenMapTab
handleOpenMapTab_replacement = """  useEffect(() => {
    const handleOpenMapTab = (e: Event) => {
      // Maps are singletons in the MDI setup - use map browser or world profile bar
    };
    window.addEventListener('studio_open_map_tab', handleOpenMapTab);
    return () => window.removeEventListener('studio_open_map_tab', handleOpenMapTab);
  }, []);"""
content = re.sub(
    r"  // Handle dynamic map tab opening[\s\S]*?\}, \[model\]\);",
    "  // Handle dynamic map tab opening\n" + handleOpenMapTab_replacement,
    content
)

# 7. Remove factory and handleAction
content = re.sub(
    r"  const factory = \(node: TabNode\) => \{[\s\S]*?^  \};\n\n  const handleAction = \(action: Action\) => \{[\s\S]*?^  \};\n",
    "",
    content,
    flags=re.MULTILINE
)

# 8. Replace <Layout ... /> with DraggablePanels
panels_render = """        {/* MDI Free-Floating Windows Workspace Container */}
        <div className={`absolute inset-0 pointer-events-none ${studioMode === 'assets' || studioMode === 'atlas' || studioMode === 'hero' ? 'hidden' : ''}`}>
          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="build" icon={<Hammer className="w-4 h-4" />} title="World Builder">
              <Suspense fallback={<div>Loading...</div>}><WorldBuilderPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'tileset') && (
            <DraggablePanel id="tileset" icon={<Grid3X3 className="w-4 h-4" />} title="Tile Selector">
              <Suspense fallback={<div>Loading...</div>}><TileSelectorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'logic') && (
            <DraggablePanel id="logic" icon={<Layers className="w-4 h-4" />} title="Logic Painter">
              <Suspense fallback={<div>Loading...</div>}><LogicPainterPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'properties') && (
            <DraggablePanel id="properties" icon={<Settings2 className="w-4 h-4" />} title="Properties">
              <Suspense fallback={<div>Loading...</div>}><PropertiesPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'assets') && (
            <DraggablePanel id="assets" icon={<ImageIcon className="w-4 h-4" />} title="Asset Browser">
              <Suspense fallback={<div>Loading...</div>}><AssetBrowserPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'npc') && (
            <DraggablePanel id="npc" icon={<Users className="w-4 h-4" />} title="NPC Editor">
              <Suspense fallback={<div>Loading...</div>}><EntityEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'quest') && (
            <DraggablePanel id="quest" icon={<ScrollText className="w-4 h-4" />} title="Quests">
              <Suspense fallback={<div>Loading...</div>}><QuestEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'dialogue') && (
            <DraggablePanel id="dialogue" icon={<MessageSquare className="w-4 h-4" />} title="Dialogue">
              <Suspense fallback={<div>Loading...</div>}><DialogueEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canDev && (
            <DraggablePanel id="dev" icon={<TerminalSquare className="w-4 h-4" />} title="Dev Tools">
              <Suspense fallback={<div>Loading...</div>}><DevToolsPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'creature') && (
            <DraggablePanel id="creature" icon={<PawPrint className="w-4 h-4" />} title="Creatures">
              <Suspense fallback={<div>Loading...</div>}><CreatureDefEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'loot') && (
            <DraggablePanel id="loot" icon={<Coins className="w-4 h-4" />} title="Loot Manager">
              <Suspense fallback={<div>Loading...</div>}><LootManagerPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'items') && (
            <DraggablePanel id="items" icon={<Package className="w-4 h-4" />} title="Items">
              <Suspense fallback={<div>Loading...</div>}><ItemEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'classes') && (
            <DraggablePanel id="classes" icon={<UserCheck className="w-4 h-4" />} title="Professions">
              <Suspense fallback={<div>Loading...</div>}><ProfessionEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'spawner') && (
            <DraggablePanel id="spawner" icon={<Sword className="w-4 h-4" />} title="Monster Spawner">
              <Suspense fallback={<div>Loading...</div>}><MonsterSpawnerPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'prefab') && (
            <DraggablePanel id="prefab" icon={<Package className="w-4 h-4" />} title="Prefab Builder">
              <Suspense fallback={<div>Loading...</div>}><PrefabBuilderPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'problems') && (
            <DraggablePanel id="problems" icon={<AlertCircle className="w-4 h-4" />} title="Diagnostics">
              <Suspense fallback={<div>Loading...</div>}><StudioProblemsPanel /></Suspense>
            </DraggablePanel>
          )}
        </div>"""
content = re.sub(
    r"        \{/\* FlexLayout Workspace Container — hidden when in Assets, Atlas, or Hero mode \*/\}[\s\S]*?</div>",
    panels_render,
    content
)

# 9. Fix StudioBottomToolbar usage (remove model and layoutRef)
content = re.sub(
    r"        <StudioBottomToolbar\s+layoutRef=\{layoutRef\}\s+model=\{model\}\s+",
    "        <StudioBottomToolbar\n          ",
    content
)

with open("src/web/components/the-lobby/editor/StudioEditorShell.tsx", "w", encoding="utf-8") as f:
    f.write(content)
