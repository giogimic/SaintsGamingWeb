import { describe, it, expect } from 'vitest';
import { generateStudioToken, hashStudioToken } from './studioApiAuth';

describe('studioApiAuth', () => {
  it('generates secure studio tokens with expected prefix', () => {
    const token = generateStudioToken();
    expect(token).toMatch(/^sg_studio_[a-f0-9]{64}$/);
  });

  it('consistently hashes tokens using sha256', () => {
    const token = 'sg_studio_testtoken12345';
    const hash1 = hashStudioToken(token);
    const hash2 = hashStudioToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string length
    expect(hash1).not.toBe(token);
  });
});
