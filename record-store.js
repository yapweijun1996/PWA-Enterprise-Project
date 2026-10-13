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
  // Check and write in the same transaction so another tab cannot replace a final snapshot.
  async function saveChecked(record, check) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let failure;
        store.get(record.id).onsuccess = event => {
          try { check(event.target.result, record); store.put(record); }
          catch (error) { failure = error; tx.abort(); }
        };
        tx.oncomplete = () => resolve(record.id);
        tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Local write failed.'));
      });
    } finally { db.close(); }
  }
  // A readwrite transaction serializes competing tabs; add never replaces a record.
  async function createIfAbsent(record, check) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let result, failure;
        store.get(record.id).onsuccess = event => {
          const existing = event.target.result;
          if (existing !== undefined) { result = { created: false, record: existing }; return; }
          try {
            if (check) check(undefined, record);
            store.add(record);
            result = { created: true, record };
          } catch (error) { failure = error; tx.abort(); }
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Local create failed.'));
      });
    } finally { db.close(); }
  }
  async function removeIfPresent(id) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let removed = false;
        store.get(id).onsuccess = event => {
          if (event.target.result !== undefined) { store.delete(id); removed = true; }
        };
        tx.oncomplete = () => resolve(removed);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Local removal failed.'));
      });
    } finally { db.close(); }
  }
  return { open, list: () => transaction('readonly', store => store.getAll()), get: id => transaction('readonly', store => store.get(id)), save: record => transaction('readwrite', store => store.put(record)), saveChecked, createIfAbsent, removeIfPresent, remove: id => transaction('readwrite', store => store.delete(id)), clear: () => transaction('readwrite', store => store.clear()) };
}
