/**
 * Studio map create → save → reload (API path).
 * Creates a short-lived Admin user, signs in via Auth.js credentials, POSTs a new map, GETs it back.
 *
 * Usage: npx tsx scripts/smoke-studio-map-save.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildNewStudioMap } from "../src/shared/game/studioMapCreate";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = "SmokeMapSave1!";
const USERNAME = "smoke_map_admin";
const EMAIL = "smoke_map_admin@smoke.local";

async function ensureAdmin() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { username: USERNAME } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, permissionLevel: 400, email: EMAIL },
    });
  }
  return prisma.user.create({
    data: {
      username: USERNAME,
      email: EMAIL,
      passwordHash,
      permissionLevel: 400,
      displayName: "Smoke Map Admin",
    },
  });
}

function cookieJar() {
  const jar = new Map<string, string>();
  return {
    store(res: Response) {
      const raw = res.headers.getSetCookie?.() || [];
      for (const line of raw) {
        const [pair] = line.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
    },
    header() {
      return Array.from(jar.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    },
  };
}

async function main() {
  await ensureAdmin();
  const jar = cookieJar();

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  jar.store(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  if (!csrfToken) throw new Error("no csrfToken");

  const loginBody = new URLSearchParams({
    csrfToken,
    identifier: USERNAME,
    password: PASSWORD,
    callbackUrl: `${BASE}/studio`,
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jar.header(),
    },
    body: loginBody.toString(),
    redirect: "manual",
  });
  jar.store(loginRes);
  console.log("[smoke-map-save] login status", loginRes.status);

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: jar.header() },
  });
  const session = await sessionRes.json();
  if (!session?.user?.id) {
    console.error("[smoke-map-save] FAIL session", session);
    process.exit(1);
  }
  console.log("[smoke-map-save] session user", session.user.id, session.user.name || USERNAME);

  const slug = `TEST_P10_${Date.now().toString(36).toUpperCase()}`;
  const built = buildNewStudioMap({ slug, name: "P10 Smoke", width: 16, height: 16 });
  if (!built.ok) throw new Error(built.error);

  // Paint one interior cell to a different grass GID still valid — keep 17, mark a painted cell by ensuring grid presence
  const ground = built.map.tileLayers[0].grid;
  ground[4][4] = 17;
  ground[4][5] = 17;

  const postRes = await fetch(`${BASE}/api/maps/${encodeURIComponent(built.map.id)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: jar.header(),
    },
    body: JSON.stringify(built.map),
  });
  const postJson = await postRes.json().catch(() => ({}));
  console.log("[smoke-map-save] POST", postRes.status, postJson?.id || postJson?.error || postJson);

  if (!postRes.ok) {
    process.exit(1);
  }

  const getRes = await fetch(`${BASE}/api/maps/${encodeURIComponent(built.map.id)}`);
  const saved = await getRes.json();
  const flat = (saved.tileLayers?.[0]?.grid || []).flat();
  const gid17 = flat.filter((x: number) => x === 17).length;
  const hasTilesets = Array.isArray(saved.tilesets) && saved.tilesets.length > 0;

  console.log("[smoke-map-save] GET reload", {
    id: saved.id,
    gid17,
    tilesets: saved.tilesets?.length,
    layers: saved.tileLayers?.length,
  });

  await prisma.$disconnect();

  if (!getRes.ok || !hasTilesets || gid17 < 1) {
    console.error("[smoke-map-save] FAIL reload validation");
    process.exit(1);
  }

  console.log("[smoke-map-save] PASS create→save→reload", built.map.id);
}

main().catch(async (err) => {
  console.error("[smoke-map-save] ERROR", err);
  await prisma.$disconnect();
  process.exit(1);
});
