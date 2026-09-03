const fs = require('fs');
const path = require('path');

const releaseDir = path.resolve(__dirname, '../release');
const distDir = path.resolve(__dirname, '../dist');

if (fs.existsSync(releaseDir)) {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Find latest exe by mtime
  const files = fs.readdirSync(releaseDir);
  const exeFiles = files
    .filter((f) => f.endsWith('.exe'))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(releaseDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (exeFiles.length > 0) {
    const latestExe = exeFiles[0].name;
    fs.copyFileSync(
      path.join(releaseDir, latestExe),
      path.join(distDir, 'Saints World Studio.exe')
    );
    console.log(`[✓] Successfully placed latest executable (${latestExe}) in dist/Saints World Studio.exe`);
  }

  // Also sync win-unpacked folder into dist/win-unpacked
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    fs.cpSync(unpackedDir, path.join(distDir, 'win-unpacked'), { recursive: true, force: true });
    console.log(`[✓] Synced unpacked binaries to dist/win-unpacked/`);
  }
}
