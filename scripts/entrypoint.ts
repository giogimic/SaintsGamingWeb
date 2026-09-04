import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command: string, args: string[], ignoreErrors = false): boolean {
  console.log(`[*] Running: ${command} ${args.join(" ")}`);
  try {
    execSync(`${command} ${args.join(" ")}`, { stdio: "inherit", env: process.env });
    return true;
  } catch (err) {
    if (!ignoreErrors) {
      console.error(`[!] ERROR: Command failed: ${command} ${args.join(" ")}`);
      return false;
    }
    return false;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "mysql://saints_user:saints_pass@localhost:3306/saints_gaming";
    console.log(`[*] Warning: DATABASE_URL not set. Defaulting to ${process.env.DATABASE_URL}`);
  }

  console.log("[*] Starting Saints Gaming...");

  if (process.env.DB_SKIP_MIGRATION !== "true") {
    const prepareScript = path.join(process.cwd(), "scripts", "prepare-prisma.js");
    if (fs.existsSync(prepareScript)) {
      runCommand("node", ["scripts/prepare-prisma.js"], true);
    }

    console.log("[*] Regenerating Prisma client for current environment...");
    if (!runCommand("npx", ["prisma", "generate"])) {
      console.error("[!] ERROR: Prisma client generation failed! Aborting startup.");
      process.exit(1);
    }

    if (process.env.DB_PROVIDER === "mysql") {
      console.log("[*] Ensuring MariaDB is ready (Docker healthcheck already passed)...");
      await sleep(3000);
    }

    console.log("[*] Pushing database schema...");
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    if (fs.existsSync(migrationsDir)) {
      fs.rmSync(migrationsDir, { recursive: true, force: true });
    }

    if (!runCommand("npx", ["prisma", "db", "push", "--accept-data-loss"])) {
      console.error("[!] ERROR: Database migration failed! Aborting startup.");
      process.exit(1);
    }
    
    console.log("[✓] Database schema ready.");
    console.log("[*] Demo maps/NPCs seed via server.ts bootstrapDemoContent() on every boot.");
  } else {
    console.log("[*] Skipping schema migration (DB_SKIP_MIGRATION=true).");
  }

  console.log(`[*] Starting Saints Gaming (custom server.ts on port ${process.env.PORT || 3000})...`);
  
  // Use spawn to correctly replace the process (similar to exec in bash) 
  // Wait, Node.js doesn't natively have exec(3) to replace the process without C extensions, 
  // but we can spawn and pipe IO.
  const child = spawn("npm", ["run", "start"], {
    stdio: "inherit",
    env: process.env,
    shell: true
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch(console.error);
