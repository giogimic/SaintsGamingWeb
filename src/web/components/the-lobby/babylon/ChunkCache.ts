export class ChunkCache {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'SaintsVoxelCache';
  private readonly storeName = 'chunks';
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  async saveChunk(mapId: string, cx: number, cy: number, cz: number, data: Uint8Array): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const key = `${mapId}_${cx}_${cy}_${cz}`;
        
        const request = store.put(data, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async loadChunk(mapId: string, cx: number, cy: number, cz: number): Promise<Uint8Array | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const key = `${mapId}_${cx}_${cy}_${cz}`;
        
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result as Uint8Array || null);
        };
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async clearMap(mapId: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.openCursor();
        
        request.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
            const key = cursor.key as string;
            if (key.startsWith(`${mapId}_`)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }
}

export const voxelChunkCache = new ChunkCache();
