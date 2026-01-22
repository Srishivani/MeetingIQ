import type { ConversationRecord } from "@/lib/conversations";

const DB_NAME = "convoiq";
const DB_VERSION = 1;
const STORE = "conversations";

type StoredConversation = {
  id: string;
  title: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  status: ConversationRecord["status"];
  audioBlob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          reject(transaction.error ?? new Error("IndexedDB transaction failed"));
          db.close();
        };
      }),
  );
}

export async function idbPutConversation(record: ConversationRecord) {
  const stored: StoredConversation = { ...record };
  await tx("readwrite", (store) => store.put(stored));
}

export async function idbGetConversation(id: string): Promise<ConversationRecord | null> {
  const res = await tx<StoredConversation | undefined>("readonly", (store) => store.get(id));
  return res ? ({ ...res } as ConversationRecord) : null;
}

export async function idbDeleteConversation(id: string) {
  await tx("readwrite", (store) => store.delete(id));
}

export async function idbListConversations(): Promise<Omit<ConversationRecord, "audioBlob">[]> {
  const all = await tx<StoredConversation[]>("readonly", (store) => store.getAll());
  return all
    .map(({ audioBlob: _audioBlob, ...meta }) => meta)
    .sort((a, b) => b.createdAt - a.createdAt);
}
