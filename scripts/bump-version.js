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
    [/2\.1\.76/g, '2.1.77']
]);
fixFile('app/(ucp)/layout.tsx', [
    [/2\.1\.75/g, '2.1.77']
]);
fixFile('app/actions/settings.ts', [
    [/v2\.1\.75/g, 'v2.1.77']
]);
fixFile('app/(main)/admin/settings/page.tsx', [
    [/2\.1\.75/g, '2.1.77']
]);
fixFile('src/shared/components/navbar.tsx', [
    [/2\.1\.75/g, '2.1.77']
]);
