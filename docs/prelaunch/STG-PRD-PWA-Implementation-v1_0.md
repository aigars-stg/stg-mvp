# PRD: Progressive Web App (PWA) Implementation

**Document:** STG-PRD-PWA-Implementation-v1.0  
**Status:** Ready for implementation  
**Author:** Aigars / Claude  
**Created:** March 2026  
**Estimated effort:** 4–6 hours Claude Code  
**Dependencies:** Logo Asset Package (icon files must exist in `public/`)  
**Related docs:** Logo Asset Package Spec v1.0, Design System v2.5, AI Search Visibility Checklist v1.0

---

## 1. Context and motivation

STG is a responsive Next.js 14 web app. Users on mobile devices (expected to be the majority of C2C marketplace traffic) currently access it through the browser. A Progressive Web App layer gives them an "Add to Home Screen" experience that looks and feels like a native app — full-screen, branded splash screen, home screen icon — without building or maintaining a native codebase.

This is the lowest-effort, highest-impact step toward mobile app presence before launch. It also satisfies Chrome's installability criteria, which triggers the browser's native install prompt on Android.

### What this PRD covers

- Enhanced web app manifest (`site.webmanifest`)
- Apple-specific meta tags for iOS standalone mode
- Minimal service worker for offline shell caching and Chrome installability
- Icon asset requirements (what files must exist, with maskable variant)
- PWA launch tracking via `start_url` query parameter
- Screenshot assets for Android's richer install UI

### What this PRD does not cover

- Push notifications (deferred to post-launch)
- Full offline mode / offline-first data caching (deferred)
- Background sync (deferred)
- Native app wrapper (Capacitor/Expo — separate decision)

---

## 2. Current state analysis

### What exists

The Logo Asset Package Spec v1.0 defines a complete `site.webmanifest` and HTML `<head>` implementation. However, the asset generation checklist shows all items as ⬜ (not yet created). The live site at `www.secondturn.games` serves a Next.js app with a logo SVG at `/images/logo_nav.svg` but no evidence of a deployed manifest, service worker, or Apple meta tags.

### Gaps identified

| Area | Gap | Impact |
|------|-----|--------|
| **Manifest** | Not deployed (or missing key fields) | Chrome will not show install prompt |
| **Service worker** | None registered | Chrome requires a service worker for installability |
| **Apple meta tags** | Missing `apple-mobile-web-app-capable` and related | iOS "Add to Home Screen" opens as normal Safari tab, not standalone |
| **Maskable icon** | Spec reuses same PNG for regular and maskable | Die symbol will be clipped on Android adaptive icons |
| **Manifest fields** | Missing `id`, `scope`, `categories`, `screenshots`, `prefer_related_applications` | Reduced install UX quality, no richer install sheet on Android |
| **PWA tracking** | `start_url` is `/` with no tracking parameter | Cannot measure PWA usage in analytics |

---

## 3. Implementation

### 3.1 Web app manifest

**File:** `public/site.webmanifest`

```json
{
  "id": "/",
  "name": "Second Turn Games",
  "short_name": "STG",
  "description": "Buy & sell board games in the Baltics",
  "categories": ["shopping", "entertainment"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/pwa-wide.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/pwa-narrow.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "theme_color": "#d08770",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/?utm_source=pwa&utm_medium=homescreen",
  "prefer_related_applications": false
}
```

**Notes for Claude Code:**
- Place at `public/site.webmanifest` (Next.js serves `public/` files at root)
- Do NOT use `public/manifest.json` — `site.webmanifest` is the standard filename and matches the Logo Asset Package Spec
- The `id` field uniquely identifies the app; set to `/` so it remains stable if the manifest URL ever moves
- `orientation: "portrait-primary"` is appropriate for a marketplace browse experience; users can still rotate but install defaults to portrait

### 3.2 Icon assets

**Directory:** `public/icons/`

These files must exist. If the actual designed icons are not yet available, create solid-color placeholder PNGs with the correct dimensions so the manifest validates and the PWA is installable. Replace with real assets before launch.

| File | Size | Purpose | Notes |
|------|------|---------|-------|
| `public/icons/icon-192.png` | 192×192 | Android Chrome, manifest | Die symbol, full bleed |
| `public/icons/icon-512.png` | 512×512 | Android splash, manifest | Die symbol, full bleed |
| `public/icons/icon-512-maskable.png` | 512×512 | Android adaptive icons | Die symbol at ~60% size, centered, with `#d08770` or `#ffffff` background fill. The safe zone is the inner 80% circle — the die must fit entirely within it |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen | Die symbol, no transparency (iOS adds none), white or orange background |
| `public/favicon.ico` | 16, 32, 48 multi | Legacy browsers | Already specified in Logo Asset Package |
| `public/favicon.svg` | vector | Modern browsers | Already specified in Logo Asset Package |

**Placeholder generation (if real assets not ready):**

Claude Code can generate simple colored placeholder PNGs using a canvas script or sharp/jimp. Use Aurora Orange (`#d08770`) background with white text "STG" centered. This is temporary — the manifest will be valid and installable, and real icons swap in as a simple file replace.

```bash
# Example using Node.js sharp (if available)
# Or use any image generation approach available
```

### 3.3 Screenshot assets

**Directory:** `public/screenshots/`

| File | Size | Form factor | Content |
|------|------|-------------|---------|
| `pwa-wide.png` | 1280×720 | Desktop | Browse page screenshot |
| `pwa-narrow.png` | 390×844 | Mobile | Browse page screenshot on mobile viewport |

These screenshots appear in Chrome's "richer install UI" on Android. Without them, users see a minimal install banner. With them, they see a full-screen install sheet resembling an app store listing.

**For pre-launch:** Take screenshots of the current landing/browse page at these exact dimensions. These can be captured using Chrome DevTools device emulation or Playwright.

### 3.4 Next.js metadata configuration

**File:** `src/app/layout.tsx` (root layout) or `src/app/[locale]/layout.tsx`

Next.js 14 App Router uses the `metadata` export for `<head>` tags. Update the root layout to include all PWA-related meta:

```typescript
// src/app/layout.tsx (or wherever the root <html> tag lives)
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#d08770',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  // ... existing metadata (title, description, openGraph, etc.)

  manifest: '/site.webmanifest',

  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },

  appleWebApp: {
    capable: true,
    title: 'Second Turn Games',
    statusBarStyle: 'default',
  },

  other: {
    'msapplication-TileColor': '#d08770',
  },
}
```

**What this produces in `<head>`:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta name="theme-color" content="#d08770">
<link rel="manifest" href="/site.webmanifest">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" sizes="48x48" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Second Turn Games">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="msapplication-TileColor" content="#d08770">
```

**Important implementation notes:**

- `viewport` must be a separate export in Next.js 14 (not inside `metadata`)
- `appleWebApp.capable = true` produces the critical `apple-mobile-web-app-capable` meta tag — without this, iOS ignores standalone mode entirely
- `statusBarStyle: 'default'` gives a standard dark-text-on-light status bar; use `'black-translucent'` only if the header has a dark/colored background that extends under the status bar
- If a `metadata` export already exists in this file, merge these fields into it rather than replacing
- The `safari-pinned-tab.svg` and `mask-icon` from the Logo Asset Package are deprecated by modern Safari — skip them

### 3.5 Service worker

Chrome requires a registered service worker with a `fetch` event handler for the PWA to be installable. The service worker also provides basic offline caching of the app shell.

**Recommended approach: `@serwist/next`**

[Serwist](https://serwist.pages.dev/) is the actively maintained successor to `next-pwa`. It integrates with Next.js App Router and generates a service worker with sensible defaults.

**Installation:**

```bash
npm install @serwist/next
npm install -D serwist
```

**File: `next.config.mjs` (or `next.config.js`)**

```javascript
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Disable in development to avoid caching issues
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing Next.js config
};

export default withSerwist(nextConfig);
```

**File: `src/sw.ts`**

```typescript
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

**File: `src/app/layout.tsx` — register the service worker**

Add a client component that registers the service worker:

**File: `src/components/ServiceWorkerRegistration.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])
  return null
}
```

Then include `<ServiceWorkerRegistration />` in the root layout's `<body>`.

**Why Serwist over a hand-rolled service worker:**
- Handles Next.js-specific routing (App Router, RSC, data fetching)
- Precaches the app shell automatically from the build manifest
- Runtime caching strategies for images, fonts, and API calls
- Proper cache invalidation on deploys
- A hand-rolled `sw.js` with just `self.addEventListener('fetch', ...)` would satisfy Chrome's installability check but wouldn't actually cache anything useful

**Alternative: minimal hand-rolled service worker (if Serwist adds too much complexity)**

If Serwist causes issues with the existing build pipeline, a bare-minimum service worker still enables installability:

```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first, no caching — just satisfies Chrome's requirement
  event.respondWith(fetch(event.request));
});
```

This approach is simpler but provides no offline capability. Use it only as a fallback if Serwist integration is problematic.

### 3.6 Vercel configuration

Vercel serves `public/` files with default caching headers. A few adjustments ensure correct behavior:

**File: `vercel.json` (add or merge into existing)**

```json
{
  "headers": [
    {
      "source": "/site.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" },
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

**Why:**
- The manifest must be served as `application/manifest+json` (some servers default to `application/octet-stream` for `.webmanifest`)
- The service worker must never be aggressively cached — `max-age=0` ensures updates propagate immediately
- `Service-Worker-Allowed: /` allows the service worker at root scope even if the file path changes

### 3.7 Locale considerations

STG uses `next-intl` with routes structured as `/[locale]/...`. The manifest's `start_url` is set to `/?utm_source=pwa&utm_medium=homescreen` — this hits the root, which the existing middleware redirects to the user's preferred locale (e.g., `/lv/`). This is the correct behavior: let the middleware handle locale detection rather than hardcoding a locale in the manifest.

If in the future per-locale manifests are needed (e.g., `"name": "Spēļu Tirgus"` in Latvian), this can be done via a Next.js API route that dynamically generates the manifest based on the `Accept-Language` header. That is out of scope for this PRD.

---

## 4. File summary

All new and modified files:

| File | Action | Description |
|------|--------|-------------|
| `public/site.webmanifest` | Create | Web app manifest (Section 3.1) |
| `public/icons/icon-192.png` | Create | 192×192 app icon |
| `public/icons/icon-512.png` | Create | 512×512 app icon |
| `public/icons/icon-512-maskable.png` | Create | 512×512 maskable icon with safe-zone padding |
| `public/apple-touch-icon.png` | Create | 180×180 iOS home screen icon |
| `public/favicon.ico` | Create (if missing) | Multi-size favicon |
| `public/favicon.svg` | Create (if missing) | SVG favicon |
| `public/screenshots/pwa-wide.png` | Create | 1280×720 desktop screenshot |
| `public/screenshots/pwa-narrow.png` | Create | 390×844 mobile screenshot |
| `src/app/layout.tsx` | Modify | Add `viewport` export, update `metadata` with manifest link, icons, and `appleWebApp` config |
| `src/sw.ts` | Create | Serwist service worker source |
| `src/components/ServiceWorkerRegistration.tsx` | Create | Client component to register service worker |
| `next.config.mjs` | Modify | Wrap with `withSerwist` |
| `vercel.json` | Modify | Add headers for manifest and service worker |
| `package.json` | Modify | Add `@serwist/next` and `serwist` dependencies |

---

## 5. Acceptance criteria

### Must pass

- [ ] `site.webmanifest` is accessible at `https://www.secondturn.games/site.webmanifest` and returns valid JSON with `Content-Type: application/manifest+json`
- [ ] Chrome DevTools → Application → Manifest shows all fields parsed correctly with no warnings
- [ ] Chrome DevTools → Application → Service Workers shows `sw.js` registered and active
- [ ] Lighthouse PWA audit passes "Installable" checks (manifest + service worker + HTTPS)
- [ ] On Android Chrome, the install prompt ("Add to Home Screen") appears after visiting the site
- [ ] On iOS Safari, "Add to Home Screen" creates a standalone app (no Safari chrome visible)
- [ ] The home screen icon on both platforms displays correctly (not blank, not clipped)
- [ ] Launching from home screen shows `#d08770` themed splash/status bar and loads at the correct locale
- [ ] The `utm_source=pwa` parameter is visible in analytics when launched from home screen
- [ ] Service worker does not break navigation, locale switching, or checkout flow
- [ ] `next dev` works normally (service worker disabled in development)

### Should pass

- [ ] Android Chrome shows the "richer install UI" with screenshots (requires both `wide` and `narrow` screenshots)
- [ ] Maskable icon renders correctly in Android's adaptive icon shape (circle, squircle, etc.) with die symbol not clipped
- [ ] Basic offline: if network drops after initial load, previously visited pages show cached version rather than browser error

### Visual verification

Test on these devices/browsers:
- Android Chrome (latest) — install prompt, home screen icon, standalone launch
- iOS Safari 16.4+ — Add to Home Screen, standalone mode, status bar style
- Desktop Chrome — install icon in address bar (optional but nice to verify)

---

## 6. Testing commands

```bash
# After deployment, run Lighthouse PWA audit
npx lighthouse https://www.secondturn.games --only-categories=pwa --output=json

# Validate manifest
curl -s https://www.secondturn.games/site.webmanifest | jq .

# Verify service worker is served correctly
curl -I https://www.secondturn.games/sw.js
# Should show: Content-Type: application/javascript, Cache-Control: public, max-age=0, must-revalidate

# Check Apple meta tags in HTML
curl -s https://www.secondturn.games/ | grep -E "apple-mobile-web-app|apple-touch-icon|theme-color|manifest"
```

---

## 7. Rollback plan

If the service worker causes issues (caching stale pages, breaking navigation):

1. Deploy an updated `public/sw.js` that unregisters itself:

```javascript
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});
```

2. Remove the `withSerwist` wrapper from `next.config.mjs`
3. The manifest and Apple meta tags are safe to leave in place — they have no side effects without a service worker

---

## 8. Future enhancements (out of scope)

These are noted for future PRDs:

- **Push notifications** — notify buyers when wishlist games are listed, notify sellers of new offers. Requires VAPID keys, Supabase Edge Function for sending, and user permission flow
- **Offline browse cache** — cache the last N viewed listings for offline access
- **Per-locale manifests** — serve localized `name` and `description` via API route based on user locale
- **Install prompt UX** — custom in-app banner prompting users to install (using `beforeinstallprompt` event) with STG branding instead of the generic Chrome prompt
- **App Shortcuts** — manifest `shortcuts` array for quick actions from long-press on home screen icon (e.g., "Sell a game", "Browse", "My orders")

---

*Every game deserves a second turn — even on the home screen.*
