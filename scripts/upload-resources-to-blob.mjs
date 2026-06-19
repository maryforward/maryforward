/**
 * One-time (and re-runnable) uploader: pushes everything under resources/ to
 * Vercel Blob, preserving the relative layout as the blob pathname so it
 * mirrors what lib/research-storage.ts expects:
 *
 *   resources/papers/COVID/foo.pdf  ->  blob pathname "resources/papers/COVID/foo.pdf"
 *   resources/books/bar.pdf         ->  blob pathname "resources/books/bar.pdf"
 *
 * Usage:
 *   1. Create a Blob store in the Vercel dashboard and connect it to the project.
 *   2. Pull the token locally:   vercel env pull .env.local
 *      (or export BLOB_READ_WRITE_TOKEN=... manually)
 *   3. Run:                      node scripts/upload-resources-to-blob.mjs
 *
 * Idempotent: existing pathnames are overwritten (allowOverwrite), so re-running
 * after adding papers only needs to (re)upload changed/new files. Pass --force
 * to re-upload everything even if a blob of the same pathname already exists.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { put, list } from "@vercel/blob";

const ROOT = fileURLToPath(new URL("../resources", import.meta.url));
const FORCE = process.argv.includes("--force");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull .env.local` (and " +
      "source it) or export the token, then re-run."
  );
  process.exit(1);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// blob pathnames are POSIX-style and rooted at "resources/"
function toPathname(absPath) {
  return "resources/" + relative(ROOT, absPath).split(sep).join("/");
}

async function existingPathnames() {
  const seen = new Set();
  let cursor;
  do {
    const res = await list({ prefix: "resources/", cursor, limit: 1000 });
    for (const b of res.blobs) seen.add(b.pathname);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return seen;
}

async function main() {
  const files = await walk(ROOT);
  const already = FORCE ? new Set() : await existingPathnames();

  console.log(`Found ${files.length} files under resources/.`);
  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;

  for (const file of files) {
    const pathname = toPathname(file);
    if (already.has(pathname)) {
      skipped++;
      continue;
    }
    const size = (await stat(file)).size;
    const body = await readFile(file);
    await put(pathname, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: size > 8 * 1024 * 1024, // stream large books/papers
    });
    uploaded++;
    bytes += size;
    console.log(`  ↑ ${pathname} (${(size / 1048576).toFixed(1)}MB)`);
  }

  console.log(
    `\nDone. Uploaded ${uploaded}, skipped ${skipped} existing, ` +
      `${(bytes / 1048576).toFixed(1)}MB transferred.`
  );
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
