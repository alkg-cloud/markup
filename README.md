<!-- markdownlint-disable MD041 -->
<div align="center">
  <a href="https://github.com/alkg-cloud/markup">
    <img src="./docs/images/logo.svg" alt="Markup" width="128" />
  </a>

  <h1>Markup</h1>

  <p><strong>Self-hosted HTML mockup review for humans and AI agents.</strong></p>

  <p>
    GitHub PR review, but for live frontends.
    <br />
    Reviewers drop pin annotations on the rendered page. Agents read them as JSON and ship fixes as unified diffs.
  </p>

  <p>
    <a href="#quickstart"><strong>Quickstart</strong></a> ·
    <a href="#install">Install</a> ·
    <a href="docs/INDEX.md">Docs</a> ·
    <a href="#agent-api">Agent API</a> ·
    <a href="https://github.com/alkg-cloud/markup/issues">Issues</a>
  </p>

  <p>
    <a href="LICENSE"><img alt="License: Elastic License 2.0" src="https://img.shields.io/badge/license-ELv2-blue.svg"></a>
    <a href="https://nextjs.org/"><img alt="Built with Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=white"></a>
    <a href="https://github.com/alkg-cloud/markup/pkgs/container/markup"><img alt="Release" src="https://img.shields.io/github/package-json/v/alkg-cloud/markup?label=release"></a>
    <a href="https://github.com/alkg-cloud/markup/actions/workflows/test.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/alkg-cloud/markup/test.yml?branch=main&label=ci"></a>
    <a href="https://github.com/alkg-cloud/markup/tree/coverage-data/report"><img alt="Coverage" src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/alkg-cloud/markup/coverage-data/badge.json"></a>
  </p>

</div>

<br />

Markup is a single-container web app for reviewing interactive HTML/CSS/JS mockups. Reviewers see the real rendered page, drop a teardrop pin on the issue, and resolve threads as the work lands. An equally first-class HTTP API lets AI dev assistants and agent orchestrators (Claude Code, Cursor, Aider, LangGraph, CrewAI) read those annotations as structured payloads and post fixes back as small unified diffs.

## Why Markup

- 🎯 **Review the live frontend, not screenshots.** The mockup renders in an iframe. Pins reflow with the layout via DOM-anchored coordinates and survive viewport, zoom, and reflow changes.
- 📦 **Self-host on a small box.** One Docker container. SQLite plus filesystem. No PostgreSQL, no Redis, no external services. A 256 MB instance is enough for a small team.
- 🤖 **An API agents can actually use.** Server-side DOM resolution, computed-style extraction, unified-diff versioning. The same routes the browser hits power autonomous review loops, AI dev assistants, and custom CI integrations.
- 🔀 **Versioning by diff, not zip-upload.** Patches apply as standard unified diffs against a base version. The fix round trip is typically 5 to 15 KB on the wire.
- 🔐 **Cookie or Bearer, one contract.** A reviewer in a browser and an agent on a job runner hit the same endpoints. No parallel HTTP surface.
- 💾 **One mount, one backup.** SQLite DB, mockup blobs, annotation screenshots, sidecar caches all live under `${DATA_DIR}`. Mount one volume, back up one tree.

## Quickstart

```bash
docker run -d --name markup \
  -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -v $(pwd)/markup-data:/app/data \
  ghcr.io/alkg-cloud/markup:latest
```

Open `http://localhost:3000` and follow the setup wizard. The first request redirects to `/setup`; create the admin account, then subsequent visits go to `/login`. To seed agent tokens at boot, set `AGENT_TOKENS=name1:secret1,name2:secret2`. The seeder is idempotent across restarts.

## Install

### Docker

```bash
docker run -d --name markup \
  -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -v $(pwd)/markup-data:/app/data \
  ghcr.io/alkg-cloud/markup:latest
```

Or with Compose. See [`docker-compose.example.yml`](docker-compose.example.yml).

### From source

```bash
git clone https://github.com/alkg-cloud/markup.git
cd markup
pnpm install
cp .env.example .env.local
pnpm prisma migrate deploy
pnpm dev
```

Requires Node.js 22+ and pnpm. Visit `http://localhost:3000`.

## How it works

Each mockup is a versioned bundle of HTML, CSS, and JS. Annotations are pins anchored to DOM nodes inside the rendered mockup. Each pin opens a thread that humans and agents both write into.

```text
Mockup ─< MockupVersion          each mockup is a versioned bundle of HTML / CSS / JS
   │
   └─< Annotation ── Thread ─< Message
                                     one pin, one thread, many replies (user or agent)
```

- **Mockup**: a named, sluggable artefact representing one frontend under review. Each upload (a zip with `index.html` at the root) becomes a new immutable `MockupVersion`. The currently-served version is `Mockup.currentVersionId`.
- **Annotation**: a draft composed in the rail's `DraftCard` and persisted on send. Carries a body, an array of DOM anchors (text-anchor or element-anchor, resilient to reflow), a `colorIndex` shared by all of the annotation's pins, and a stamp of which version was current at creation time.
- **Thread**: one per annotation, holding the conversation. `status` is one of `open`, `needs review`, or `resolved`.
- **Message**: a reply on a thread. Authored by a `user` (cookie session) or an `agent` (Bearer token).

## Features

| Surface | What it does |
| --- | --- |
| **Inline DraftCard** | Mounted at the top of the annotations rail while a user is drafting. Three terminal actions: Cancel, Draft (⌘S), Send (⌘↵). Survives reloads via `localStorage`. |
| **Pin-based review** | Click anywhere on the live mockup to drop a pin while a draft is active. Pins reflow with the layout via DOM-anchored coordinates and persist across reloads. |
| **Versioning** | Every upload is immutable. Side-by-side and overlay diff views compare any two versions; the current version powers the serve route at `/m/<id>/`. |
| **Agent API** | A single-call aggregator returns annotation metadata, the inline current HTML, and a unified diff against the version-at-creation. |
| **Cookie or Bearer** | The same routes serve the browser UI (cookie JWT) and non-browser clients (Bearer agent tokens). One contract, two front doors. |
| **Single-mount deploy** | All state lives under `${DATA_DIR}`: SQLite DB, mockup blobs, annotation screenshots, sidecar caches. Mount one volume, back up one tree. |

## Agent API

A typical fix loop is three calls.

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
     -d '{"body":"fixed in v2; see diff above"}' \
     "http://localhost:3000/api/threads/$THREAD_ID/reply"
```

Typical round-trip is **5 to 15 KB** on the wire. The full contract (response shapes, error codes, cache invalidation rules) is documented under [`docs/agent-loop/`](docs/agent-loop/INDEX.md).

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AUTH_SECRET` | yes | (none) | Session JWT signing key, ≥ 32 chars. Rotation invalidates existing sessions. |
| `DATA_DIR` | yes | (none) | Root path for SQLite DB and mockup blobs. Mount as a volume in Docker. |
| `APP_URL` | no | `http://localhost:3000` | Public URL. Required so the puppeteer-backed region screenshot endpoint can reach the serve route. |
| `DATABASE_URL` | no | `file:./prisma/dev.db` | Prisma connection string. |
| `LOG_LEVEL` | no | `info` | One of `fatal`, `error`, `warn`, `info`, `debug`, `trace`. |
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

Everything lives under `${DATA_DIR}`: the SQLite DB in WAL mode, mockup files, annotation screenshots, sidecar caches. For a cold backup:

```bash
docker stop markup
tar -czf markup-backup-$(date +%F).tar.gz -C /path/to/markup-data .
docker start markup
```

For online backup, use SQLite's online-backup API or [Litestream](https://litestream.io/) against the DB. The blob layer under `${DATA_DIR}/mockups/` is safe to rsync hot since files are append-mostly.

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

## Releases

Every semver tag (`v*`) pushed to `main` triggers the image workflow and publishes to `ghcr.io/alkg-cloud/markup`.

| Tag | When published |
|-----|----------------|
| `vX.Y.Z` | On semver tag push. Multi-arch (amd64 + arm64). |
| `vX.Y`, `vX` | Floating aliases updated on each patch/minor tag. |
| `latest` | Points to the most recent `main`-green release. |
| `sha-<7>` | Every `main` push for debugging. |

Images pass a mandatory smoke test (`/api/health` returning 200) before the release is created. No manual approval needed: a green tag is a published release. Pull a specific version with `docker pull ghcr.io/alkg-cloud/markup:v1.2.3`. Release notes live on the [releases page](https://github.com/alkg-cloud/markup/releases).

## Support

Open an [issue](https://github.com/alkg-cloud/markup/issues/new) for bug reports, feature requests, or questions about deploying Markup.

## Contributing

Contributions of any size are welcome. The full flow, including the one-comment Contributor License Agreement, lives in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[Elastic License 2.0](LICENSE) © Alexandre Camillo. Free for any use, including internal use within an organization, **except** offering Markup to third parties as a hosted or managed service. See [`LICENSE`](LICENSE) for full terms. Contributors agree to the [Contributor License Agreement](CLA.md); the flow is described in [`CONTRIBUTING.md`](CONTRIBUTING.md).
