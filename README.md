<!-- markdownlint-disable MD041 -->
<div align="center">
  <a href="https://github.com/AlexandreCamillo/markup">
    <img src="./docs/images/logo.svg" alt="Markup" width="128" />
  </a>

  <h1>
  Self-hosted HTML mockup review for humans and AI agents
  </h1>

  <p>
    <a href="#quickstart">Quickstart</a> ·
    <a href="#install">Install</a> ·
    <a href="docs/INDEX.md">Docs</a> ·
    <a href="#agent-api">Agent API</a> ·
    <a href="#architecture">Architecture</a>
  </p>

  <p>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
    <a href="https://nextjs.org/"><img alt="Built with Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=white"></a>
    <a href="https://github.com/AlexandreCamillo/markup/releases"><img alt="Release" src="https://img.shields.io/github/v/release/AlexandreCamillo/markup"></a>
    <a href="https://github.com/AlexandreCamillo/markup/actions/workflows/test.yml"><img alt="Tests" src="https://img.shields.io/badge/tests-736%2F736-success"></a>
  </p>
</div>

[Markup](https://github.com/AlexandreCamillo/markup) is a single-container web app for reviewing interactive HTML/CSS/JS mockups. Reviewers drop pin-style annotations directly on the rendered page — same shape as a GitHub PR review, but for live frontends. An equally first-class HTTP API lets AI dev assistants and agent orchestrators (Claude Code, Cursor, Aider, custom LangGraph/CrewAI workflows) read those annotations as structured payloads and ship fixes back as small unified diffs.

- **Review the live frontend, not screenshots.** See the actual rendered mockup in an iframe, drop a teardrop pin where the issue is, type a comment, and resolve threads as the work lands.
- **Self-host on a small box.** Single Docker container. SQLite + filesystem. No PostgreSQL, no Redis, no external services. A 256 MB instance is enough for a small team.
- **An API agents can actually use.** Every surface the UI offers — server-side DOM resolution, computed-style extraction, unified-diff versioning — is exposed as a stable HTTP contract. The same routes the browser hits power autonomous review loops, AI dev assistants, and custom CI integrations.

## Quickstart

```bash
docker run -d --name markup \
  -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -v $(pwd)/markup-data:/app/data \
  ghcr.io/alexandrecamillo/markup:latest
```

Open `http://localhost:3000` and follow the setup wizard. The first request redirects to `/setup`; create the admin account, then subsequent visits go to `/login`. To seed agent tokens at boot, set `AGENT_TOKENS=name1:secret1,name2:secret2` — the seeder is idempotent across restarts.

## Install

### Docker

```bash
docker run -d --name markup \
  -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -v $(pwd)/markup-data:/app/data \
  ghcr.io/alexandrecamillo/markup:latest
```

Or with Compose — see [`docker-compose.example.yml`](docker-compose.example.yml).

### From source

```bash
git clone https://github.com/AlexandreCamillo/markup.git
cd markup
pnpm install
cp .env.example .env.local
pnpm prisma migrate deploy
pnpm dev
```

Requires Node.js 22+ and pnpm. Visit `http://localhost:3000`.

## How it works

```text
Mockup ─< MockupVersion          each mockup is a versioned bundle of HTML / CSS / JS
   │
   └─< Annotation ── Thread ─< Message
                                     one pin → one thread → many replies (user or agent)
```

- **Mockup** — a named, sluggable artefact representing one frontend under review. Each upload (zip with `index.html` at the root) is a new immutable `MockupVersion`. The currently-served version is `Mockup.currentVersionId`.
- **Annotation** — a draft composed in the rail's `DraftCard` and persisted on send. Carries a body, an array of DOM anchors (text-anchor or element-anchor — resilient to reflow), a `colorIndex` shared by all of the annotation's pins, and a stamp of which version was current at creation time.
- **Thread** — one per annotation, holding the conversation. `status` is `open`, `needs review`, or `resolved`.
- **Message** — a reply on a thread. Authored by a `user` (cookie session) or an `agent` (Bearer token).

## Features

| Surface | What it does |
| --- | --- |
| **Inline DraftCard** | Mounted at the top of the annotations rail while a user is drafting. Three terminal actions — Cancel · Draft (⌘S) · Send (⌘↵). Survives reloads via `localStorage`. |
| **Pin-based review** | Click anywhere on the live mockup to drop a pin while a draft is active. Pins reflow with the layout via DOM-anchored coordinates and persist across reloads. |
| **Versioning** | Every upload is immutable. Side-by-side and overlay diff views compare any two versions; the current version powers the serve route at `/m/<id>/`. |
| **Agent API** | A single-call aggregator returns annotation metadata, the inline current HTML, and a unified diff against the version-at-creation. |
| **Cookie or Bearer** | Same routes serve the browser UI (cookie JWT) and non-browser clients (Bearer agent tokens). One contract, two front doors. |
| **Single-mount deploy** | All state lives under `${DATA_DIR}` — SQLite DB, mockup blobs, annotation screenshots, sidecar caches. Mount one volume, back up one tree. |

## Agent API

A typical fix loop is three calls:

```bash
# 1. Read everything an agent needs in a single request
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/agent/context/$ANNOTATION_ID"
# → { annotation, thread, current_version: { files, … }, diff_since_creation }

# 2. Apply a fix as a unified diff (no zip rebuild)
curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     -d "$(jq -n --arg base "$BASE_VERSION_ID" --arg diff "$DIFF" \
            '{base_version_id: $base, patches: {"index.html": $diff}}')" \
     "http://localhost:3000/api/mockups/$MOCKUP_ID/version-patch"

# 3. Reply on the annotation thread
curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"body":"fixed in v2 — see diff above"}' \
     "http://localhost:3000/api/threads/$THREAD_ID/reply"
```

Typical round-trip is **5–15 KB** on the wire. The full contract — response shapes, error codes, cache invalidation rules — is documented under [`docs/agent-loop/`](docs/agent-loop/INDEX.md).

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AUTH_SECRET` | yes | — | Session JWT signing key, ≥ 32 chars. Rotation invalidates existing sessions. |
| `DATA_DIR` | yes | — | Root path for SQLite DB and mockup blobs. Mount as a volume in Docker. |
| `APP_URL` | no | `http://localhost:3000` | Public URL. Required for the puppeteer-backed region screenshot endpoint to reach the serve route. |
| `DATABASE_URL` | no | `file:./prisma/dev.db` | Prisma connection string. |
| `LOG_LEVEL` | no | `info` | One of `fatal` / `error` / `warn` / `info` / `debug` / `trace`. |
| `PUID` | no | `1000` | Linux UID the container drops to (Docker only). |
| `PGID` | no | `1000` | Linux GID the container drops to (Docker only). |
| `AGENT_TOKENS` | no | empty | Boot-seed tokens, format `name1:secret1,name2:secret2`. Idempotent across restarts. |
| `MAX_UPLOAD_MB` | no | `50` | Total zip size cap on upload. |
| `MAX_FILES_PER_UPLOAD` | no | `1000` | File count cap inside a zip. |
| `MAX_FILE_SIZE_MB` | no | `10` | Per-file cap inside a zip. |

## Reverse proxy

The container only serves HTTP. Terminate TLS upstream.

### Caddy

```caddyfile
markup.example.com {
  reverse_proxy localhost:3000
}
```

### nginx

```nginx
server {
  listen 443 ssl;
  server_name markup.example.com;
  ssl_certificate     /etc/letsencrypt/live/markup.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/markup.example.com/privkey.pem;

  client_max_body_size 60m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Backup and recovery

Everything lives under `${DATA_DIR}` (the SQLite DB in WAL mode, mockup files, annotation screenshots, sidecar caches). For a cold backup:

```bash
docker stop markup
tar -czf markup-backup-$(date +%F).tar.gz -C /path/to/markup-data .
docker start markup
```

For online backup, use SQLite's online-backup API or [Litestream](https://litestream.io/) against the DB; the blob layer under `${DATA_DIR}/mockups/` is safe to rsync hot since files are append-mostly.

### Reset scripts

If you lose admin access or need to reseed tokens:

```bash
# Reset only auth (admin user + sessions). Mockups, annotations, threads preserved.
docker exec -it --user 1000:1000 markup pnpm reset:auth

# Reset only agent tokens (AGENT_TOKENS reseeded on next boot)
docker exec -it --user 1000:1000 markup pnpm reset:tokens

# Nuke everything (interactive confirmation; --force to skip)
docker exec -it --user 1000:1000 markup pnpm reset:all
```

## Architecture

A single Node process hosts both the web UI and the API. Persistence is split between SQLite (rows) and the filesystem (blobs).

```text
┌───────────────────────────────────────────────────────────┐
│  Reverse proxy (Caddy / nginx)  —  TLS termination        │
└──────────────────────────────┬────────────────────────────┘
                               │ HTTP
┌──────────────────────────────▼────────────────────────────┐
│  Markup container (single Node process)                   │
│                                                           │
│   Next.js 16 App Router (standalone build)                │
│      ├── /m/[id]/...                serve mockup files    │
│      ├── /api/mockups, /api/annotations, /api/threads     │
│      ├── /api/agent/context, /version-patch               │
│      └── /projects, /annotations, /settings, /login       │
│                                                           │
│   Headless Chromium (puppeteer)                           │
│      ↳ on demand for region screenshots                   │
│                                                           │
│   Prisma 7 + better-sqlite3 (WAL mode)                    │
└──────────────────────────────┬────────────────────────────┘
                               │
                               ▼
                    ${DATA_DIR}/                (single mount)
                      ├── prisma/dev.db
                      └── mockups/<id>/
                          ├── thumbnail.png
                          ├── versions/<vid>/build/...
                          └── annotations/<aid>/
                              └── region.png    (sidecar cache)
```

### Tech stack

- **Next.js 16** App Router, served as a standalone build (client-side rendering only)
- **React 18** for the UI; every page is a `'use client'` component
- **Radix Primitives** — `react-form`, `react-alert-dialog`, `react-dialog`, `react-popover`, `react-toast`
- **Prisma 7** + `better-sqlite3` adapter (WAL mode)
- **puppeteer** for server-side region cropping at the bbox a user drew
- **sharp** for screenshot processing
- **Vitest** + **Biome** for testing and linting
- **Pino** for structured logs

The full stack and folder layout are documented in [`docs/stack.md`](docs/stack.md).

## Documentation

Browse the full [documentation index](docs/INDEX.md) or jump to a specific area:

- [**Agent loop**](docs/agent-loop/INDEX.md) — the agent API contract (`/context` aggregator, patch format, version-patch flow)
- [**API conventions**](docs/api/INDEX.md) — REST conventions, auth, storage layout
- [**Data schema**](docs/data/schema.md) — Prisma models and relationships
- [**Frontend**](docs/frontend/INDEX.md) — components, styling tokens, design system
- [**Design system**](docs/design/design-system/AUTHORING.md) — DS authoring guide (mandatory before touching any DS file)
- [**Task rules**](docs/task-rules.md) — what every change must do before opening a PR
- [**CI**](docs/ci.md) — pre-push checklist (`pnpm biome check . && pnpm tsc --noEmit && pnpm test && pnpm build`)

## Releases

Every semver tag (`v*`) pushed to `main` triggers the image workflow and publishes to `ghcr.io/alexandrecamillo/markup`:

| Tag | When published |
|-----|----------------|
| `vX.Y.Z` | On semver tag push — multi-arch (amd64 + arm64) |
| `vX.Y`, `vX` | Floating aliases updated on each patch/minor tag |
| `latest` | Points to the most recent `main`-green release |
| `sha-<7>` | Every `main` push for debugging |

Images pass a mandatory smoke test (`/api/health` → 200) before the release is created. No manual approval needed — a green tag is a published release. Pull a specific version with `docker pull ghcr.io/alexandrecamillo/markup:v1.2.3`. Release notes live on the [releases page](https://github.com/AlexandreCamillo/markup/releases).

## Support

Open an [issue](https://github.com/AlexandreCamillo/markup/issues/new) for bug reports, feature requests, or questions about deploying Markup.

## Contributing

Contributions of any size are welcome.

1. Read [`docs/INDEX.md`](docs/INDEX.md) — every change starts there.
2. Run the pre-push checklist from [`docs/ci.md`](docs/ci.md):

   ```bash
   pnpm biome check . && pnpm tsc --noEmit && pnpm test && pnpm build
   ```

3. Follow the commit conventions in [`docs/git/conventions.md`](docs/git/conventions.md): conventional-commits subject only, no body, no `Co-Authored-By` trailer.
4. Open a PR with a short description of what changed and why. For non-trivial changes, please open an issue first to discuss the design.

## License

[MIT](LICENSE) © Markup contributors
