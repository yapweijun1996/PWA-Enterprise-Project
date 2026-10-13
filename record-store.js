const subscribers = new Set();
let changeChannel = null;

function deliverChange(change) {
  for (const callback of subscribers) {
    try { callback(change); }
    catch (error) {
      if (typeof globalThis.reportError === 'function') globalThis.reportError(error);
      else console.error(error);
    }
  }
}

function browserChannel() {
  if (changeChannel || typeof window === 'undefined' || typeof window.BroadcastChannel !== 'function') return changeChannel;
  try {
    changeChannel = new window.BroadcastChannel('constructclaim-demo-record-changes-v1');
    changeChannel.onmessage = event => {
      const change = event.data;
      if (change && typeof change.database === 'string' && typeof change.storeName === 'string'
        && (change.id === null || typeof change.id === 'string')
        && ['save', 'create', 'remove', 'clear'].includes(change.type)) deliverChange(change);
    };
  } catch { changeChannel = null; }
  return changeChannel;
}

export function subscribeRecordChanges(callback) {
  if (typeof callback !== 'function') throw new TypeError('A record-change callback is required.');
  subscribers.add(callback);
  browserChannel();
  return () => {
    subscribers.delete(callback);
    if (!subscribers.size && changeChannel) { changeChannel.close(); changeChannel = null; }
  };
}

function notifyChange(database, storeName, id, type) {
  const change = { database, storeName, id, type };
  deliverChange(change);
  // Cross-tab invalidation is best effort; navigation/focus refresh remains available.
  try { browserChannel()?.postMessage(change); } catch {}
}

export class RecordConflictError extends Error {
  constructor(reason, record, expectedRevision, actualRevision, actualGeneration = null) {
    const messages = {
      collision: 'This record already exists. Save your input as a new record instead.',
      deleted: 'This record was deleted. Save your input as a new record instead.',
      stale: 'This record changed in another tab. Your input has not replaced the newer record.'
    };
    super(messages[reason]);
    this.name = 'RecordConflictError';
    this.code = 'RECORD_CONFLICT';
    this.reason = reason;
    this.record = structuredClone(record);
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
    this.expectedGeneration = record.storageGeneration ?? null;
    this.actualGeneration = actualGeneration;
  }
}

// This decision runs against the record read inside the same write transaction.
export function prepareRecordWrite(existing, incoming, expectedRevision, check) {
  if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) {
    throw new TypeError('An explicit storage revision or null for creation is required.');
  }
  if (existing !== undefined && JSON.stringify(existing) === JSON.stringify(incoming)) {
    if (check) check(existing, incoming);
    return { record: existing, changed: false };
  }
  const actualRevision = existing === undefined ? null : existing.storageRevision ?? 0;
  const actualGeneration = existing?.storageGeneration ?? null;
  if (expectedRevision === null && existing !== undefined) {
    throw new RecordConflictError('collision', incoming, expectedRevision, actualRevision, actualGeneration);
  }
  if (expectedRevision !== null && existing === undefined) {
    throw new RecordConflictError('deleted', incoming, expectedRevision, actualRevision);
  }
  if (expectedRevision !== null && (actualRevision !== expectedRevision || actualGeneration !== (incoming.storageGeneration ?? null))) {
    throw new RecordConflictError('stale', incoming, expectedRevision, actualRevision, actualGeneration);
  }
  const record = {
    ...incoming, storageRevision: (expectedRevision ?? 0) + 1,
    storageGeneration: actualGeneration ?? globalThis.crypto.randomUUID()
  };
  if (check) check(existing, record);
  return { record, changed: true };
}

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
  // Revision, existence and immutable-domain checks share one serialized transaction.
  async function save(record, expectedRevision, check) {
    const incoming = structuredClone(record);
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let result, failure;
        store.get(incoming.id).onsuccess = event => {
          try {
            result = prepareRecordWrite(event.target.result, incoming, expectedRevision, check);
            if (result.changed) store.put(result.record);
          } catch (error) { failure = error; tx.abort(); }
        };
        tx.oncomplete = () => {
          if (result.changed) notifyChange(database, storeName, incoming.id, 'save');
          resolve(result.record);
        };
        tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Local write failed.'));
      });
    } finally { db.close(); }
  }
  // A readwrite transaction serializes competing tabs; add never replaces a record.
  async function createIfAbsent(record, check) {
    const incoming = structuredClone(record);
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let result, failure;
        store.get(incoming.id).onsuccess = event => {
          const existing = event.target.result;
          if (existing !== undefined) { result = { created: false, record: existing }; return; }
          try {
            const prepared = prepareRecordWrite(undefined, incoming, null, check).record;
            store.add(prepared);
            result = { created: true, record: prepared };
          } catch (error) { failure = error; tx.abort(); }
        };
        tx.oncomplete = () => {
          if (result.created) notifyChange(database, storeName, incoming.id, 'create');
          resolve(result);
        };
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
        tx.oncomplete = () => {
          if (removed) notifyChange(database, storeName, id, 'remove');
          resolve(removed);
        };
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Local removal failed.'));
      });
    } finally { db.close(); }
  }
  async function clear() {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let changed = false;
        store.count().onsuccess = event => {
          if (event.target.result > 0) { store.clear(); changed = true; }
        };
        tx.oncomplete = () => {
          if (changed) notifyChange(database, storeName, null, 'clear');
          resolve();
        };
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Local clear failed.'));
      });
    } finally { db.close(); }
  }
  return {
    open,
    list: () => transaction('readonly', store => store.getAll()),
    get: id => transaction('readonly', store => store.get(id)),
    save, createIfAbsent, removeIfPresent,
    remove: async id => { await removeIfPresent(id); },
    clear
  };
}
