/**
 * Saints Gaming Studio — Universal API Client
 *
 * Provides a strongly typed, environment-agnostic HTTP client for Studio
 * operations across Web, Standalone Desktop (Tauri/Electron), and Local Test environments.
 */

export interface StudioApiConfig {
  baseUrl?: string;
  getToken?: () => string | null | Promise<string | null>;
}

export interface StudioSaveMapResult {
  ok: boolean;
  mapId?: string;
  error?: string;
  backendUsed?: string;
}

export interface StudioPublishMapResult {
  ok: boolean;
  mapId?: string;
  publishedVersion?: number;
  error?: string;
}

export interface StudioRollbackMapResult {
  ok: boolean;
  mapId?: string;
  restoredVersion?: number;
  error?: string;
}

export interface StudioMapVersion {
  version: number;
  name: string;
  description?: string;
  publishedBy?: string;
  createdAt: string;
}

export class StudioApiClient {
  private static instance: StudioApiClient | null = null;
  private baseUrl: string = '';
  private tokenGetter: (() => string | null | Promise<string | null>) | null = null;

  constructor(config?: StudioApiConfig) {
    if (config?.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    }
    if (config?.getToken) {
      this.tokenGetter = config.getToken;
    }
  }

  public static getInstance(): StudioApiClient {
    if (!StudioApiClient.instance) {
      StudioApiClient.instance = new StudioApiClient({
        baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
        getToken: () => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem('saints_studio_token');
          }
          return null;
        },
      });
    }
    return StudioApiClient.instance;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setTokenGetter(fn: () => string | null | Promise<string | null>) {
    this.tokenGetter = fn;
  }

  private async getHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (this.tokenGetter) {
      const token = await this.tokenGetter();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if (typeof window !== 'undefined') {
      const token = localStorage.getItem('saints_studio_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private formatUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return this.baseUrl ? `${this.baseUrl}${cleanPath}` : cleanPath;
  }

  /** Verify studio authentication token against the backend */
  public async verifyAuth(): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(this.formatUrl('/api/auth/studio-token'), {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { valid: false, error: err.error || `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { valid: true, user: data.user };
    } catch (e: any) {
      return { valid: false, error: e?.message || 'Network error' };
    }
  }

  /** Save active map draft (32³ voxel + logic layers) */
  public async saveMap(mapId: string, payload: any): Promise<StudioSaveMapResult> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(this.formatUrl(`/api/maps/${encodeURIComponent(mapId)}`), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.error || `Save failed (${res.status})` };
      }

      return { ok: true, mapId };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error saving map' };
    }
  }

  /** Promote saved draft to immutable published version */
  public async publishMap(mapId: string, description?: string): Promise<StudioPublishMapResult> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(this.formatUrl(`/api/maps/${encodeURIComponent(mapId)}/publish`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ description: description || 'Published release from Studio' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.error || `Publish failed (${res.status})` };
      }

      const data = await res.json();
      return { ok: true, mapId, publishedVersion: data.publishedVersion };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error publishing map' };
    }
  }

  /** Rollback map to a historical published snapshot */
  public async rollbackMap(mapId: string, targetVersion: number): Promise<StudioRollbackMapResult> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(this.formatUrl(`/api/maps/${encodeURIComponent(mapId)}/rollback`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetVersion }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.error || `Rollback failed (${res.status})` };
      }

      const data = await res.json();
      return { ok: true, mapId, restoredVersion: data.restoredVersion };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error rolling back map' };
    }
  }

  /** Fetch version history for a map */
  public async fetchVersionHistory(mapId: string): Promise<StudioMapVersion[]> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(this.formatUrl(`/api/maps/${encodeURIComponent(mapId)}/versions`), {
        headers,
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.versions) ? data.versions : [];
    } catch {
      return [];
    }
  }

  /** Fetch map list */
  public async fetchMapList(): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(this.formatUrl('/api/maps'), { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.maps || [];
    } catch {
      return [];
    }
  }

  /** Delete a map */
  public async deleteMap(mapId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(this.formatUrl(`/api/maps/${encodeURIComponent(mapId)}`), {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.error || `Delete failed (${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error deleting map' };
    }
  }
}
