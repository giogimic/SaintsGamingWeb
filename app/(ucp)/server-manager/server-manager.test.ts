import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { getSafePath, listServerFiles } from './actions';
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

  describe('getSafePath', () => {
    it('allows valid paths within the server directory', () => {
      const validPath = path.join(serverDir, 'server.cfg');
      // Create a dummy file if needed, or mock fs.existsSync
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'lstatSync').mockReturnValue({ isSymbolicLink: () => false } as any);
      vi.spyOn(fs, 'realpathSync').mockReturnValue(validPath);

      expect(getSafePath('server.cfg')).toBe(validPath);
    });

    it('rejects directory traversal attempts', () => {
      expect(() => getSafePath('../some-other-dir')).toThrow('Directory traversal detected');
      expect(() => getSafePath('gamemodes/../../windows')).toThrow('Directory traversal detected');
    });

    it('rejects absolute paths that are outside the server directory', () => {
      expect(() => getSafePath('/etc/passwd')).toThrow('Directory traversal detected');
    });

    it('rejects symbolic links', () => {
      const symlinkPath = path.join(serverDir, 'symlink.cfg');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'lstatSync').mockReturnValue({ isSymbolicLink: () => true } as any);

      expect(() => getSafePath('symlink.cfg')).toThrow('Symlinks are not allowed');
    });

    it('rejects paths that resolve outside via realpath', () => {
      const outsidePath = path.join(serverDir, 'sneaky.cfg');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'lstatSync').mockReturnValue({ isSymbolicLink: () => false } as any);
      // Mock realpathSync to pretend it resolves to /etc/passwd
      vi.spyOn(fs, 'realpathSync').mockImplementation((p: fs.PathLike) => {
         if (p === serverDir) return serverDir;
         return '/etc/passwd';
      });

      expect(() => getSafePath('sneaky.cfg')).toThrow('Outside of server directory');
    });
  });

  describe('listServerFiles', () => {
    it('returns an error if the directory path attempts traversal', async () => {
      const result = await listServerFiles('../../etc');
      expect(result.error).toBeDefined();
    });
  });
});
