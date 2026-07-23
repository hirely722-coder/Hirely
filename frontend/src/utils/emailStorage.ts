/**
 * Client-Side IndexedDB Storage Helper for Email Communication Center
 * Ensures zero raw email storage in Supabase DB and 100% agency privacy.
 */

export interface CachedMessage {
  id: string;
  threadId: string;
  messageId?: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash';
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
}

const DB_NAME = 'HirelyEmailStore';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'storageKey' });
        store.createIndex('workspaceKey', 'workspaceKey', { unique: false });
        store.createIndex('folder', 'folder', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedMessages(workspaceId: string, folder = 'inbox'): Promise<CachedMessage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('workspaceKey');
      const key = `${workspaceId}_${folder}`;
      const request = index.getAll(key);

      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results.map(r => r.message));
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn('[IndexedDB] Get error:', e);
    return [];
  }
}

export async function getAllWorkspaceMessages(workspaceId: string): Promise<CachedMessage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const filtered = results
          .filter(r => r.storageKey.startsWith(`${workspaceId}_`))
          .map(r => r.message);
        resolve(filtered);
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn('[IndexedDB] getAllWorkspaceMessages error:', e);
    return [];
  }
}

export async function saveCachedMessages(workspaceId: string, messages: CachedMessage[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const msg of messages) {
      const folder = msg.folder || 'inbox';
      const storageKey = `${workspaceId}_${folder}_${msg.id}`;
      const workspaceKey = `${workspaceId}_${folder}`;
      store.put({ storageKey, workspaceKey, message: msg });
    }
  } catch (e) {
    console.warn('[IndexedDB] Save error:', e);
  }
}
