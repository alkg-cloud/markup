# Markup

**Self-hosted HTML mockup review for humans and AI agents.**

Markup is a single-container web app for reviewing interactive HTML/CSS/JS mockups. Reviewers drop pin-style annotations directly on the rendered page — same pattern as a GitHub PR review, but for live frontends. An equally first-class HTTP API lets AI dev assistants and agent orchestrators (Claude Code, Cursor, Aider, custom LangGraph/CrewAI workflows, …) read those annotations as structured intent payloads and ship fixes back as small unified diffs, without re-uploading the entire build.

```bash
docker run -d --name markup \
  -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -v $(pwd)/markup-data:/app/data \
  ghcr.io/your-org/markup:latest
```

Open `http://localhost:3000` and follow the setup wizard.

---

## Why Markup

- **Review live HTML, not screenshots.** Reviewers see the actual rendered mockup in an iframe, drop a teardrop pin where the issue is, draw with a tldraw-powered canvas if pixels matter, type a comment, and tag the intent (`visual` / `copy` / `behavior` / `other`).
- **Self-host on a small box.** Single Docker container, SQLite + filesystem, no external services, no PostgreSQL, no Redis. A 256 MB instance is enough for a small team.
- **An API designed for agents.** Every annotation surface that the UI offers — including server-side puppeteer DOM resolution, computed-style extraction, and unified-diff versioning — is exposed as a stable HTTP contract. Agent orchestrators (LLM-backed dev assistants, autonomous review loops, custom CI integrations) read intent and ship fixes through the same endpoints the browser uses.

## Quickstart

### With Docker

```bash
docker run -d --name markup \
  -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -v $(pwd)/markup-data:/app/data \
  ghcr.io/your-org/markup:latest
```

Or with Docker Compose — see `docker-compose.example.yml`.

### From source

Requires Node.js 20+ and pnpm.

```bash
git clone https://github.com/your-org/markup.git
cd markup
pnpm install
cp .env.example .env.local              # then edit AUTH_SECRET + DATA_DIR
pnpm prisma migrate deploy
pnpm dev                                  # http://localhost:3000
```

### First-run setup

The first hit redirects to `/setup`. Create the admin account; subsequent hits go to `/login`.

To seed agent tokens at boot, set `AGENT_TOKENS=name1:secret1,name2:secret2`. The seeder is idempotent — re-running with the same env var skips existing rows.

## Concepts

```
Mockup            ─< MockupVersion         each mockup has 1+ immutable versions
   │
   └─< Annotation  ─── Thread ─< Message   one thread per pin, threaded replies
```

- **Mockup** — a named, sluggable artefact representing one frontend under review. Each upload (zip with `index.html` at the root) becomes a new `MockupVersion`. The currently-served version is `Mockup.currentVersionId`.
- **Annotation** — a pin dropped on a specific mockup at specific iframe coordinates. Carries: a screenshot of the moment, a tldraw drawing snapshot, a free-text comment, an `intent_type` chip (`visual` / `copy` / `behavior` / `other`), and a stamp of which version was current at creation time.
- **Thread** — one per annotation, holding the conversation. `status` is `open` or `resolved`.
- **Message** — a reply on a thread. Authored by a `user` or an `agent` (Bearer-authenticated automation client).

## Features

| | |
|---|---|
| **Pin-based review** | Click anywhere on the live mockup to capture + annotate; pins persist across reloads and reflow with the layout. |
| **Drawing layer** | tldraw-powered canvas overlaid on the captured screenshot — draw shapes, arrows, highlights, free-text labels. |
| **Intent chips** | Four-bucket vocabulary (`visual` / `copy` / `behavior` / `other`) seeds future routing across multiple agents and gives the team an at-a-glance signal of what kind of review work is open. |
| **Versioning** | Every upload is an immutable `MockupVersion`. Side-by-side and overlay diff views compare any two versions; the current version powers the live serve route at `/m/<id>/`. |
| **Agent API** | A single-call aggregator returns annotation metadata, parsed drawings, server-resolved DOM-at-bbox + computed styles + WCAG contrast, the inline current HTML, and a unified diff against the version-at-creation. Patches ship back as text-only unified diffs (no zip rebuild). |
| **Auth that fits** | Cookie-based JWT sessions for the browser; Bearer agent tokens for non-browser clients. Same routes serve both. |
| **Single binary, single mount** | Everything in `${DATA_DIR}` — SQLite DB plus mockup files plus annotation screenshots plus sidecar caches. Mount one volume, back up one tree. |

## Agent API

The agent surface lives under `/api/agent/` and reuses the same routes the browser uses where it can. Every request carries either a session cookie or `Authorization: Bearer mk_…`.

A typical fix loop:

```bash
# 1. Read everything an agent needs in a single call
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/agent/context/$ANNOTATION_ID"
# → { annotation, intent, thread, current_version: { files, … }, diff_since_creation }

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

Typical round-trip is 5–15 KB on the wire (vs ~660 KB for the legacy zip-rebuild path), with sub-50ms cache hits on the intent payload after the first read.

The full API contract — including response shapes, error codes, and cache invalidation rules — is documented under [`docs/agent-loop/`](docs/agent-loop/INDEX.md). The contract is versioned implicitly through stable field names and additive changes; any breaking change is documented in the release notes.

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AUTH_SECRET` | yes | — | Session JWT signing key. Must be ≥ 32 chars. Rotate with care — invalidates all existing sessions. |
| `DATA_DIR` | yes | — | Root path for SQLite DB and uploaded mockup blobs. Mount as a volume in Docker. |
| `APP_URL` | no | `http://localhost:3000` | Public URL. Required for puppeteer (the intent endpoint) to reach the serve route. |
| `DATABASE_URL` | no | `file:./prisma/dev.db` | Prisma connection string. Override to point at a different SQLite path. |
| `LOG_LEVEL` | no | `info` | One of `fatal` / `error` / `warn` / `info` / `debug` / `trace`. |
| `PUID` | no | `1000` | Linux UID the container drops to (Docker only). |
| `PGID` | no | `1000` | Linux GID the container drops to (Docker only). |
| `AGENT_TOKENS` | no | empty | Boot-seed tokens, format `name1:secret1,name2:secret2`. Idempotent across restarts. |
| `MAX_UPLOAD_MB` | no | `50` | Total zip size cap on upload. |
| `MAX_FILES_PER_UPLOAD` | no | `1000` | File count cap inside a zip. |
| `MAX_FILE_SIZE_MB` | no | `10` | Per-file cap inside a zip. |

## Reverse proxy and TLS

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

Everything lives under `${DATA_DIR}` (the SQLite DB in WAL mode plus mockup files plus annotation screenshots and sidecar caches). To take a cold backup:

```bash
docker stop markup
tar -czf markup-backup-$(date +%F).tar.gz -C /path/to/markup-data .
docker start markup
```

For online backup (no downtime), use SQLite's online-backup API or [Litestream](https://litestream.io/) against the DB; the blob layer under `${DATA_DIR}/mockups/` is safe to rsync hot since files are append-mostly.

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

A single Node process hosts both the web UI and the API. Persistence is split between an embedded SQLite database (rows) and the local filesystem (blobs).

```
┌─────────────────────────────────────────────────────────┐
│  Reverse proxy (Caddy / nginx) — TLS termination        │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────┐
│  Markup container (single Node process)                 │
│  ────────────────────────                               │
│  Next.js 16 (App Router, standalone build)              │
│  ├── /m/[id]/...                serve mockup files       │
│  ├── /api/mockups, /api/annotations, /api/threads        │
│  ├── /api/agent/context, /api/.../intent, /version-patch │
│  └── /mockups, /annotations, /settings, /login           │
│                                                         │
│  Headless Chromium (puppeteer)                           │
│      ↳ runs on demand for the intent endpoint            │
│                                                         │
│  Prisma 7 + better-sqlite3 (WAL mode)                    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
              ${DATA_DIR}/                  (single mount)
                ├── prisma/dev.db
                └── mockups/<id>/
                    ├── thumbnail.png
                    ├── versions/<vid>/build/...
                    └── annotations/<aid>/
                        ├── screenshot.png
                        ├── tldraw.json
                        ├── intent.json     (sidecar cache)
                        └── region.png      (sidecar cache)
```

### Tech stack

- **Next.js 16** App Router, served as a standalone build
- **React 19** for client islands; the rest is server-rendered
- **Prisma 7** + `better-sqlite3` adapter (WAL mode)
- **tldraw** for the annotation drawing layer
- **puppeteer** for server-side DOM resolution at the bbox a user drew
- **sharp** for screenshot cropping
- **Vitest** + **Biome** for testing and linting
- **Pino** for structured logs

The full stack and folder layout are documented in [`docs/stack.md`](docs/stack.md).

## Documentation

- [`docs/INDEX.md`](docs/INDEX.md) — task-based lookup of every doc
- [`docs/agent-loop/`](docs/agent-loop/INDEX.md) — the agent API contract (intent payload, patch format, chips)
- [`docs/api/`](docs/api/INDEX.md) — REST conventions, auth, storage layout
- [`docs/data/schema.md`](docs/data/schema.md) — Prisma models and relationships
- [`docs/frontend/`](docs/frontend/INDEX.md) — components, styling tokens, tldraw integration
- [`docs/ci.md`](docs/ci.md) — CI rules and pre-push checklist

## Contributing

Markup is open source under the MIT licence. Contributions of any size are welcome.

1. Read [`docs/INDEX.md`](docs/INDEX.md) — every change starts there
2. Run the pre-push checklist from [`docs/ci.md`](docs/ci.md): `pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm test && pnpm build`
3. Follow the commit conventions in [`docs/git/conventions.md`](docs/git/conventions.md): conventional-commits subject only, no body, no `Co-Authored-By` trailer
4. Open a PR with a short description of what changed and why

For non-trivial changes, please open an issue first to discuss the design.

## License

[MIT](LICENSE)
