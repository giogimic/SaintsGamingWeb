import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { listServerFiles, deleteServerItem } from './actions';
import { SampManager } from '@/server/sampManager';

// Mock auth to bypass checks
vi.mock('@/auth', () => ({
  auth: vi.fn(() => ({ user: { permissionLevel: 100 } }))
}));

// Mock SampManager to prevent side effects
vi.mock('@/server/sampManager', () => ({
  SampManager: {
    getInstance: vi.fn(() => ({
      isRunning: vi.fn().mockResolvedValue(false),
      getPid: vi.fn().mockResolvedValue(null),
    }))
  }
}));

describe('Server Manager Actions', () => {
  const serverDir = path.join(process.cwd(), 'samp-server');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Path Traversal Protections via listServerFiles', () => {
    it('rejects directory traversal attempts', async () => {
      const result = await listServerFiles('../some-other-dir');
      expect(result.error).toContain('Directory traversal detected');
    });

    it('rejects absolute paths outside the server directory', async () => {
      const result = await listServerFiles('/etc/passwd');
      expect(result.error).toContain('Directory traversal detected');
    });

    it('rejects symbolic links', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'lstatSync').mockReturnValue({ isSymbolicLink: () => true } as any);

      const result = await listServerFiles('symlink.cfg');
      expect(result.error).toContain('Symlinks are not allowed');
    });

    it('rejects paths that resolve outside via realpath', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'lstatSync').mockReturnValue({ isSymbolicLink: () => false } as any);
      vi.spyOn(fs, 'realpathSync').mockImplementation((p: fs.PathLike) => {
         if (p === serverDir) return serverDir;
         return '/etc/passwd';
      });

      const result = await listServerFiles('sneaky.cfg');
      expect(result.error).toContain('Outside of server directory');
    });
  });
});
