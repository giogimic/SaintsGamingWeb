import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.worldMap.findUnique({where:{id:'TEST'}}).then(x => console.log('TEST map:', x)).finally(()=>prisma.$disconnect());
