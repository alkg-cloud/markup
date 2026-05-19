# Stack

Markup is a single-process Next.js application served from a Docker container. The same codebase contains the API routes, the React UI, and the Prisma schema — there is no separate frontend/backend split.

## Runtime

- **Node.js 20+** (Next 16 requirement)
- **Next.js 16** (App Router) with **Turbopack** in dev and the **standalone build** in production
- **React 19** for client components
- **TypeScript** in strict mode

## Persistence

- **SQLite** via Prisma 7 with `@prisma/adapter-better-sqlite3` (WAL mode)
- Database file: `prisma/dev.db` (dev) / `prisma/test.db` (vitest) / `${DATA_DIR}/db.sqlite` (production)
- **Filesystem storage** for blobs under `${DATA_DIR}/mockups/<mockupId>/…` — see [`docs/api/storage.md`](api/storage.md)

## Authentication

- **Session JWT** (`mk_session` cookie, HS256, signed with `AUTH_SECRET`) for users
- **Bearer agent tokens** (`Authorization: Bearer mk_<hash>`) for automation clients
- Both go through a single `identify(req)` helper that returns `{kind: 'user' | 'agent', ...}` or `null`. See [`docs/api/auth.md`](api/auth.md).

## UI

- **Manrope** (sans, weights 400–800) and **JetBrains Mono** loaded via `next/font/google`
- **Inline styles + design tokens** in `src/styles/tokens.css` (OKLCH palette, hue 165°, single source of truth for colour, motion, spacing, radii, shadows, focus ring)
- **CSS Modules are not used** — components are styled via inline `style={{...}}` referencing tokens via `var(--…)`. Global rules live in `src/app/globals.css`.
- **`:focus-visible`** is the global focus indicator; component-level `outline:none` is allowed only when the global rule still wins by specificity

## Annotation drawing layer

- **tldraw v5** via `@tldraw/tldraw` for the on-screen drawing canvas (annotation modal + edit mode on the detail page)
- Snapshots are persisted as JSON sidecars next to the screenshot PNG
- Screenshot base64 is stripped from the snapshot at save time and rehydrated on read — see [`docs/frontend/tldraw.md`](frontend/tldraw.md)

## Server-side image + DOM

- **`sharp`** for PNG cropping (`/api/annotations/[id]/region`)
- **`puppeteer`** (with bundled chromium, ~150 MB) for server-side DOM resolution at the bbox the user drew (`/api/annotations/[id]/intent`)
- **`diff`** + **`@types/diff`** for unified-diff apply/render (`/api/mockups/[id]/version-patch`, `/api/mockups/[id]/diff`)
- **`jszip`** for in-memory zip composition when applying patches

## Testing

- **Vitest** for unit + integration tests
- **`fileParallelism: false, maxWorkers: 1`** because the integration suite shares `prisma/test.db`
- Test setup in `tests/setup.ts` bootstraps the test DB on first run via `prisma migrate deploy`
- See [`docs/testing.md`](testing.md) for patterns and the `prisma/test.db` rule

## Linting + formatting

- **Biome** is the single tool for both lint and format
- Configuration in `biome.json` at the repo root
- `pnpm lint` is `biome check .` — see [`docs/code-style.md`](code-style.md)

## Logging

- **Pino** (`src/lib/logger.ts`) — structured JSON logs, level controlled by `LOG_LEVEL`
- Loggers are named (`logger.child({ name: 'agent-seed' })`) so the agent-token boot seed and other subsystems are filterable

## Deployment

- **Single Docker container** with `tini` PID 1 and `su-exec` privilege drop to `PUID:PGID`
- Standalone Next build copies node_modules + the compiled `.next/standalone` tree
- Reverse proxy (Caddy or nginx) terminates TLS — the container only serves HTTP
- See `README.md` for the runbook

## Folder layout

```
src/
  app/                      # Next.js App Router
    api/                    # API routes (route.ts files)
      agent/context/[annotationId]/route.ts
      annotations/[id]/{intent,region,screenshot,tldraw,messages}/route.ts
      mockups/[id]/{version,version-patch,diff,thumbnail,annotations,versions/[vid]/{source,promote}}/route.ts
      threads/[id]/{reply,resolve,reopen}/route.ts
      auth/{login,logout,setup}/route.ts
      agent-tokens/[id]?/route.ts
    annotations/[id]/       # Annotation detail (client page + read-only canvas)
    mockups/                # List + detail + diff pages
    settings/agents/        # Admin: agent token management
    login/, setup/          # Auth flows
    m/[mockupId]/[...path]/route.ts  # Public-ish serve route (auth-checked) for mockup HTML
    layout.tsx, globals.css, page.tsx
  components/               # Shared React components
    AnnotationCanvas/       # tldraw wrapper
    AnnotationModal/        # + Comment modal
    AnnotationPin/          # numbered pins overlaid on iframes
    AppNav/                 # shared top nav
    ThreadTimeline/         # message list
  lib/
    annotation/service.ts   # createAnnotation, updateAnnotationTldraw
    auth/                   # identify, session, password, resolve-display-name
    diff/                   # apply-unified, render-unified
    intent/                 # parser, contrast, cache, puppeteer singleton
    mockup/                 # service, storage, zip-extractor
    region/crop.ts          # sharp-based bbox crop
    tldraw/snapshot-screenshot.ts  # strip + rehydrate
    boot.ts, env.ts, logger.ts, prisma.ts
  styles/tokens.css
prisma/
  schema.prisma
  migrations/<timestamp>_<name>/migration.sql
scripts/                    # one-shot maintenance scripts (tsx-run)
tests/
  integration/{annotation,api,auth,lib,mockup}/*.test.ts
  unit/lib/{intent,diff,region,tldraw,…}/*.test.ts
  fixtures/mockups/*.zip
  setup.ts
docs/                       # this directory
docker/, README.md
```
