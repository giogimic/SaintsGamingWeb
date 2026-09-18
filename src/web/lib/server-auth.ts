import { NextRequest } from "next/server";
import { prisma } from "@/web/lib/prisma";
import crypto from "crypto";

export async function requireServerApiKey(req: NextRequest) {
  const apiKey = req.headers.get("x-server-api-key");

  if (!apiKey) {
    return { error: "Missing x-server-api-key header", status: 401, server: null };
  }

  // Hash the provided API key
  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Find the server with this key
  const server = await prisma.gameServer.findFirst({
    where: {
      apiKeyHash,
      isRemote: true,
      isActive: true,
    },
  });

  if (!server) {
    return { error: "Invalid API key or server inactive", status: 401, server: null };
  }

  return { error: null, status: 200, server };
}
