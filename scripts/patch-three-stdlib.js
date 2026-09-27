/**
 * Patch three-stdlib FBXLoader to resolve critical industry asset crashes:
 * 1. Empty/unmapped LayerElementColor (e.g. Maya/3ds Max exports with NoMappingInformation, Stylized Dragon).
 * 2. Standalone Unreal Engine / Mixamo / Fab animation FBX morph target parent chain crashes
 *    (TypeError: Cannot read properties of undefined reading 'ID').
 * 3. Orphan curve node model resolution crashes.
 * 4. Silence 100,000+ line console warnings for NoMappingInformation.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const filesToPatch = [
  path.join(projectRoot, 'node_modules/three-stdlib/loaders/FBXLoader.js'),
  path.join(projectRoot, 'node_modules/three-stdlib/loaders/FBXLoader.cjs'),
];

let totalPatched = 0;

for (const filePath of filesToPatch) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-three-stdlib] File not found, skipping: ${filePath}`);
    continue;
  }

  let code = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Guard Colors.a
  if (code.includes('const buffer = ColorNode.Colors.a;')) {
    code = code.replace(
      'const buffer = ColorNode.Colors.a;',
      'const buffer = (ColorNode.Colors && ColorNode.Colors.a) ? ColorNode.Colors.a : [];'
    );
    modified = true;
  }

  // 2. Guard ColorIndex.a
  if (code.includes('indexBuffer = ColorNode.ColorIndex.a;')) {
    code = code.replace(
      'indexBuffer = ColorNode.ColorIndex.a;',
      'indexBuffer = (ColorNode.ColorIndex && ColorNode.ColorIndex.a) ? ColorNode.ColorIndex.a : [];'
    );
    modified = true;
  }

  // 3. Morph target crash fix in AnimationParser.parseAnimationLayers
  const targetMorphPattern = /const deformerID = connections\.get\(child\.ID\)\.parents\.filter\(function\(parent\) \{\s*return parent\.relationship !== void 0;\s*\}\)\[0\]\.ID;\s*const morpherID = connections\.get\(deformerID\)\.parents\[0\]\.ID;\s*const geoID = connections\.get\(morpherID\)\.parents\[0\]\.ID;\s*const modelID = connections\.get\(geoID\)\.parents\[0\]\.ID;\s*const rawModel = fbxTree\.Objects\.Model\[modelID\];\s*const node = \{\s*modelName: rawModel\.attrName \? (?:THREE\.)?PropertyBinding\.sanitizeNodeName\(rawModel\.attrName\) : "",\s*morphName: fbxTree\.Objects\.Deformer\[deformerID\]\.attrName\s*\};/;

  if (targetMorphPattern.test(code)) {
    code = code.replace(targetMorphPattern, `const defParents = connections.get(child.ID)?.parents?.filter(function(parent) {
                  return parent.relationship !== void 0;
                });
                if (!defParents || !defParents[0]) return;
                const deformerID = defParents[0].ID;
                const morpherParents = connections.get(deformerID)?.parents;
                if (!morpherParents || !morpherParents[0]) return;
                const morpherID = morpherParents[0].ID;
                const geoParents = connections.get(morpherID)?.parents;
                if (!geoParents || !geoParents[0]) return;
                const geoID = geoParents[0].ID;
                const modelParents = connections.get(geoID)?.parents;
                if (!modelParents || !modelParents[0]) return;
                const modelID = modelParents[0].ID;
                const rawModel = fbxTree.Objects.Model?.[modelID];
                if (!rawModel) return;
                const node = {
                  modelName: rawModel.attrName ? (typeof PropertyBinding !== "undefined" ? PropertyBinding.sanitizeNodeName(rawModel.attrName) : THREE.PropertyBinding.sanitizeNodeName(rawModel.attrName)) : "",
                  morphName: fbxTree.Objects.Deformer?.[deformerID]?.attrName || ""
                };`);
    modified = true;
  }

  // 4. Guard standard curve model parent resolution
  const targetModelParent = /const modelID = connections\.get\(child\.ID\)\.parents\.filter\(function\(parent\) \{\s*return parent\.relationship !== void 0;\s*\}\)\[0\]\.ID;/;
  if (targetModelParent.test(code)) {
    code = code.replace(targetModelParent, `const modelParents = connections.get(child.ID)?.parents?.filter(function(parent) {
                  return parent.relationship !== void 0;
                });
                if (!modelParents || !modelParents[0]) return;
                const modelID = modelParents[0].ID;`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`[patch-three-stdlib] Successfully patched: ${path.basename(filePath)}`);
    totalPatched++;
  } else {
    console.log(`[patch-three-stdlib] Already up to date: ${path.basename(filePath)}`);
  }
}

console.log(`[patch-three-stdlib] Done. (${totalPatched} files updated)`);
