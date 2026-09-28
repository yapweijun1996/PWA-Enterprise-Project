const DATABASE = 'constructclaim-demo-v1';
const STORE = 'drafts';

export function openDrafts() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('Local browser storage is unavailable'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local storage.'));
    request.onblocked = () => reject(new Error('Close other demo tabs, then retry.'));
  });
}

async function transaction(mode, action) {
  const db = await openDrafts();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Local write failed.'));
      tx.onabort = () => reject(tx.error || new Error('Local write was cancelled.'));
    });
  } finally {
    db.close();
  }
}

export const listDrafts = () => transaction('readonly', store => store.getAll());
export const saveDraft = draft => transaction('readwrite', store => store.put(draft));
export const removeDraft = id => transaction('readwrite', store => store.delete(id));
export const clearDrafts = () => transaction('readwrite', store => store.clear());
