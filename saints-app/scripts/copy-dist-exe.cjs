const fs = require('fs');
const path = require('path');

const releaseDir = path.resolve(__dirname, '../release');
const publicDownloadsDir = path.resolve(__dirname, '../../public/downloads');
const clientArchiveDir = path.resolve(__dirname, '../Client-Archive');
const clientUnpackedDir = path.resolve(__dirname, '../Client-Unpacked');

function cleanDirectoryOfArchives(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    const files = fs.readdirSync(directoryPath);
    for (const file of files) {
      if (file.endsWith('.zip') || file.endsWith('.exe')) {
        try {
          fs.unlinkSync(path.join(directoryPath, file));
          console.log(`[✓] Cleaned old archive: ${file} from ${path.basename(directoryPath)}`);
        } catch (err) {
          console.warn(`[!] Could not delete old file ${file} in ${path.basename(directoryPath)}:`, err.message);
        }
      }
    }
  }
}

if (fs.existsSync(releaseDir)) {
  // 1. Find latest zip by mtime in the release directory
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

    // 2. Setup Client-Archive directory
    if (!fs.existsSync(clientArchiveDir)) {
      fs.mkdirSync(clientArchiveDir, { recursive: true });
    } else {
      cleanDirectoryOfArchives(clientArchiveDir);
    }
    
    // Clean old files from website download directory
    if (!fs.existsSync(publicDownloadsDir)) {
      fs.mkdirSync(publicDownloadsDir, { recursive: true });
    } else {
      cleanDirectoryOfArchives(publicDownloadsDir);
    }

    // 3. Move the zipped archive to the clean locations
    try {
      fs.copyFileSync(
        path.join(releaseDir, latestZip),
        path.join(clientArchiveDir, latestZip)
      );
      console.log(`[✓] Synced latest archive to Client-Archive/${latestZip}`);

      fs.copyFileSync(
        path.join(releaseDir, latestZip),
        path.join(publicDownloadsDir, latestZip)
      );
      console.log(`[✓] Synced archive to public/downloads/${latestZip} for web download endpoints`);
    } catch (err) {
      console.warn(`[!] Error syncing archive:`, err.message);
    }
  }

  // 4. Move win-unpacked to Client-Unpacked
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    try {
      if (!fs.existsSync(clientUnpackedDir)) {
        fs.mkdirSync(clientUnpackedDir, { recursive: true });
      }
      fs.cpSync(unpackedDir, clientUnpackedDir, { recursive: true, force: true });
      console.log(`[✓] Synced unpacked binaries to Client-Unpacked/ (Ready for direct usage!)`);
    } catch (err) {
      console.warn(`[!] Note: Client-Unpacked is currently locked or running.`);
    }
  }

  // 5. Clean up the messy release directory
  console.log(`[*] Cleaning up intermediate build artifacts in release/...`);
  try {
      if (fs.existsSync(releaseDir)) {
          fs.rmSync(releaseDir, { recursive: true, force: true });
          console.log(`[✓] Cleaned up release directory.`);
      }
  } catch (err) {
      console.warn(`[!] Note: Could not fully clean release directory (files might be in use).`);
  }
}
