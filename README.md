# Email Spoofing Detector — Chrome Extension

## Tech Stack

| Tool | Role |
|---|---|
| [Bun](https://bun.sh) | Runtime, package manager, bundler |
| [React 19](https://react.dev) | Popup UI |
| [TypeScript](https://www.typescriptlang.org) | Type safety across all contexts |
| [Tailwind CSS v4](https://tailwindcss.com) | Popup styling |
| Chrome Extension Manifest V3 | Extension format |

---

## Project Structure

```
c2-email-spoofing-detector/
│
├── src/
│   ├── shared/
│   │   └── types.ts          # Shared TypeScript types across all contexts
│   │
│   ├── popup/
│   │   ├── index.tsx         # React entry point — mounts the popup UI
│   │   ├── index.css         # Tailwind CSS entry point
│   │   └── Popup.tsx         # React UI component
│   │
│   ├── content/
│   │   └── index.ts          # Content script — runs inside Gmail/Outlook tabs
│   │
│   └── background/
│       ├── index.ts          # Service worker — background logic
│       └── analyzer.ts       # Spoofing analysis logic
│
├── public/
│   ├── manifest.json         # Chrome MV3 manifest (permissions, entry points)
│   ├── popup.html            # HTML shell that loads the React popup
│   └── icons/                # Extension icons (16, 32, 48, 128px)
│
├── dist/                     # Built output — load this folder into Chrome
├── build.ts                  # Bun build script
├── postcss.config.js         # PostCSS config for Tailwind
└── tsconfig.json             # TypeScript config
```

---

## How the Extension Works

Chrome extensions run in three separate isolated contexts that cannot share memory. They communicate via message passing:

```
Gmail/Outlook tab          background service worker        popup UI
─────────────────          ────────────────────────         ────────
content/index.ts           background/index.ts              popup/Popup.tsx
       │                             │                            │
       │  sends email headers        │                            │
       │ ─────────────────────────>  │                            │
       │                             │  analyzes headers          │
       │                             │  caches result             │
       │                             │  updates badge             │
       │                             │                            │
       │                             │  <─── requests result ──── │
       │                             │  ────── sends result ────> │
       │                             │                            │ renders UI
```

- **Content script** — injected into Gmail/Outlook, reads email data from the page
- **Background service worker** — receives data from content script, runs analysis, stores results, updates the extension badge
- **Popup UI** — shown when you click the extension icon, fetches the cached result from the background and displays it

---

## Note on Current Code

The logic currently implemented in this repo is a **template/placeholder only**. It is not the final product and does not reflect the actual intended design. Feel free to rethink and reimplement the detection logic, UI, and structure as you see fit.

---

## Why This Workflow

Chrome extensions loaded via "Load unpacked" in developer mode do not auto-update from a remote server. There is no way for a CI/CD pipeline to push changes directly into a teammate's browser. Each developer must manually pull the latest code, rebuild, and reload the extension in Chrome. This workflow ensures everyone is always testing the latest version from `develop` without breaking each other's work.

---

## Team Development Workflow

**Step 1 — Create your branch from `develop`**
```sh
git checkout develop
git pull origin develop
git checkout -b your-feature-name
```

**Step 2 — Do your work, then build and test locally**
```sh
bun run build
```
- Open `chrome://extensions` in Chrome
- Enable **Developer mode** (toggle top-right)
- Click **Load unpacked** and select the `dist/` folder (first time only)
- Click the reload icon on the extension after every build

**Step 3 — Push your branch and open a PR into `develop`**
```sh
git add .
git commit -m "your message"
git push origin your-feature-name
```
Then open a Pull Request on GitHub targeting the `develop` branch.

**Step 4 — After your PR is merged, sync `develop` and test again**
```sh
git checkout develop
git pull origin develop
bun run build
```
- Go to `chrome://extensions`
- Click the reload icon on the extension
- Test that everything works
