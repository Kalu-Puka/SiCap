export interface CustomFont {
  id: string;
  name: string;
  family: string;
  fontType: 'unicode' | 'legacy';
  data: ArrayBuffer;
}

const DB_NAME = 'sicaps-fonts-db';
const STORE_NAME = 'fonts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFont(
  name: string,
  family: string,
  fontType: 'unicode' | 'legacy',
  data: ArrayBuffer
): Promise<CustomFont> {
  const db = await openDB();
  const font: CustomFont = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    family,
    fontType,
    data,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(font);
    request.onsuccess = () => resolve(font);
    request.onerror = () => reject(request.error);
  });
}

export async function getFonts(): Promise<CustomFont[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[සිCaps fontDb] IndexedDB not available, returning empty list:', err);
    return [];
  }
}

export async function deleteFont(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Convert an ArrayBuffer to a Base64 string for exporting to server
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
