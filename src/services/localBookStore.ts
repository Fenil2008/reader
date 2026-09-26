// IndexedDB store for zero-downtime, high-capacity e-book binary storage
const DB_NAME = 'lumina_reader_db';
const STORE_NAME = 'book_files';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not defined'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const LocalBookStore = {
  async saveFile(key: string, file: Blob): Promise<string> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(file, key);
        req.onsuccess = () => resolve(`indexeddb://${key}`);
        req.onerror = () => reject(req.error);
      });
    } catch {
      // In-memory fallback
      return URL.createObjectURL(file);
    }
  },

  async getFile(key: string): Promise<Blob | null> {
    try {
      const cleanKey = key.replace('indexeddb://', '');
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(cleanKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  async resolveBookUrl(url: string): Promise<string> {
    if (!url) return '';
    if (url.startsWith('indexeddb://')) {
      const blob = await this.getFile(url);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    }
    return url;
  }
};
