const fs = require('fs');
let content = fs.readFileSync('CHANGELOG.md', 'utf8');
const newLog = `## 2.1.873
- **True Restore Logic Implemented:** Added restoreWorldRelease server action that safely reconstructs a working world state from an immutable snapshot without mutating the source release.
- **Persistent Player Location:** Updated Go server and client to persist and prioritize lastMapId and coordinates from GameCharacter, ensuring location survival across releases.
- **Studio Version Manager Restructured:** Removed ambiguous map-saving logic, added explicit 'Publish World' actions to VersionManagerPanel and Studio menus.
- **Architectural Schema Alignment:** Completed the migration from gameId to projectId across API routes, VoxelWorldDoc types, and test suites.

`;
fs.writeFileSync('CHANGELOG.md', newLog + content);
console.log('Changelog updated');
