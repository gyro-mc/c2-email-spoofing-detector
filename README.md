# Email Spoofing Detector — Chrome Extension

A Chrome Extension (Manifest V3) that detects email spoofing attempts by analyzing authentication headers (SPF, DKIM, DMARC) on Gmail and Outlook.

Built with **Bun**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

---

## Project Structure

```
c2-email-spoofing-detector/
│
├── public/                         # Static assets copied into dist/ as-is
│   ├── manifest.json               # Chrome Extension MV3 manifest (permissions, entry points)
│   ├── popup.html                  # HTML shell that loads the React popup
│   └── icons/                      # Extension icons (16, 32, 48, 128px PNGs)
│
├── src/
│   ├── shared/
│   │   └── types.ts                # Shared TypeScript types used by all three contexts
│   │                               # (SpoofingAnalysis, EmailHeaders, ExtensionMessage)
│   │
│   ├── popup/
│   │   ├── index.tsx               # React entry point — mounts <Popup /> into #root
│   │   ├── index.css               # Tailwind CSS entry point (@import "tailwindcss")
│   │   └── Popup.tsx               # React UI — shows status, risk score, and check results
│   │
│   ├── content/
│   │   └── index.ts                # Content script — runs inside Gmail/Outlook tabs
│   │                               # Observes DOM, extracts email headers, sends to background
│   │
│   └── background/
│       ├── index.ts                # Service worker — receives headers, runs analysis,
│       │                           # caches results, updates badge, fires notifications
│       └── analyzer.ts             # Pure analysis logic — checks SPF, DKIM, DMARC,
│                                   # and From/Reply-To domain mismatch
│
├── dist/                           # Built output — load this folder into Chrome
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js                    # Bundled React popup (IIFE)
│   ├── popup.css                   # Generated Tailwind CSS
│   ├── content.js                  # Bundled content script (IIFE)
│   ├── background.js               # Bundled service worker (IIFE)
│   └── icons/
│
├── .github/
│   └── workflows/
│       └── build.yml               # CI — typechecks and builds on every push to main
│
├── build.ts                        # Bun build script — bundles JS via Bun, CSS via PostCSS
├── postcss.config.js               # PostCSS config — wires in @tailwindcss/postcss plugin
├── tsconfig.json                   # TypeScript config (strict, DOM lib, bundler resolution)
├── CLAUDE.md                       # AI agent instructions for this project
└── package.json
```

---

## How the three contexts communicate

Chrome extensions are split into three isolated contexts that cannot share memory directly. They communicate via message passing:

```
Gmail/Outlook tab                background service worker          popup UI
─────────────────                ────────────────────────           ────────
content/index.ts                 background/index.ts                popup/Popup.tsx
        │                                │                                │
        │  HEADERS_FOUND {headers}       │                                │
        │ ─────────────────────────────> │                                │
        │                                │ analyzeHeaders()               │
        │                                │ cache result                   │
        │                                │ update badge                   │
        │                                │                                │
        │                                │       GET_ANALYSIS             │
        │                                │ <───────────────────────────── │
        │                                │       ANALYSIS_RESULT          │
        │                                │ ──────────────────────────────>│
        │                                │                                │ render UI
```

---

## Spoofing analysis

`src/background/analyzer.ts` runs four checks on every email:

| Check | What it looks for | Header examined |
|---|---|---|
| **SPF** | Did the sending server pass SPF? | `Received-SPF` |
| **DKIM** | Is a DKIM signature present? | `DKIM-Signature` |
| **DMARC** | Did the email pass DMARC policy? | `X-DMARC-Result` |
| **From / Reply-To mismatch** | Do the From and Reply-To domains differ? | `From`, `Reply-To` |

Each failed check adds 25 to the risk score (0–100). The final status is:

| Score | Status |
|---|---|
| 0 | Safe |
| 25–50 | Warning |
| 75–100 | Danger |

---

## Getting started

### Install dependencies

```sh
bun install
```

### Development build (with sourcemaps)

```sh
bun run build
```

### Production build (minified, no sourcemaps)

```sh
bun run build:prod
```

### Watch mode (rebuilds on file change)

```sh
bun run dev
```

### Type check only

```sh
bun run typecheck
```

### Load the extension in Chrome

1. Run `bun run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `dist/` folder

---

## Tech stack

| Tool | Role |
|---|---|
| [Bun](https://bun.sh) | Runtime, package manager, JS bundler |
| [React 19](https://react.dev) | Popup UI |
| [TypeScript](https://www.typescriptlang.org) | Type safety across all contexts |
| [Tailwind CSS v4](https://tailwindcss.com) | Popup styling |
| [PostCSS](https://postcss.org) | CSS processing pipeline |
| [@tailwindcss/postcss](https://tailwindcss.com/docs/installation/using-postcss) | Tailwind v4 PostCSS plugin |
