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
    try {
      fs.copyFileSync(
        path.join(releaseDir, latestExe),
        path.join(distDir, 'Saints Gaming.exe')
      );
      fs.copyFileSync(
        path.join(releaseDir, latestExe),
        path.join(distDir, 'Saints World Studio.exe')
      );
      console.log(`[✓] Successfully placed latest executable (${latestExe}) in dist/Saints Gaming.exe`);

      // Also place in public/downloads for website download endpoints
      try {
        const pkg = require('../package.json');
        const cleanVersion = (pkg.version || '2.1.712').replace(/^v/, '');
        const publicDownloadsDir = path.resolve(__dirname, '../../public/downloads');
        if (!fs.existsSync(publicDownloadsDir)) {
          fs.mkdirSync(publicDownloadsDir, { recursive: true });
        }
        fs.copyFileSync(
          path.join(releaseDir, latestExe),
          path.join(publicDownloadsDir, 'Saints Gaming.exe')
        );
        fs.copyFileSync(
          path.join(releaseDir, latestExe),
          path.join(publicDownloadsDir, `SaintsWorldStudio-Setup-${cleanVersion}.exe`)
        );
        console.log(`[✓] Synced installer to public/downloads/ for web download endpoints`);
      } catch (pubErr) {
        console.warn(`[!] Note: Could not sync to public/downloads:`, pubErr.message);
      }
    } catch (err) {
      console.warn(`[!] Note: dist/ executable is currently locked or running. Release executable is available at release/${latestExe}`);
    }
  }

  // Also sync win-unpacked folder into dist/win-unpacked
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    try {
      fs.cpSync(unpackedDir, path.join(distDir, 'win-unpacked'), { recursive: true, force: true });
      console.log(`[✓] Synced unpacked binaries to dist/win-unpacked/`);
    } catch (err) {
      console.warn(`[!] Note: dist/win-unpacked is currently locked or running.`);
    }
  }
}
