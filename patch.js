const fs = require('fs');
let code = fs.readFileSync('src/shared/game/tilePaint.ts', 'utf8');

code = code.replace(/const label = (.*?);/g, 'const label = target.kind === "logic" ? "the logic grid" : target.kind === "region" ? "the regions grid" : target.kind === "visual" ? `layer ${target.layerIdx}` : "unknown";');

code = code.replace(/const grid = target\.kind === "logic" \? map\?\.grid \: target\.kind === "region" \? map\?\.regions \: map\?\.tileLayers\?\.\[target\.layerIdx\]\?\.grid;/g, 'const grid = target.kind === "logic" ? map?.grid : target.kind === "region" ? map?.regions : target.kind === "visual" ? map?.tileLayers?.[target.layerIdx]?.grid : undefined;');

code = code.replace(/const grid = target\.kind === "logic" \? map\.grid \: map\.tileLayers\?\.\[target\.layerIdx\]\?\.grid;/g, 'const grid = target.kind === "logic" ? map.grid : target.kind === "region" ? map.regions : target.kind === "visual" ? map.tileLayers?.[target.layerIdx]?.grid : undefined;');

code = code.replace(/reason: target\.kind === "logic" \? "Logic grid is missing\." : `Layer \$\{target\.layerIdx\} is missing\.`/g, 'reason: target.kind === "logic" ? "Logic grid is missing." : target.kind === "region" ? "Regions grid is missing." : target.kind === "visual" ? `Layer ${target.layerIdx} is missing.` : "Layer is missing."');

code = code.replace(/layerIdx: target\.kind === "logic" \? LOGIC_LAYER_IDX : target\.layerIdx/g, 'layerIdx: target.kind === "logic" ? LOGIC_LAYER_IDX : target.kind === "region" ? REGION_LAYER_IDX : target.kind === "visual" ? target.layerIdx : 0');

fs.writeFileSync('src/shared/game/tilePaint.ts', code);
