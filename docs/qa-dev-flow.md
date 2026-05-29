# QA dev flow (dev server + seed + Cloudflare tunnel)

Use this flow when changes need **visual or interactive validation against real fixtures** before they go to `main`. Iterating on `prod` is heavy (commit → push → CI → image build → deploy → reload, ~5–10 minutes per change) and pollutes `main` with rough work. Running the same checks against the local dev server with a seeded database is sub-second and stays scoped to your machine.

The flow has three pieces:

1. **Next.js dev server** (`pnpm dev`) — hot-reloads on every source change.
2. **Dev seeder** (`pnpm seed:dev`) — wipes the local DB and re-seeds a rich QA state (admin user + projects + folders + mockups + multi-status annotations + threaded replies + reactions + multiple versions).
3. **Cloudflare tunnel** (`cloudflared tunnel --url http://localhost:3000`) — exposes the dev server at a public `*.trycloudflare.com` URL so reviewers, agents, and the Chrome browser-automation MCP can hit it without VPN or port-forwarding.

---

## Step-by-step

### 1. Start the dev server

```sh
pnpm dev
```

- Boots Next 16 on `http://localhost:3000` (Turbopack). Override with `PORT=3001 pnpm dev` when 3000 is busy — the tunnel command in step 3 must then point at the same port.
- Reads `.env` + `.env.local`. Required keys: `AUTH_SECRET`, `DATA_DIR`, `DATABASE_URL`.
- Leave it running in a background terminal. File saves under `src/` reload instantly.

### 2. Seed the dev database

```sh
pnpm seed:dev          # asks for confirmation
pnpm seed:dev --force  # skips the prompt (use in scripts / CI)
```

The seeder is idempotent — it wipes the DB and `${DATA_DIR}/mockups/` before re-creating state, so running it twice produces the same result. See [Seeded state](#seeded-state) for the inventory.

**Login**:

| Field    | Value              |
|----------|--------------------|
| Email    | `qa@markup.dev`    |
| Password | `markup-dev-2026`  |

These credentials are **dev-only** — they unlock the seeded admin account on the local SQLite. They have no relationship to `prod` (`markup.alego.cloud`); a separate seeder run would be required to bootstrap a different environment, and prod uses its own admin account.

### 3. (Optional) Expose via Cloudflare tunnel

Install once on the dev machine:

```sh
sudo curl -sSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared
```

Run the tunnel:

```sh
cloudflared tunnel --url http://localhost:3000
```

Each invocation prints a fresh `https://<random>-<words>.trycloudflare.com` URL. Open it in a browser and you'll land on the dev `/login` page over HTTPS. Closing the process tears the tunnel down.

The tunnel URL is randomly generated per run and not indexed publicly. It still exposes the dev DB to anyone who has the URL — don't share with people you don't trust, and don't leave it running unattended for long sessions.

#### Cross-origin allowlist (already configured)

`next.config.mjs` already includes `*.trycloudflare.com`, `*.ngrok.io`, and `*.ngrok-free.app` in `allowedDevOrigins`. Without these, Next 16's dev server **blocks client-side JS hydration** on non-localhost hosts — the login form renders but the submit handler never attaches, so clicking Sign in does a native form GET to `/login?` and "nothing happens" from the user's perspective. The config covers every fresh tunnel URL since the wildcard matches any subdomain. If you switch to a different tunnel provider, add its wildcard pattern there and restart `pnpm dev`.

---

## Seeded state

The seeder reproduces a representative QA state covering every visible surface in the mockup viewer:

### Users + auth

- 1 admin user: `qa@markup.dev` / `markup-dev-2026` (role `admin`, display name `ALKG` so the avatar resolves to `AL`)
- 1 agent token (`qa-agent`) — the secret prints to stdout at seed time so you can grab it for API tests

### Projects + folders

- `Lumen Coffee` (`lumen-coffee` slug, `coffee` icon)
  - `Hero` folder
  - `Pricing` folder
- `Design Demos` (`design-demos` slug, `sparkle` icon)
  - `Consoles` folder

### Mockups

| Mockup slug          | Source fixture                              | Project       | Folder    | Versions          |
|----------------------|---------------------------------------------|---------------|-----------|-------------------|
| `lumen-coffee-hero`  | `tests/fixtures/mockups/lumen-coffee.zip`   | Lumen Coffee  | Hero      | v1, v2, **v3** (current) |
| `helio-pricing`      | `tests/fixtures/mockups/helio-pricing.zip`  | Lumen Coffee  | Pricing   | v1                |
| `drone-console`      | `tests/fixtures/mockups/drone-console.zip`  | Design Demos  | Consoles  | v1                |

### Annotations

Five annotations are seeded on `lumen-coffee-hero` covering every status and pin layout:

| #   | Status         | Pins | Replies | Reactions     | Notes                                                  |
|-----|----------------|------|---------|---------------|--------------------------------------------------------|
| 1   | open           | 1    | 3       | 👍 🔥 (primary) | hero kerning + leading; exercises long thread          |
| 2   | needs review   | 2    | 1       | —             | multi-pin annotation across nav + headline             |
| 3   | resolved       | 1    | 2       | ✅ (primary)    | exercises the `resolved` pill colour                   |
| 4   | open           | 1    | 0       | —             | exercises the empty-thread "No replies" state          |
| 5   | open           | 1    | 1       | —             | ritual section pin; exercises a low-traffic anchor     |

One additional annotation lives on `helio-pricing` to demonstrate cross-mockup state.

Each annotation gets a distinct `colorIndex` (0..4) so the OKLCH palette is exercised end-to-end.

---

## Editing flow

1. `pnpm dev` is running. Open the tunnel URL (or `localhost:3000` directly).
2. Log in with the credentials above.
3. Navigate to `/mockups/lumen-coffee-hero` to land on the seeded viewer.
4. Edit any file under `src/`. Turbopack reloads in <1s; refresh the browser tab.
5. When you want to start fresh: `pnpm seed:dev --force` from another terminal — the dev server doesn't need a restart since the DB reset only touches data, not running code.

---

## Tearing down

The dev server, tunnel, and seeded data are entirely local.

```sh
# Stop the tunnel
pkill cloudflared

# Stop the dev server
pkill -f "next dev"

# Discard the seeded data (DB + extracted mockup zips)
pnpm reset:all --force
```

`pnpm reset:all` is the existing scorched-earth script — it removes users, tokens, mockups, annotations, and threads, and is the only way to roll the dev DB back to a truly empty state without re-seeding.

---

## Why this exists

Three failure modes this flow prevents:

1. **Pushing rough work to `main` to test it** — see commits in the project history where a single visual fix needed three deploys to converge. CI + image + deploy round-trip is ~7 minutes; the same change against the seeded dev takes 30 seconds.
2. **Logging into prod to validate dev work** — prod is a single-tenant production database. Test annotations created there persist until manually cleaned. The seeded dev DB is disposable by design.
3. **Hand-creating test data** — the seeder covers every status, every reaction shape, every reply count, every version transition, and multi-pin annotations in one command. Hand-clicking equivalent state takes 10+ minutes per reset.

The seeder source lives at `scripts/seed-dev.ts` — extend it (new annotation patterns, additional mockups, more agent tokens) rather than building one-off scripts.
