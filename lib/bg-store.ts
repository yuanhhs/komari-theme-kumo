"use client";

/**
 * IndexedDB-backed store for the visitor's custom background (image OR video).
 * Backgrounds are stored as the original Blob — IndexedDB has no practical size
 * limit like localStorage's ~5 MB, so multi-MB videos persist fine. We hand out
 * object URLs (created at load time) rather than data URLs.
 */

const DB_NAME = "kumo-theme";
const STORE = "kv";
const KEY = "background";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function run<T>(
  mode: IDBTransactionMode,
  make: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = make(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** The persisted background blob (image/video), or null when none / unavailable. */
export async function loadBackgroundBlob(): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const value = await run<Blob | undefined>("readonly", (s) => s.get(KEY));
    return value instanceof Blob ? value : null;
  } catch {
    return null;
  }
}

export async function saveBackgroundBlob(blob: Blob): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
  await run("readwrite", (s) => s.put(blob, KEY));
}

export async function clearBackgroundBlob(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    /* ignore */
  }
}
