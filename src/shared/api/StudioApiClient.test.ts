import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioApiClient } from './StudioApiClient';

describe('StudioApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('formats URLs correctly with and without base URL', () => {
    const client = new StudioApiClient({ baseUrl: 'https://saintsgaming.com/' });
    expect(client.getBaseUrl()).toBe('https://saintsgaming.com');

    client.setBaseUrl('http://localhost:3000');
    expect(client.getBaseUrl()).toBe('http://localhost:3000');
  });

  it('sends Bearer token from token getter', async () => {
    const client = new StudioApiClient({
      baseUrl: 'https://saintsgaming.com',
      getToken: () => 'test_token_123',
    });

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, user: { id: 'u1', username: 'SaintDeveloper' } }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await client.verifyAuth();

    expect(result.valid).toBe(true);
    expect(result.user?.username).toBe('SaintDeveloper');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://saintsgaming.com/api/auth/studio-token',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test_token_123',
        }),
      })
    );
  });

  it('handles saveMap with payload', async () => {
    const client = new StudioApiClient({
      baseUrl: 'http://localhost:3000',
      getToken: () => 'token_xyz',
    });

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await client.saveMap('DEMO_MAP', { width: 32, height: 32 });

    expect(res.ok).toBe(true);
    expect(res.mapId).toBe('DEMO_MAP');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/maps/DEMO_MAP',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_xyz',
        }),
        body: JSON.stringify({ width: 32, height: 32 }),
      })
    );
  });
});
