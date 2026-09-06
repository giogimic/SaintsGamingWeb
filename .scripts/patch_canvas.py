with open(r'c:\Users\Matth\OneDrive\Desktop\Saints Web\src\web\components\the-lobby\index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'const studioMode = useEditorStore' not in content:
    content = content.replace(
        "const enableStudio = useEditorStore((s) => s.enableStudio);",
        "const enableStudio = useEditorStore((s) => s.enableStudio);\n  const studioMode = useEditorStore((s) => s.studioMode);"
    )

old_block = """      {enableStudio ? (
        <StudioCanvasViewport 
          activeBrushTileId={activeBrushTileId}
          activeLayerIdx={activeLayerIdx}
          isDevEditorOpen={studioToolsOpen}
          suppressGameplay={suppressGameplay}
          onMapClick={(r: number, c: number) => {
            if (studioToolsOpen) setClickedTile({r, c});
          }}
        />
      ) : ("""

new_block = """      {enableStudio ? (
        (studioMode === 'tile' || studioMode === 'voxel') ? (
          <StudioCanvasViewport 
            activeBrushTileId={activeBrushTileId}
            activeLayerIdx={activeLayerIdx}
            isDevEditorOpen={studioToolsOpen}
            suppressGameplay={suppressGameplay}
            onMapClick={(r: number, c: number) => {
              if (studioToolsOpen) setClickedTile({r, c});
            }}
          />
        ) : null
      ) : ("""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Canvas isolation patched successfully!")
else:
    print("Warning: Could not find old_block to patch.")

with open(r'c:\Users\Matth\OneDrive\Desktop\Saints Web\src\web\components\the-lobby\index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
