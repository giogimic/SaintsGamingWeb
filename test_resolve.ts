const { resolveModelAssetUrl, getCanonicalModelDef } = require('./src/shared/game/worldModelPresentation.ts');

console.log("Asian Girl:", resolveModelAssetUrl('asian_girl'));
console.log("Leoverse:", resolveModelAssetUrl('leoverse'));
console.log("Citizens:", resolveModelAssetUrl('citizens'));
console.log("Def Asian Girl:", getCanonicalModelDef('asian_girl'));
