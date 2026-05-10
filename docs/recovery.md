# Recovery and rollback

## Image rollback

There is no automatic rollback. A bad release is fixed by tagging a new release.

```bash
# Pin a specific version
docker pull ghcr.io/alexandrecamillo/markup:v1.2.2

# Or target an immutable digest
docker pull ghcr.io/alexandrecamillo/markup@sha256:<digest>
```

Update your `docker-compose.yml` or `docker run` command to reference the pinned tag, then restart the container.

## Reset scripts

Run these from inside the container (`docker exec -it --user 1000:1000 markup <cmd>`):

| Script | What it resets | What it preserves |
|--------|---------------|-------------------|
| `pnpm reset:auth` | Auth credentials | Mockups, tokens |
| `pnpm reset:tokens` | Agent API tokens | Users, mockups |
| `pnpm reset:all` | Everything (requires `--force` or interactive prompt) | — |

## Data recovery

Markup stores all state in two places:

- `$DATA_DIR/markup.db` — SQLite database (users, mockups metadata, tokens)
- `$DATA_DIR/` — mockup blobs (HTML, screenshots, tldraw annotations)

Restore from backup:

```bash
docker stop markup
cp backup/markup.db $DATA_DIR/markup.db
cp -r backup/mockups/ $DATA_DIR/
docker start markup
```

## Image smoke test

The CI pipeline runs a smoke test on every published image before the GitHub release is created:

1. Pull the built image digest
2. Start the container with a random `AUTH_SECRET`
3. Poll `http://localhost:3000/api/health` every 2 s for up to 60 s
4. Fail the workflow if the endpoint never returns 200

If a release passed CI smoke, the image is confirmed bootable. If you suspect a runtime regression, pull the previous tag and compare.

## Reporting a broken image

1. Open an issue on [GitHub](https://github.com/AlexandreCamillo/markup/issues) with the tag version, host OS/arch, and container logs (`docker logs markup`).
2. If you need an immediate fix, pin to the last known-good tag while waiting for a patch release.
