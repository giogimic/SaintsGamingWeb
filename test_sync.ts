const { syncCanonicalGameAssets } = require('./src/server/assets/canonicalAssetsSync.ts');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Starting sync...");
        const count = await syncCanonicalGameAssets(prisma);
        console.log("Sync successful. Count:", count);
    } catch (e) {
        console.error("Sync failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
