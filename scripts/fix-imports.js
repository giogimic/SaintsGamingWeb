const fs = require('fs');

function fixFile(file, replacements) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        console.log("Fixed " + file);
        fs.writeFileSync(file, content, 'utf8');
    }
}

fixFile('app/(main)/layout.tsx', [
    [/@\/shared\/components\/shared\//g, '@/shared/components/']
]);
fixFile('app/(ucp)/layout.tsx', [
    [/@\/shared\/components\/shared\//g, '@/shared/components/']
]);
fixFile('app/game/page.tsx', [
    [/@\/engine\/ui\/game\//g, '@/engine/ui/']
]);
fixFile('app/layout.tsx', [
    [/@\/shared\/components\/shared\//g, '@/shared/components/'],
    [/@\/editor\/dev\//g, '@/editor/']
]);
fixFile('auth.ts', [
    [/@\/lib\/prisma/g, '@/web/lib/prisma'],
    [/@\/lib\/validators/g, '@/shared/lib/validators'],
    [/@\/lib\/achievements/g, '@/web/lib/achievements']
]);
fixFile('server.ts', [
    [/\.\/lib\/game-server\//g, './src/server/']
]);
fixFile('src/engine/BabylonEngine.ts', [
    [/\.\.\/\.\.\/components\/the-lobby\/data\/tileset-sizes/g, '../web/components/the-lobby/data/tileset-sizes']
]);
fixFile('src/game/CharacterClassSystem.ts', [
    [/\.\/assets\/AssetManager/g, '../engine/assets/AssetManager']
]);
fixFile('src/shared/components/navbar.tsx', [
    [/@\/shared\/components\/shared\//g, '@/shared/components/'],
    [/\.\.\/\.\.\/package\.json/g, '../../../package.json']
]);
