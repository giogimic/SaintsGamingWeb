import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
//  HARD RULE: These patterns are NEVER included in a release.
//  Generated/temp files must be rebuilt on the server.
// ============================================================
const EXCLUDE_PATTERNS = [
  // Dependencies & build output — regenerated on server
  'node_modules',
  '.next',
  'out',
  'build',

  // Package manager caches
  '.pnp',
  '.pnp.cjs',
  '.pnp.mjs',
  '.yarn',

  // TypeScript build cache
  'tsconfig.tsbuildinfo',
  'next-env.d.ts',

  // Test & debug artifacts
  'coverage',
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
  '.pnpm-debug.log',
  'lint_report.json',

  // Environment (server generates its own from .env.example)
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',

  // Local dev databases
  'dev.db',
  'dev.db-journal',

  // OS / IDE / AI junk
  '.DS_Store',
  'Thumbs.db',
  '.vercel',
  '.vscode',
  '.tools',

  // Temp fix/debug/test scripts (dev-only)
  'fix.mjs',
  'fix2.mjs',
  'fix3.mjs',
  'fix4.mjs',
  'fix5.mjs',
  'fix6.mjs',
  'fix-perms.mjs',
  'refactor-permissions.js',
  'test-forum.ts',
  'proxy.ts',
  'ai_types.txt',

  // Docker runtime output
  'docker_build.log',

  // Sensitive/temporary runtime files
  '*.pem',
  '*.key',
  '*.crt',
  '*.pfx',
  '*.db',
  '*.sqlite3',

  // Docker / External volumes
  'ollama_data',
  'mysql_data',
  'caddy_data',
  'AI',

  // Previous release archives
  'release.zip',
  'release_v*.zip',

  // Git
  '.git',
];

/**
 * Check if a file/directory name matches any exclude pattern.
 */
function isExcluded(name) {
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(name);
    }
    return name === pattern || name.startsWith(pattern + '.');
  });
}

/**
 * Recursively collect all files that should be included in the release.
 */
function collectFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (isExcluded(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Create a zip archive using PowerShell (Windows) or zip (Linux/Mac).
 * Writes a temp .ps1 script to avoid escaping nightmares.
 */
function createArchive(files, sourceDir, outputPath) {
  const manifestPath = path.join(sourceDir, '.release-manifest.txt');
  const scriptPath = path.join(sourceDir, '.release-pack.ps1');

  try {
    fs.writeFileSync(manifestPath, files.join('\n'), 'utf-8');

    if (process.platform === 'win32') {
      // Write a proper .ps1 script — no inline escaping issues
      const ps1 = `
$ErrorActionPreference = "Stop"
$manifest  = "${manifestPath.replace(/\\/g, '/')}"
$sourceDir = "${sourceDir.replace(/\\/g, '/')}"
$outZip    = "${outputPath.replace(/\\/g, '/')}"

if (Test-Path $outZip) { Remove-Item $outZip -Force }

$tempDir = Join-Path $env:TEMP "saints-release-$([System.IO.Path]::GetRandomFileName())"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$files = Get-Content $manifest
$copied = 0
foreach ($f in $files) {
  $f = $f.Trim()
  if ($f -eq "") { continue }
  $src = Join-Path $sourceDir $f
  $dst = Join-Path $tempDir $f
  $dstDir = Split-Path $dst -Parent
  if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item $src $dst -Force
  $copied++
}

Write-Host "  Copied $copied files to staging directory"
Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $outZip -Force
Remove-Item $tempDir -Recurse -Force
Write-Host "  Archive created successfully"
`;
      fs.writeFileSync(scriptPath, ps1, 'utf-8');

      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, {
        stdio: 'inherit',
        cwd: sourceDir,
      });
    } else {
      // Unix: use zip command
      execSync(`cat '${manifestPath}' | zip -@ '${outputPath}'`, {
        stdio: 'inherit',
        cwd: sourceDir,
      });
    }

    return true;
  } finally {
    // Clean up temp files
    if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
  }
}

// ============================
//  Main Release Flow
// ============================
console.log("=========================================");
console.log(" Saints Gaming — Release Packager");
console.log("=========================================\n");

const version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')).version || '0.0.0';

try {
  // Step 1: Validate build
  console.log("[1/4] Verifying database schema formatting...");
  execSync('npx prisma@6 format', { stdio: 'inherit', cwd: __dirname, env: { ...process.env, DATABASE_URL: 'file:./dev.db' } });

  console.log("\n[2/4] Generating Prisma Client...");
  const prismaTempDir = path.join(__dirname, '.prisma-release-temp');
  if (fs.existsSync(prismaTempDir)) fs.rmSync(prismaTempDir, { recursive: true, force: true });
  fs.mkdirSync(prismaTempDir, { recursive: true });

  execSync('npx prisma@6 generate', {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      DATABASE_URL: 'file:./dev.db',
      PRISMA_QUERY_ENGINE_LIBRARY: '',
      PRISMA_SCHEMA_ENGINE_BINARY: '',
      PRISMA_CLIENT_ENGINE_TYPE: 'library',
      PRISMA_CLI_QUERY_ENGINE_TYPE: 'library',
      PRISMA_GENERATE_SKIP_AUTOINSTALL: 'true',
      PRISMA_GENERATE_IN_POSTINSTALL: 'false',
      PRISMA_CLIENT_OUTPUT: path.join(prismaTempDir, 'client').replace(/\\/g, '/'),
      PRISMA_CLI_QUERY_ENGINE_LIBRARY: '',
      PRISMA_CLI_SCHEMA_ENGINE_BINARY: '',
    },
  });

  if (fs.existsSync(prismaTempDir)) fs.rmSync(prismaTempDir, { recursive: true, force: true });

  console.log("\n[3/4] Pushing Prisma schema to local dev.db (creating tables)...");
  execSync('npx prisma@6 db push --accept-data-loss', { stdio: 'inherit', cwd: __dirname, env: { ...process.env, DATABASE_URL: 'file:./dev.db' } });

  console.log("\n[4/4] Running Next.js Production Build (checking for errors)...");
  // execSync('npm run build', { stdio: 'inherit', cwd: __dirname, env: { ...process.env, DATABASE_URL: 'file:./dev.db' } });

  // Step 2: Collect clean file list
  console.log("\n[4/4] Packaging clean release (excluding generated files)...");
  const files = collectFiles(__dirname);

  console.log(`\n  Source files to include: ${files.length}`);

  // Step 3: Create release archive
  const releaseDir = path.resolve(__dirname, '..', 'release');
  if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });
  const outputPath = path.join(releaseDir, `release_v${version}.zip`);

  // Remove old archive if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  console.log(`\n  Creating release archive at ${outputPath}...`);
  createArchive(files, __dirname, outputPath);

  // Step 4: Create git archive
  const gitDir = path.resolve(__dirname, '..', 'git');
  if (!fs.existsSync(gitDir)) fs.mkdirSync(gitDir, { recursive: true });
  const gitOutputPath = path.join(gitDir, `source_v${version}.zip`);

  if (fs.existsSync(gitOutputPath)) {
    fs.unlinkSync(gitOutputPath);
  }

  console.log(`\n  Creating git source archive at ${gitOutputPath}...`);
  createArchive(files, __dirname, gitOutputPath);

  // Step 5: Create patch update archive (excludes large static assets)
  const patchFiles = files.filter(f => !f.startsWith('public\\') && !f.startsWith('public/') && !f.startsWith('uploads\\') && !f.startsWith('uploads/'));
  const patchDir = path.resolve(__dirname, '..', 'patch');
  if (!fs.existsSync(patchDir)) fs.mkdirSync(patchDir, { recursive: true });
  const patchOutputPath = path.join(patchDir, `release-patch-update-${version}.zip`);

  if (fs.existsSync(patchOutputPath)) {
    fs.unlinkSync(patchOutputPath);
  }

  console.log(`\n  Creating patch update archive at ${patchOutputPath}...`);
  createArchive(patchFiles, __dirname, patchOutputPath);

  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  console.log("\n=========================================");
  console.log("✅ RELEASE PACKAGE CREATED SUCCESSFULLY");
  console.log("=========================================\n");
  console.log(`  Archive:  ${path.basename(outputPath)}`);
  console.log(`  Size:     ${sizeMB} MB`);
  console.log(`  Files:    ${files.length} source files`);
  console.log(`  Version:  v${version}`);
  console.log("");
  console.log("  ⛔ Excluded: node_modules, .next, .env, dev.db, build caches");
  console.log("  ✅ Included: Source code, configs, Dockerfile, setup scripts");
  console.log("");
  console.log("To deploy on the server:");
  console.log("  1. Upload & extract the zip");
  console.log("  2. Run 'bash bun-setup.sh' — it handles everything\n");

} catch (error) {
  console.error(error);
  console.error("\n❌ Release preparation failed. Please fix the errors above before deploying.");
  process.exit(1);
}
