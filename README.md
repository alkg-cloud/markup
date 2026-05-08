# Markup

Self-hosted HTML mockup review platform. Single Docker container, SQLite + filesystem, AI-agent friendly.

Behaves like GitHub PR reviews, but for live HTML/CSS/JS interfaces with screenshot-based annotations and an API designed for agent orchestrators (e.g., Paperclip).

## Quickstart

```bash
docker run -d \
  --name markup \
  -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -e AGENT_TOKENS="paperclip:$(openssl rand -hex 32)" \
  -v $(pwd)/markup-data:/app/data \
  ghcr.io/your-org/markup:latest
```

Open `http://localhost:3000` and follow the setup wizard to create the admin account.

Or use Docker Compose — see `docker-compose.example.yml`.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Public URL |
| `AUTH_SECRET` | required, ≥ 32 chars | JWT signing |
| `DATA_DIR` | `/app/data` | Storage root |
| `PUID` | `1000` | Linux user ID to drop to |
| `PGID` | `1000` | Linux group ID |
| `AGENT_TOKENS` | empty | `name1:secret1,name2:secret2` — seeded idempotently on every boot |
| `MAX_UPLOAD_MB` | `50` | Per-zip upload cap |
| `MAX_FILES_PER_UPLOAD` | `1000` | Per-zip file count cap |
| `MAX_FILE_SIZE_MB` | `10` | Per-individual-file cap inside zip |
| `LOG_LEVEL` | `info` | pino level |

## Reverse proxy with TLS

The container only serves HTTP. Use a reverse proxy for HTTPS.

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

## Agent API

Agents authenticate via `Authorization: Bearer mk_…`. Tokens are managed in the UI under
`Settings → Agents` (admin only) or seeded via the `AGENT_TOKENS` env var.

```bash
# Create a mockup
curl -F name="My Mockup" -F build=@build.zip \
  -H "Authorization: Bearer mk_…" \
  http://localhost:3000/api/mockups

# Reply to a thread
curl -X POST \
  -H "Authorization: Bearer mk_…" \
  -H "content-type: application/json" \
  -d '{"body":"fixed in the next version"}' \
  http://localhost:3000/api/threads/<id>/reply

# Resolve a thread
curl -X POST \
  -H "Authorization: Bearer mk_…" \
  http://localhost:3000/api/threads/<id>/resolve
```

## Reset scripts

If you lose admin access or need to reseed tokens:

```bash
# Reset only auth (admin user + sessions). Mockups, annotations, threads preserved.
docker exec -it --user 1000:1000 markup pnpm reset:auth

# Reset only agent tokens (AGENT_TOKENS reseeded on next boot)
docker exec -it --user 1000:1000 markup pnpm reset:tokens

# Nuke everything (interactive confirmation; --force to skip)
docker exec -it --user 1000:1000 markup pnpm reset:all
```

## Backup

Everything lives in `/app/data` (SQLite WAL mode + mockup files). To back up:

```bash
docker stop markup
tar -czf markup-backup-$(date +%F).tar.gz -C /path/to/markup-data .
docker start markup
```

For online backup (no downtime), use SQLite's online backup API or `litestream`.

## Architecture

- Next.js 16 (App Router) standalone build, single Node process
- SQLite via Prisma 7 with `@prisma/adapter-better-sqlite3` (WAL mode)
- Local filesystem under `/app/data` for mockups + annotation screenshots
- Iframe sandboxed (`allow-scripts allow-same-origin`); `html2canvas` for screenshots
- tldraw for the annotation drawing layer (planned for v1.1)
- `tini` PID 1 + `su-exec` privilege drop to `PUID:PGID`

## License

MIT
