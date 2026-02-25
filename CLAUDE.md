
# Project: Email Spoofing Detector — Chrome Extension

This is a Chrome Extension (Manifest V3) built with Bun, React, TypeScript, and Tailwind CSS v4.

## Stack

- **Runtime & bundler**: Bun (not Node, not Vite, not Webpack)
- **UI**: React 19 + TypeScript + Tailwind CSS v4
- **Extension type**: Manifest V3
- **Target browsers**: Chrome / Chromium only

## Directory structure

```
src/
  shared/types.ts         — shared TypeScript types (no Chrome APIs here)
  popup/index.tsx         — React entry point for the popup
  popup/Popup.tsx         — React UI component
  content/index.ts        — Content script (runs in Gmail/Outlook tabs)
  background/index.ts     — Service worker (background logic)
  background/analyzer.ts  — Pure spoofing analysis logic
public/
  manifest.json           — MV3 manifest
  popup.html              — Popup HTML shell
  icons/                  — Extension icons (16, 32, 48, 128 px PNGs)
build.ts                  — Bun build script
dist/                     — Built output (load this into Chrome)
```

## Build & scripts

```sh
bun run build        # dev build (inline sourcemaps)
bun run build:prod   # production build (minified)
bun run dev          # watch mode
bun run typecheck    # tsc --noEmit
```

The build script (`build.ts`) uses `Bun.build()` with `format: "iife"` — Chrome extensions
require self-contained scripts with no ES module imports at runtime.

## Bun rules

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx <package>` instead of `npx <package>`
- Bun auto-loads `.env` — don't use dotenv
- Prefer `Bun.file` over `node:fs` readFile/writeFile
- Use `Bun.$\`cmd\`` instead of execa

## Styling

- Use **Tailwind CSS v4** utility classes for all UI styling in the popup
- Do NOT use inline `style={{}}` props — use Tailwind classes instead
- The CSS entry point is `src/popup/index.css` with `@import "tailwindcss"`
- `@tailwindcss/postcss` is the PostCSS plugin used by Bun's CSS bundler

## TypeScript

- `tsconfig.json` uses `"lib": ["ESNext", "DOM"]` — DOM types are available everywhere
- `@types/chrome` is installed — all `chrome.*` APIs have full type support
- Strict mode is enabled
- `moduleResolution: "bundler"` — Bun handles resolution

## Chrome extension conventions

- All cross-context communication uses the `ExtensionMessage` discriminated union from `src/shared/types.ts`
- Content script → Background: `chrome.runtime.sendMessage`
- Background → Storage: `chrome.storage.local`
- Popup → Background: `chrome.runtime.sendMessage` with async `sendResponse`
- Never import content script code into the popup or background, and vice versa
- Icons live in `public/icons/` and are copied to `dist/icons/` at build time

## Permissions (manifest)

- `activeTab`, `storage`, `tabs`, `notifications`
- Host permissions: Gmail and Outlook URLs only
