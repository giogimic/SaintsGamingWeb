const fs = require('fs');
const path = require('path');

const releaseDir = path.resolve(__dirname, '../release');
const distDir = path.resolve(__dirname, '../dist');
const publicDownloadsDir = path.resolve(__dirname, '../../public/downloads');

function cleanDirectoryOfArchives(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    const files = fs.readdirSync(directoryPath);
    for (const file of files) {
      if (file.endsWith('.zip') || file.endsWith('.exe')) {
        try {
          fs.unlinkSync(path.join(directoryPath, file));
          console.log(`[✓] Cleaned old file: ${file} from ${directoryPath}`);
        } catch (err) {
          console.warn(`[!] Could not delete old file ${file} in ${directoryPath}:`, err.message);
        }
      }
    }
  }
}

if (fs.existsSync(releaseDir)) {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Find latest zip by mtime in the release directory
  const files = fs.readdirSync(releaseDir);
  const zipFiles = files
    .filter((f) => f.endsWith('.zip'))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(releaseDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (zipFiles.length > 0) {
    const latestZip = zipFiles[0].name;
    
    // Clean old files before copying
    cleanDirectoryOfArchives(distDir);
    cleanDirectoryOfArchives(publicDownloadsDir);

    try {
      fs.copyFileSync(
        path.join(releaseDir, latestZip),
        path.join(distDir, 'Saints-Gaming-Portable.zip')
      );
      console.log(`[✓] Successfully placed latest archive (${latestZip}) in dist/Saints-Gaming-Portable.zip`);

      // Also place in public/downloads for website download endpoints
      try {
        if (!fs.existsSync(publicDownloadsDir)) {
          fs.mkdirSync(publicDownloadsDir, { recursive: true });
        }
        
        fs.copyFileSync(
          path.join(releaseDir, latestZip),
          path.join(publicDownloadsDir, latestZip)
        );
        console.log(`[✓] Synced archive to public/downloads/${latestZip} for web download endpoints`);
      } catch (pubErr) {
        console.warn(`[!] Note: Could not sync to public/downloads:`, pubErr.message);
      }
    } catch (err) {
      console.warn(`[!] Note: dist/ archive is currently locked or running. Release archive is available at release/${latestZip}`);
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
