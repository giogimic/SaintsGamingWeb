const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.worldMap.findMany().then(maps => { console.log(maps); prisma.$disconnect(); });
