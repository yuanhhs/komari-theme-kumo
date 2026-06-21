"use client";

/**
 * IndexedDB-backed store for visitor customizations. Media is stored as the
 * original Blob — IndexedDB has no practical size limit like localStorage's
 * ~5 MB, so multi-MB videos persist fine. We hand out object URLs (created at
 * load time) rather than data URLs.
 */

const DB_NAME = "kumo-theme";
const STORE = "kv";
const BACKGROUND_KEY = "background";
const LOGO_KEY = "logo";
const SITE_NAME_KEY = "site-name";

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
  return loadBlob(BACKGROUND_KEY);
}

export async function saveBackgroundBlob(blob: Blob): Promise<void> {
  return saveBlob(BACKGROUND_KEY, blob);
}

export async function clearBackgroundBlob(): Promise<void> {
  return clearBlob(BACKGROUND_KEY);
}

export async function loadLogoBlob(): Promise<Blob | null> {
  return loadBlob(LOGO_KEY);
}

export async function saveLogoBlob(blob: Blob): Promise<void> {
  return saveBlob(LOGO_KEY, blob);
}

export async function clearLogoBlob(): Promise<void> {
  return clearBlob(LOGO_KEY);
}

export async function loadSiteName(): Promise<string | null> {
  return loadString(SITE_NAME_KEY);
}

export async function saveSiteName(name: string): Promise<void> {
  return saveString(SITE_NAME_KEY, name);
}

export async function clearSiteName(): Promise<void> {
  return clearValue(SITE_NAME_KEY);
}

async function loadBlob(key: string): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const value = await run<Blob | undefined>("readonly", (s) => s.get(key));
    return value instanceof Blob ? value : null;
  } catch {
    return null;
  }
}

async function saveBlob(key: string, blob: Blob): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
  await run("readwrite", (s) => s.put(blob, key));
}

async function clearBlob(key: string): Promise<void> {
  return clearValue(key);
}

async function loadString(key: string): Promise<string | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const value = await run<string | undefined>("readonly", (s) => s.get(key));
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

async function saveString(key: string, value: string): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
  await run("readwrite", (s) => s.put(value, key));
}

async function clearValue(key: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await run("readwrite", (s) => s.delete(key));
  } catch {
    /* ignore */
  }
}
