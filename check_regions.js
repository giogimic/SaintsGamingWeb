const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.worldMapVersionRegion.findMany({ 
  where: { mapId: 'STARTING_MEADOW', version: 1 }, 
  select: { regionX: true, regionZ: true } 
}).then(regions => { 
  console.log(JSON.stringify(regions, null, 2)); 
  prisma.$disconnect(); 
});
