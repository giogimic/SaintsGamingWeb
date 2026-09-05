import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const isWindows = process.platform === 'win32';

// --- Colors ---
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m';
const BOLD = '\x1b[1m';

function runWithSpinner(msg, command, args) {
    return new Promise((resolve, reject) => {
        const spin = ['-', '\\', '|', '/'];
        let i = 0;
        const startTime = Date.now();
        
        let spinnerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            const timeStr = `${mins}m ${secs.toString().padStart(2, '0')}s`;
            
            process.stdout.write(`\r${CYAN}[${spin[i]}] ${msg} (${timeStr})...\x1b[K`);
            i = (i + 1) % 4;
        }, 200);

        const proc = spawn(command, args, { stdio: 'ignore', shell: isWindows });
        
        proc.on('close', (code) => {
            clearInterval(spinnerInterval);
            process.stdout.write(`\r\x1b[K`); // Clear line
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
        
        proc.on('error', (err) => {
            clearInterval(spinnerInterval);
            process.stdout.write(`\r\x1b[K`);
            reject(err);
        });
    });
}

async function checkCommandExists(cmd) {
    try {
        if (isWindows) {
            execSync(`where ${cmd}`, { stdio: 'ignore' });
        } else {
            execSync(`command -v ${cmd}`, { stdio: 'ignore' });
        }
        return true;
    } catch {
        return false;
    }
}

async function main() {
    console.log(`${CYAN}${BOLD}====================================================${NC}`);
    console.log(`${CYAN}${BOLD}  Saints Gaming — Server Disk & Docker Cleanup${NC}`);
    console.log(`${CYAN}${BOLD}====================================================${NC}\n`);

    // Check disk space before
    console.log(`${CYAN}[*] Current Disk Usage (Before):${NC}`);
    try {
        if (isWindows) {
            console.log(execSync('powershell -Command "Get-Volume"').toString());
        } else {
            console.log(execSync('df -h /').toString());
        }
    } catch (e) {
        console.log(`${YELLOW}Could not read disk usage.${NC}`);
    }
    console.log("");

    const hasDocker = await checkCommandExists('docker');
    if (hasDocker) {
        console.log(`${CYAN}[*] 1. Pruning Docker BuildKit build cache...${NC}`);
        try {
            await runWithSpinner("Reclaiming build cache layers", "docker", ["builder", "prune", "-a", "-f"]);
            console.log(`${GREEN}[✓] Docker build cache cleared successfully.${NC}\n`);
        } catch(e) {}

        console.log(`${CYAN}[*] 2. Pruning dangling & orphaned Docker images...${NC}`);
        try {
            await runWithSpinner("Pruning orphaned images", "docker", ["image", "prune", "-f"]);
            console.log(`${GREEN}[✓] Dangling images removed successfully.${NC}\n`);
        } catch(e) {}

        console.log(`${CYAN}[*] 3. Pruning stopped containers & unused networks...${NC}`);
        try {
            await runWithSpinner("Cleaning stopped containers", "docker", ["container", "prune", "-f"]);
            await runWithSpinner("Cleaning unused networks", "docker", ["network", "prune", "-f"]);
            console.log(`${GREEN}[✓] Unused containers & networks cleared.${NC}\n`);
        } catch(e) {}
    }

    const hasJournalctl = await checkCommandExists('journalctl');
    if (hasJournalctl && !isWindows) {
        console.log(`${CYAN}[*] 4. Vacuuming systemd journal logs to 100MB...${NC}`);
        try {
            await runWithSpinner("Vacuuming journal logs", "sudo", ["journalctl", "--vacuum-size=100M"]);
            console.log(`${GREEN}[✓] System logs vacuumed successfully.${NC}\n`);
        } catch(e) {
            console.log(`${YELLOW}Failed to vacuum journal logs (might require sudo).${NC}\n`);
        }
    }

    console.log(`${CYAN}[*] 5. Cleaning up local build logs & aged backups (>7 days)...${NC}`);
    if (fs.existsSync("docker_build.log")) {
        fs.writeFileSync("docker_build.log", "");
        console.log(`${GREEN}[✓] Truncated docker_build.log${NC}`);
    }

    if (fs.existsSync("backups")) {
        const files = fs.readdirSync("backups");
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        let deletedCount = 0;
        for (const file of files) {
            if (file.startsWith("db_backup_") && file.endsWith(".sql")) {
                const filePath = path.join("backups", file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > sevenDays) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }
        }
        if (deletedCount > 0) {
            console.log(`${GREEN}[✓] Removed ${deletedCount} database backups older than 7 days.${NC}`);
        }
    }

    if (fs.existsSync("node_modules/.cache")) {
        console.log(`\n${CYAN}[*] 6. Clearing Next.js / Webpack / Babel local caches...${NC}`);
        fs.rmSync("node_modules/.cache", { recursive: true, force: true });
        console.log(`${GREEN}[✓] Deleted node_modules/.cache directory.${NC}`);
    }

    if (fs.existsSync(".next/cache")) {
        fs.rmSync(".next/cache", { recursive: true, force: true });
        console.log(`${GREEN}[✓] Deleted .next/cache directory.${NC}`);
    }

    // Check disk space after
    console.log(`\n${CYAN}[*] Current Disk Usage (After):${NC}`);
    try {
        if (isWindows) {
            console.log(execSync('powershell -Command "Get-Volume"').toString());
        } else {
            console.log(execSync('df -h /').toString());
        }
    } catch (e) {}

    console.log(`\n${GREEN}${BOLD}Cleanup Complete!${NC}`);
}

main().catch(console.error);
