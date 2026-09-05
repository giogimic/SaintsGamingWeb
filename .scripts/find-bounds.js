const fs = require('fs');
let code = fs.readFileSync('src/web/components/the-lobby/index.tsx', 'utf8');
const lines = code.split('\\n');
console.log('Socket start:', lines.findIndex(l => l.includes('// SOCKET.IO CONNECTION')));
console.log('Socket end:', lines.findIndex(l => l.includes('}, [activeCharacterId, status, session?.user?.id, enableStudio]);')));
console.log('Engine start:', lines.findIndex(l => l.includes('{enableStudio && <MidnightTropicalBackground />}')));
console.log('Engine end:', lines.findIndex(l => l.includes('onMapClick={(r, c) => {')));
console.log('Overlay start:', lines.findIndex(l => l.includes("gameMode === 'BATTLE' && !suppressGameplay && <TurnBattleOverlay />")));
console.log('Overlay end:', lines.findIndex((l, i) => i > 1850 && l.includes('</HudErrorBoundary>') && lines[i+2] && lines[i+2].includes('</div>')));
