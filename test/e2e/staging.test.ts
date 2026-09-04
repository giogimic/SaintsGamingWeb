// @vitest-environment node
import { describe, it, expect } from 'vitest';

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

describe('Staging Smoke Tests', () => {
  const checkRoute = async (path: string, expectedStatus: number = 200) => {
    const url = `${BASE_URL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      expect(res.status).toBe(expectedStatus);
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to fetch ${url}: ${err.message}`);
    }
  };

  it('should load the game server-status', async () => {
    const res = await checkRoute('/api/game/server-status', 200);
    const body = await res.text();
    expect(body).toBeDefined();
  });

  it('should load the home page', async () => {
    await checkRoute('/home', 200);
  });

  it('should load the forum page', async () => {
    await checkRoute('/forum', 200);
  });

  it('should load the lobby page', async () => {
    await checkRoute('/lobby', 200);
  });

  it('should load the login page', async () => {
    await checkRoute('/login', 200);
  });

  it('should load the servers page', async () => {
    await checkRoute('/servers', 200);
  });

  it('should reject unauthenticated realtime sync auth gate', async () => {
    await checkRoute('/api/realtime/sync', 401);
  });
});
