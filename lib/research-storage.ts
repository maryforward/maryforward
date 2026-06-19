/**
 * Storage backend for the research PDF library (papers + reference books).
 *
 * The library is ~580MB of PDFs — far too large to bundle into a serverless
 * function (Vercel caps functions at 300MB). So in production the PDFs live in
 * Vercel Blob and are fetched at request time. Locally, when no
 * BLOB_READ_WRITE_TOKEN is present, the very same files are read from the
 * repo's resources/ directory so development needs no cloud setup.
 *
 * next.config.js (experimental.outputFileTracingExcludes) keeps resources/**
 * out of the function bundle regardless, and .vercelignore keeps it out of the
 * upload. Both backends use POSIX-style relative paths rooted at resources/:
 *   "papers"                     -> top-level container
 *   "papers/COVID"               -> a disease folder
 *   "books/5-Minute ... .pdf"    -> a file
 *
 * To populate Blob, run: node scripts/upload-resources-to-blob.mjs
 */
import { readdir, readFile, stat } from "fs/promises";
import { join, resolve } from "path";

const LOCAL_ROOT = resolve(process.cwd(), "resources");
const BLOB_PREFIX = "resources/";

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

interface BlobMeta {
  url: string;
  size: number;
}
// Cache pathname -> {url,size} so a folder listing primes the per-file reads
// and we avoid an extra list() round-trip in readBuffer/fileSize.
const blobMetaCache = new Map<string, BlobMeta>();

async function blobList() {
  return (await import("@vercel/blob")).list;
}

function toBlobPath(rel: string): string {
  return BLOB_PREFIX + rel.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** True when reads are served from Vercel Blob (production). */
export function isBlobBacked(): boolean {
  return useBlob;
}

/**
 * Guard against path traversal. Folder/book names come from request bodies, so
 * reject anything that is not a single, plain path segment.
 */
export function assertSafeSegment(name: string): void {
  if (
    !name ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name === "." ||
    name === ".."
  ) {
    throw new Error(`Invalid path segment: ${name}`);
  }
}

/** Subdirectory (folder) names directly under relDir, sorted. */
export async function listFolders(relDir: string): Promise<string[]> {
  if (useBlob) {
    const list = await blobList();
    const prefix = toBlobPath(relDir).replace(/\/?$/, "/");
    const out: string[] = [];
    let cursor: string | undefined;
    do {
      const res = await list({ prefix, mode: "folded", cursor, limit: 1000 });
      for (const folder of res.folders || []) {
        const name = folder.slice(prefix.length).replace(/\/$/, "");
        if (name && !name.includes("/")) out.push(name);
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
    return out.sort();
  }
  const entries = await readdir(join(LOCAL_ROOT, relDir), { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

/** File names (last segment) directly under relDir with the given extension, sorted. */
export async function listFiles(relDir: string, ext = ".pdf"): Promise<string[]> {
  const lower = ext.toLowerCase();
  if (useBlob) {
    const list = await blobList();
    const prefix = toBlobPath(relDir).replace(/\/?$/, "/");
    const out: string[] = [];
    let cursor: string | undefined;
    do {
      const res = await list({ prefix, mode: "folded", cursor, limit: 1000 });
      for (const b of res.blobs) {
        const name = b.pathname.slice(prefix.length);
        if (!name || name.includes("/")) continue; // direct children only
        if (name.toLowerCase().endsWith(lower)) {
          out.push(name);
          blobMetaCache.set(b.pathname, { url: b.url, size: b.size });
        }
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
    return out.sort();
  }
  const files = await readdir(join(LOCAL_ROOT, relDir));
  return files.filter((f) => f.toLowerCase().endsWith(lower)).sort();
}

async function resolveBlob(relPath: string): Promise<BlobMeta> {
  const key = toBlobPath(relPath);
  const cached = blobMetaCache.get(key);
  if (cached) return cached;
  const list = await blobList();
  const res = await list({ prefix: key, limit: 1 });
  const b = res.blobs.find((x) => x.pathname === key) || res.blobs[0];
  if (!b) throw new Error(`Blob not found: ${key}`);
  const meta = { url: b.url, size: b.size };
  blobMetaCache.set(key, meta);
  return meta;
}

/** Read a file's bytes. relPath is rooted at resources/ (e.g. "papers/COVID/x.pdf"). */
export async function readBuffer(relPath: string): Promise<Buffer> {
  if (useBlob) {
    const { url } = await resolveBlob(relPath);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Blob fetch failed (${res.status}) for ${relPath}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(LOCAL_ROOT, relPath));
}

/** Size in bytes (used for cache invalidation). */
export async function fileSize(relPath: string): Promise<number> {
  if (useBlob) {
    return (await resolveBlob(relPath)).size;
  }
  return (await stat(join(LOCAL_ROOT, relPath))).size;
}
