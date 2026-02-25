#!/usr/bin/env bun
/**
 * build.ts — Bundles all extension entry points into dist/
 *
 * Chrome extensions cannot use ES module imports at runtime, so every
 * entry point must be bundled into a single self-contained IIFE file.
 *
 * Output structure (dist/):
 *   dist/
 *   ├── manifest.json
 *   ├── popup.html
 *   ├── popup.js          ← React popup
 *   ├── content.js        ← Content script
 *   ├── background.js     ← Service worker
 *   └── icons/            ← Copied from public/icons/
 */

import { copyFileSync, cpSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const ROOT   = import.meta.dir;
const SRC    = join(ROOT, "src");
const PUBLIC = join(ROOT, "public");
const OUT    = join(ROOT, "dist");

// ── 1. Clean / create dist dir ──────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });

// ── 2. Bundle TypeScript entry points ───────────────────────────────────────
const entryPoints = [
  { in: join(SRC, "popup",      "index.tsx"),  out: "popup.js"      },
  { in: join(SRC, "content",    "index.ts"),   out: "content.js"    },
  { in: join(SRC, "background", "index.ts"),   out: "background.js" },
];

console.log("Building extension…");

const results = await Promise.all(
  entryPoints.map(({ in: entrypoint, out }) =>
    Bun.build({
      entrypoints: [entrypoint],
      outdir: OUT,
      naming: out,        // fixed output filename
      target: "browser",
      format: "iife",     // Chrome extensions require self-contained scripts
      minify: process.env.NODE_ENV === "production",
      sourcemap: process.env.NODE_ENV === "production" ? "none" : "inline",
    })
  )
);

let hasErrors = false;
for (const result of results) {
  if (!result.success) {
    hasErrors = true;
    for (const log of result.logs) {
      console.error(log.message);
    }
  }
}

if (hasErrors) {
  console.error("Build failed.");
  process.exit(1);
}

// ── 3. Copy static assets from public/ ──────────────────────────────────────
copyFileSync(join(PUBLIC, "manifest.json"), join(OUT, "manifest.json"));
copyFileSync(join(PUBLIC, "popup.html"),    join(OUT, "popup.html"));

const iconsDir = join(PUBLIC, "icons");
if (existsSync(iconsDir)) {
  cpSync(iconsDir, join(OUT, "icons"), { recursive: true });
}

console.log(`Done! Extension ready in: dist/`);
