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

// Cache pathname -> size so a folder listing primes fileSize() and we avoid an
// extra round-trip per file. Reads use get() by pathname, so no URL is cached.
const blobSizeCache = new Map<string, number>();

async function blobApi() {
  return import("@vercel/blob");
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
    const { list } = await blobApi();
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
    const { list } = await blobApi();
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
          blobSizeCache.set(b.pathname, b.size);
        }
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
    return out.sort();
  }
  const files = await readdir(join(LOCAL_ROOT, relDir));
  return files.filter((f) => f.toLowerCase().endsWith(lower)).sort();
}

/** Read a file's bytes. relPath is rooted at resources/ (e.g. "papers/COVID/x.pdf"). */
export async function readBuffer(relPath: string): Promise<Buffer> {
  if (useBlob) {
    const { get } = await blobApi();
    const result = await get(toBlobPath(relPath), { access: "private" });
    if (!result) throw new Error(`Blob not found: ${relPath}`);
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  return readFile(join(LOCAL_ROOT, relPath));
}

/** Size in bytes (used for cache invalidation). */
export async function fileSize(relPath: string): Promise<number> {
  if (useBlob) {
    const key = toBlobPath(relPath);
    const cached = blobSizeCache.get(key);
    if (cached !== undefined) return cached;
    const { head } = await blobApi();
    const meta = await head(key);
    blobSizeCache.set(key, meta.size);
    return meta.size;
  }
  return (await stat(join(LOCAL_ROOT, relPath))).size;
}
