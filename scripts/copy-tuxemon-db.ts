import fs from 'fs';
import path from 'path';

const SRC_DIR = 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon\\db';
const DEST_DIR = path.join(process.cwd(), 'tuxemon-db');

function copyFolderRecursiveSync(source: string, target: string) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    for (const file of files) {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    }
  }
}

console.log('[*] Copying Tuxemon db YAML files into repo...');
copyFolderRecursiveSync(SRC_DIR, DEST_DIR);
console.log('[+] Tuxemon db files successfully copied to:', DEST_DIR);
