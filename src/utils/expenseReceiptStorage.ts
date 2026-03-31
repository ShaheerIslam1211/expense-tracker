import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import type { Expense } from "../types";
import { resizeDataUrl } from "./imageResize";

/** Max receipt images per expense (Firestore array + UX). */
export const MAX_EXPENSE_RECEIPT_PHOTOS = 8;

const LEGACY_RECEIPT_FILE = "receipt.jpg";

export function expenseReceiptStoragePath(uid: string, expenseId: string): string {
  return `users/${uid}/expenses/${expenseId}/${LEGACY_RECEIPT_FILE}`;
}

function expensePhotoFilePath(uid: string, expenseId: string, fileId: string): string {
  return `users/${uid}/expenses/${expenseId}/p_${fileId}.jpg`;
}

function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

async function dataUrlToUploadBlob(dataUrl: string): Promise<Blob> {
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Receipt must be an image.");
  }
  const approxBytes = (dataUrl.length * 3) / 4;
  let url = dataUrl;
  if (approxBytes > 2 * 1024 * 1024) {
    url = await resizeDataUrl(dataUrl, 1.85 * 1024 * 1024, 2200, 0.86);
  }
  return dataURLToBlob(url);
}

export async function uploadExpenseReceiptFile(
  storage: FirebaseStorage,
  uid: string,
  expenseId: string,
  fileId: string,
  dataUrl: string,
): Promise<string> {
  const blob = await dataUrlToUploadBlob(dataUrl);
  const path = expensePhotoFilePath(uid, expenseId, fileId);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

/** @deprecated use uploadExpenseReceiptFile — kept for one-off legacy paths */
export async function uploadExpenseReceipt(
  storage: FirebaseStorage,
  uid: string,
  expenseId: string,
  dataUrl: string,
): Promise<string> {
  return uploadExpenseReceiptFile(storage, uid, expenseId, "legacy", dataUrl);
}

/** Firebase modular SDK no longer exports refFromURL; map download URL → ref for same bucket. */
function refFromFirebaseDownloadUrl(storage: FirebaseStorage, downloadUrl: string) {
  const bucket = storage.app.options.storageBucket;
  if (!bucket) return null;
  const prefix = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/`;
  if (!downloadUrl.startsWith(prefix)) return null;
  const rest = downloadUrl.slice(prefix.length);
  const q = rest.indexOf("?");
  const encodedPath = q >= 0 ? rest.slice(0, q) : rest;
  const path = decodeURIComponent(encodedPath.replace(/\+/g, " "));
  return ref(storage, path);
}

async function tryDeleteDownloadUrl(storage: FirebaseStorage, url: string): Promise<void> {
  if (!url.startsWith("https://")) return;
  try {
    const r = refFromFirebaseDownloadUrl(storage, url);
    if (r) await deleteObject(r);
  } catch {
    // ignore
  }
}

export function getExpenseReceiptUrls(e: { photoUrls?: string[]; photoUrl?: string; photoDataUrl?: string }): string[] {
  const out: string[] = [];
  if (e.photoUrls?.length) {
    for (const u of e.photoUrls) {
      const t = u?.trim();
      if (t && !out.includes(t)) out.push(t);
    }
  }
  const single = e.photoUrl?.trim();
  if (single && !out.includes(single)) out.push(single);
  const legacy = e.photoDataUrl?.trim();
  if (legacy && !out.includes(legacy)) out.push(legacy);
  return out;
}

/** Only https URLs we may delete from Storage when user removes a photo. */
export function getExpenseReceiptRemoteUrls(e?: Partial<Expense> | null): string[] {
  if (!e) return [];
  return getExpenseReceiptUrls(e as Expense).filter((u) => u.startsWith("https://"));
}

/** First image URL for list thumbnails / legacy callers. */
export function getExpenseReceiptSrc(e: { photoUrls?: string[]; photoUrl?: string; photoDataUrl?: string }): string | undefined {
  return getExpenseReceiptUrls(e)[0];
}

/**
 * Apply desired list: keep `https` entries, upload each `data:` entry, delete removed Storage files.
 */
export async function syncExpenseReceiptPhotos(
  storage: FirebaseStorage,
  uid: string,
  expenseId: string,
  desired: string[],
  previousRemoteHttps: string[],
): Promise<string[]> {
  const capped = desired.slice(0, MAX_EXPENSE_RECEIPT_PHOTOS).map((s) => s.trim()).filter(Boolean);
  const final: string[] = [];
  for (const item of capped) {
    if (item.startsWith("data:")) {
      final.push(await uploadExpenseReceiptFile(storage, uid, expenseId, uuidv4(), item));
    } else if (item.startsWith("http://") || item.startsWith("https://")) {
      final.push(item);
    }
  }
  const prev = previousRemoteHttps.filter((u) => u.startsWith("https://"));
  for (const u of prev) {
    if (!final.includes(u)) {
      await tryDeleteDownloadUrl(storage, u);
    }
  }
  return final;
}

export async function deleteAllExpenseReceiptFiles(
  storage: FirebaseStorage,
  uid: string,
  expenseId: string,
): Promise<void> {
  const folderRef = ref(storage, `users/${uid}/expenses/${expenseId}`);
  try {
    const { items, prefixes } = await listAll(folderRef);
    await Promise.all(items.map((item) => deleteObject(item)));
    await Promise.all(
      prefixes.map(async (p) => {
        const nested = await listAll(p);
        await Promise.all(nested.items.map((item) => deleteObject(item)));
      }),
    );
  } catch {
    // folder missing
  }
  try {
    await deleteObject(ref(storage, expenseReceiptStoragePath(uid, expenseId)));
  } catch {
    // legacy single file missing
  }
}

/** @deprecated use deleteAllExpenseReceiptFiles */
export async function deleteExpenseReceipt(storage: FirebaseStorage, uid: string, expenseId: string): Promise<void> {
  await deleteAllExpenseReceiptFiles(storage, uid, expenseId);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

export async function receiptImageToDataUrlForOcr(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  if (src.startsWith("http://") || src.startsWith("https://")) {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Could not load receipt image");
    const blob = await res.blob();
    return blobToDataUrl(blob);
  }
  throw new Error("Unsupported receipt image source");
}
