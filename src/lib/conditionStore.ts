import { useEffect, useState } from 'react';
import type { BenchFinding, ConditionRecord, PhotoStage, PhotoStamp, ShareLink } from '../types';
import { editPhotoStamp } from './photoCheckIn';

/**
 * Photos and condition records go through this interface so a backend can
 * replace the browser store later. IndexedDB keeps the blobs off the
 * localStorage session JSON, which is only agreements and damage flags.
 */
export interface NewPhoto {
  id: string;
  raNumber: string;
  assetTag: string;
  lineKey: string;
  stage: PhotoStage;
  stamp: PhotoStamp;
  blob: Blob;
  findingId?: string;
}

export interface PhotoView {
  id: string;
  raNumber: string;
  assetTag: string;
  lineKey: string;
  stage: PhotoStage;
  stamp: PhotoStamp;
  url: string;
  findingId?: string;
}

export interface AgreementMedia {
  photos: PhotoView[];
  records: ConditionRecord[];
  findings: BenchFinding[];
}

export interface ConditionStore {
  savePhoto(photo: NewPhoto): Promise<void>;
  saveConditionRecord(record: ConditionRecord): Promise<void>;
  saveBenchFinding(finding: BenchFinding): Promise<void>;
  saveShare(link: ShareLink): Promise<void>;
  loadAgreement(raNumber: string): Promise<AgreementMedia>;
  loadLine(lineKey: string): Promise<AgreementMedia>;
  loadShare(token: string): Promise<ShareLink | null>;
}

const DB_NAME = 'rental-desk-condition';
const DB_VERSION = 1;

function toView(photo: NewPhoto, urls: Map<string, string>): PhotoView {
  let url = urls.get(photo.id);
  if (!url) {
    url = URL.createObjectURL(photo.blob);
    urls.set(photo.id, url);
  }
  return {
    id: photo.id,
    raNumber: photo.raNumber,
    assetTag: photo.assetTag,
    lineKey: photo.lineKey,
    stage: photo.stage,
    stamp: photo.stamp,
    url,
    findingId: photo.findingId,
  };
}

export function createMemoryConditionStore(): ConditionStore {
  const photos = new Map<string, NewPhoto>();
  const records = new Map<string, ConditionRecord>();
  const findings = new Map<string, BenchFinding>();
  const shares = new Map<string, ShareLink>();
  const urls = new Map<string, string>();

  function media(
    photoMatch: (photo: NewPhoto) => boolean,
    recordMatch: (record: ConditionRecord) => boolean,
    findingMatch: (finding: BenchFinding) => boolean,
  ): AgreementMedia {
    return {
      photos: [...photos.values()].filter(photoMatch).map((photo) => toView(photo, urls)),
      records: [...records.values()].filter(recordMatch),
      findings: [...findings.values()].filter(findingMatch),
    };
  }

  return {
    async savePhoto(photo) {
      if (photos.has(photo.id)) editPhotoStamp(photo.id);
      photos.set(photo.id, photo);
    },
    async saveConditionRecord(record) {
      records.set(record.id, record);
    },
    async saveBenchFinding(finding) {
      findings.set(finding.id, finding);
    },
    async saveShare(link) {
      shares.set(link.token, link);
    },
    async loadAgreement(raNumber) {
      return media(
        (photo) => photo.raNumber === raNumber,
        (record) => record.raNumber === raNumber,
        (finding) => finding.raNumber === raNumber,
      );
    },
    async loadLine(lineKey) {
      return media(
        (photo) => photo.lineKey === lineKey,
        (record) => record.lineKey === lineKey,
        (finding) => finding.lineKey === lineKey,
      );
    },
    async loadShare(token) {
      return shares.get(token) ?? null;
    },
  };
}

function storageError(error: DOMException | null): Error {
  return error ?? new Error('Condition photo storage failed.');
}

let database: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of ['photos', 'records', 'findings'] as const) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: 'id' });
            store.createIndex('byRa', 'raNumber');
            store.createIndex('byLine', 'lineKey');
          }
        }
        if (!db.objectStoreNames.contains('shares')) {
          db.createObjectStore('shares', { keyPath: 'token' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = null;
        reject(request.error ?? new Error('Could not open condition photo storage.'));
      };
    });
  }
  return database;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isShareLink(value: unknown): value is ShareLink {
  return typeof value === 'object' && value !== null && 'token' in value && 'lineKey' in value;
}

/** Handlers are attached before the first request returns. Awaiting between requests lets the transaction close. */
function addRow(storeName: string, value: object): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => {
          event.preventDefault();
          reject(storageError(tx.error));
        };
        tx.onabort = () => reject(storageError(tx.error));
        tx.objectStore(storeName).add(value);
      }),
  );
}

function readAll<T>(storeName: string, indexName: string, query: string): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).index(indexName).getAll(query);
        tx.oncomplete = () => resolve(asArray<T>(request.result));
        tx.onerror = (event) => {
          event.preventDefault();
          reject(storageError(tx.error));
        };
      }),
  );
}

function savePhotoOnce(photo: NewPhoto): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('photos', 'readwrite');
        let settled = false;
        const fail = (error: Error) => {
          if (settled) return;
          settled = true;
          reject(error);
        };
        tx.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        tx.onerror = (event) => {
          event.preventDefault();
          fail(storageError(tx.error));
        };
        tx.onabort = () => {
          if (!settled) fail(storageError(tx.error));
        };
        const lookup = tx.objectStore('photos').get(photo.id);
        lookup.onsuccess = () => {
          if (lookup.result) {
            try {
              editPhotoStamp(photo.id);
            } catch (error) {
              fail(error instanceof Error ? error : new Error('Photo stamp cannot be edited.'));
            }
            tx.abort();
            return;
          }
          tx.objectStore('photos').add(photo);
        };
      }),
  );
}

export function createIndexedDbConditionStore(): ConditionStore {
  const urls = new Map<string, string>();

  return {
    savePhoto: savePhotoOnce,
    saveConditionRecord: (record) => addRow('records', record),
    saveBenchFinding: (finding) => addRow('findings', finding),
    saveShare: (link) => addRow('shares', link),
    async loadAgreement(raNumber) {
      const [photos, records, findings] = await Promise.all([
        readAll<NewPhoto>('photos', 'byRa', raNumber),
        readAll<ConditionRecord>('records', 'byRa', raNumber),
        readAll<BenchFinding>('findings', 'byRa', raNumber),
      ]);
      return { photos: photos.map((photo) => toView(photo, urls)), records, findings };
    },
    async loadLine(lineKey) {
      const [photos, records, findings] = await Promise.all([
        readAll<NewPhoto>('photos', 'byLine', lineKey),
        readAll<ConditionRecord>('records', 'byLine', lineKey),
        readAll<BenchFinding>('findings', 'byLine', lineKey),
      ]);
      return { photos: photos.map((photo) => toView(photo, urls)), records, findings };
    },
    loadShare(token) {
      return openDb().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction('shares', 'readonly');
            const request = tx.objectStore('shares').get(token);
            tx.oncomplete = () => {
              const value: unknown = request.result;
              resolve(isShareLink(value) ? value : null);
            };
            tx.onerror = (event) => {
              event.preventDefault();
              reject(storageError(tx.error));
            };
          }),
      );
    },
  };
}

function createDefaultStore(): ConditionStore {
  if (typeof indexedDB === 'undefined') return createMemoryConditionStore();
  return createIndexedDbConditionStore();
}

let current = createDefaultStore();

export function getConditionStore(): ConditionStore {
  return current;
}

export function setConditionStore(store: ConditionStore) {
  current = store;
}

const emptyMedia: AgreementMedia = { photos: [], records: [], findings: [] };

export function useAgreementMedia(raNumber: string): { media: AgreementMedia | null; error: string | null } {
  const [state, setState] = useState<{ media: AgreementMedia | null; error: string | null }>({
    media: null,
    error: null,
  });

  useEffect(() => {
    if (!raNumber) return;
    let cancelled = false;
    getConditionStore()
      .loadAgreement(raNumber)
      .then((media) => {
        if (!cancelled) setState({ media, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ media: null, error: 'Could not read condition photos from this browser.' });
      });
    return () => {
      cancelled = true;
    };
  }, [raNumber]);

  return raNumber ? state : { media: emptyMedia, error: null };
}

export function useSharedLine(token: string): {
  link: ShareLink | null;
  media: AgreementMedia | null;
  error: string | null;
  missing: boolean;
} {
  const [state, setState] = useState<{
    link: ShareLink | null;
    media: AgreementMedia | null;
    error: string | null;
    missing: boolean;
  }>({ link: null, media: null, error: null, missing: false });

  useEffect(() => {
    let cancelled = false;
    getConditionStore()
      .loadShare(token)
      .then(async (link) => {
        if (!link) {
          if (!cancelled) setState({ link: null, media: null, error: null, missing: true });
          return;
        }
        const media = await getConditionStore().loadLine(link.lineKey);
        if (!cancelled) setState({ link, media, error: null, missing: false });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            link: null,
            media: null,
            error: 'Could not read condition photos from this browser.',
            missing: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return state;
}
