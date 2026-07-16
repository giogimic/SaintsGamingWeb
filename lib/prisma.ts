import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const logOptions: ("query" | "error" | "warn")[] = process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"];

  return new PrismaClient({ log: logOptions });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
