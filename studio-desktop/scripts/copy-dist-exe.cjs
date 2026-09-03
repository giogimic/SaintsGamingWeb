const fs = require('fs');
const path = require('path');

const releaseDir = path.resolve(__dirname, '../release');
const distDir = path.resolve(__dirname, '../dist');

if (fs.existsSync(releaseDir)) {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Find any portable or standalone exe
  const files = fs.readdirSync(releaseDir);
  const exeFile = files.find((f) => f.endsWith('.exe'));
  if (exeFile) {
    fs.copyFileSync(
      path.join(releaseDir, exeFile),
      path.join(distDir, 'Saints World Studio.exe')
    );
    console.log(`[✓] Successfully placed executable in dist/Saints World Studio.exe`);
  }

  // Also sync win-unpacked folder into dist/win-unpacked
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    fs.cpSync(unpackedDir, path.join(distDir, 'win-unpacked'), { recursive: true, force: true });
    console.log(`[✓] Synced unpacked binaries to dist/win-unpacked/`);
  }
}
