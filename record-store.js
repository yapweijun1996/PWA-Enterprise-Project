// Separate databases share transaction handling without sharing record ownership.
export function createRecordStore(database, storeName = 'drafts') {
  function open() {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('Local browser storage is unavailable')); return; }
      const request = indexedDB.open(database, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local storage.'));
      request.onblocked = () => reject(new Error('Close other demo tabs, then retry.'));
    });
  }
  async function transaction(mode, action) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = action(tx.objectStore(storeName));
        let result;
        request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error('Local write failed.'));
        tx.onabort = () => reject(tx.error || new Error('Local write was cancelled.'));
      });
    } finally { db.close(); }
  }
  return { open, list: () => transaction('readonly', store => store.getAll()), save: record => transaction('readwrite', store => store.put(record)), remove: id => transaction('readwrite', store => store.delete(id)), clear: () => transaction('readwrite', store => store.clear()) };
}
