# Schema

The Prisma schema lives at `prisma/schema.prisma`. Single SQLite file backs all models. cuid (collision-resistant unique id) is the primary key strategy across the schema.

## Models

### User

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String
  role         String    @default("admin")
  createdAt    DateTime  @default(now())
  sessions     Session[]
}
```

- Single-tenant first-run model: the first `POST /api/auth/setup` creates the admin user
- `role` is always `'admin'` today; the column exists so future deployments can introduce non-admin users without a migration

### Session

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  @@index([userId])
}
```

- 30-day TTL; the cookie carries the JWT and `identify()` checks the row exists

### AgentToken

```prisma
model AgentToken {
  id          String    @id @default(cuid())
  name        String    @unique
  tokenHash   String    @unique
  prefix      String?
  lastFour    String?
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?
}
```

- Plaintext shown once at creation and never persisted; only the SHA-256 hash is stored
- `name` is the human-friendly identifier (`claude-code-prod`, `designer-bot`, `ci-builder`, etc.)
- `prefix` (e.g. `mka_`) and `lastFour` are the display hints rendered in the agent-tokens settings list (`mka_…ab12`) — derived at creation time so the UI never has to read the plaintext token back. Nullable for rows seeded before the columns existed.

### Invite

Stores admin-minted signup links. Each row has a SHA-256 `tokenHash` (the plaintext is never persisted, mirrors AgentToken), an optional bound `email`, an explicit `role` (`'admin'` or `'member'`) assigned to the user the invite mints, and an optional `expiresAt`.

The persisted `status` enum is `'unused' | 'used' | 'revoked' | 'disabled'`. A fifth lifecycle state, `'expired'`, is **derived** at read time as `status='unused' AND expiresAt <= now()` — not stored.

The `failedAttempts` counter increments on every failed redeem call (validation, bound-email mismatch). At >20 the row auto-flips to `'disabled'` with `revokedAt = now`.

`createdBy` has `onDelete: Cascade` — when the creating admin is deleted, their minted invites go with them (single-tenant model; no audit-trail value in retaining orphan-creator invite rows). `usedBy` has `onDelete: SetNull` so admin-driven user deletion preserves invite history.

### Project

```prisma
model Project {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  icon      String?
  position  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  folders   Folder[]
  mockups   Mockup[]
}
```

- Organizes mockups into named projects
- `slug` is unique, used in URLs
- `icon` is an optional token string (e.g. `vsc:VscFile`, `emoji:🎨`) chosen in the New Project dialog; null when no icon is set
- `position` controls display order in the sidebar
- A seed project `"Unsorted"` (slug `unsorted`) is created by migration and receives all pre-existing mockups

### Folder

```prisma
model Folder {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentId  String?
  parent    Folder?  @relation("FolderTree", fields: [parentId], references: [id], onDelete: Cascade)
  children  Folder[] @relation("FolderTree")
  name      String
  position  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  mockups   Mockup[]
  @@unique([projectId, parentId, name])
  @@index([projectId])
  @@index([parentId])
}
```

- Nested folders within a project via self-referencing `parentId`
- `@@unique([projectId, parentId, name])` prevents sibling folders with the same name (note: SQLite treats NULL parentId as distinct, so root-level duplicates are not caught by the DB constraint alone — enforce in the service layer)
- Cascade: deleting a Project deletes all its Folders; deleting a Folder deletes its children

### Mockup

```prisma
model Mockup {
  id               String          @id @default(cuid())
  name             String
  slug             String          @unique
  status           String          @default("open")
  currentVersionId String?
  projectId        String?
  project          Project?        @relation(fields: [projectId], references: [id], onDelete: SetNull)
  folderId         String?
  folder           Folder?         @relation(fields: [folderId], references: [id], onDelete: SetNull)
  position         Int             @default(0)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  versions         MockupVersion[]
  annotations      Annotation[]
  @@index([status])
  @@index([projectId])
  @@index([folderId])
}
```

- `status` is `'open' | 'resolved' | 'archived'` (string, not enum, to keep migrations cheap)
- `currentVersionId` is a soft pointer (no FK) — the row referenced is the version currently served at `/m/<id>/index.html`
- `slug` is unique-per-mockup, derived from `name` at creation
- `projectId` and `folderId` are nullable FKs with `onDelete: SetNull` — deleting a Project or Folder orphans the mockup rather than cascading deletion
- `position` controls display order within its folder/project

### MockupVersion

```prisma
model MockupVersion {
  id                   String       @id @default(cuid())
  mockupId             String
  mockup               Mockup       @relation(fields: [mockupId], references: [id], onDelete: Cascade)
  number               Int          @default(1)
  path                 String
  createdAt            DateTime     @default(now())
  createdBy            String
  createdByType        String
  annotationsCreatedOn Annotation[] @relation("CreatedOnVersion")
  @@unique([mockupId, number])
  @@index([mockupId])
}
```

- `number` is the stable, monotonically-increasing label within a mockup (`v1`, `v2`, …). The service assigns `max(number) + 1` at create time and the label is NEVER reused on delete — `v3` stays `v3` even after `v1` / `v2` are removed. Enforced by `@@unique([mockupId, number])`.
- `path` is the relative path under `${DATA_DIR}` to the extracted build directory (e.g. `mockups/<mid>/versions/<vid>/build`)
- `createdByType` is `'user' | 'agent'` — string, not enum
- The reverse relation `annotationsCreatedOn` powers the time-travel scope of an annotation (which version was current when the user drew on it)
- Cascade: deleting a `Mockup` cascades to all its `MockupVersion` rows

### Annotation

```prisma
model Annotation {
  id                 String         @id @default(cuid())
  mockupId           String
  mockup             Mockup         @relation(fields: [mockupId], references: [id], onDelete: Cascade)
  screenshotPath     String
  tldrawPath         String
  pinCoords          String?
  anchors            String         @default("[]")
  colorIndex         Int            @default(0)
  status             String         @default("open")
  intentType         String         @default("other")
  createdOnVersionId String?
  createdOnVersion   MockupVersion? @relation("CreatedOnVersion", fields: [createdOnVersionId], references: [id])
  createdAt          DateTime       @default(now())
  createdBy          String
  createdByType      String
  thread             Thread?
  @@index([mockupId])
  @@index([createdOnVersionId])
}
```

- `screenshotPath` and `tldrawPath` are relative paths under `${DATA_DIR}` to sidecar files in the annotation's directory. Comment-only annotations (AppMain redesign) reference empty placeholders so the JSON columns stay non-null.
- `pinCoords` is the legacy JSON-encoded bbox `{ scrollX, scrollY, viewportWidth, viewportHeight, bboxX, bboxY, bboxW, bboxH }` — null when the annotation has no drawn shapes. Preserved for backfill; comment annotations leave it null and pin positioning derives from `anchors` instead.
- `anchors` is JSON-encoded `Anchor[]` — each entry is either a text-anchor (`{ path, textOffset, subX, subY }`) or an element-anchor (`{ path, offsetX, offsetY }`). Up to 20 entries per annotation. Defaults to `"[]"` for legacy rows. Defined by the pin-anchoring strategy spec.
- `colorIndex` is `0..15` into the rotating per-annotation palette. Shared across every pin of the annotation plus the rail badge and the avatar tint.
- `status` is the visual status pill surfaced in the rail header: `'open' | 'needs review' | 'resolved'` — string, not enum.
- `intentType` is `'visual' | 'copy' | 'behavior' | 'other'` — set by the G1 chip selector or defaulted; see [`docs/agent-loop/chips.md`](../agent-loop/chips.md)
- `createdOnVersionId` is the mockup's `currentVersionId` at annotation-creation time — used by `/agent/context` to compute `diff_since_creation`. Nullable to handle race conditions where the version row is gone.

### Thread

```prisma
model Thread {
  id           String     @id @default(cuid())
  annotationId String     @unique
  annotation   Annotation @relation(fields: [annotationId], references: [id], onDelete: Cascade)
  status       String     @default("open")
  messages     Message[]
}
```

- One thread per annotation — the `@unique` on `annotationId` enforces it
- `status` is `'open' | 'resolved'` — toggled via `/api/threads/[id]/{resolve,reopen}`

### Message

```prisma
model Message {
  id         String     @id @default(cuid())
  threadId   String
  thread     Thread     @relation(fields: [threadId], references: [id], onDelete: Cascade)
  authorType String
  authorId   String
  body       String
  createdAt  DateTime   @default(now())
  reactions  Reaction[]
  @@index([threadId])
}
```

- `authorType` is `'user' | 'agent'`; `authorId` is the cuid of either a `User` or an `AgentToken`
- The display layer resolves the cuid to a human-readable name via `resolveDisplayName` — never render the raw cuid
- The reverse relation `reactions` powers the Slack-style emoji reaction pills under each comment

### Reaction

```prisma
model Reaction {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String
  emoji     String
  createdAt DateTime @default(now())
  @@unique([messageId, userId, emoji])
  @@index([messageId])
}
```

- Slack-style emoji reactions on individual comment messages
- The `(messageId, userId, emoji)` triple is uniquely indexed — toggling a reaction is a delete-or-create operation, so concurrent toggles are race-safe (see `POST /api/messages/[id]/reactions`)
- `userId` is the cuid of the calling identity (`User.id` for human authors; agent reactions are not minted today but the column allows it)
- Cascade: deleting a `Message` cascades to its `Reaction` rows

### Config

```prisma
model Config {
  key   String @id
  value String
}
```

- Key/value blob for one-off settings (e.g. `setup_completed=true`)
- The key itself is the primary key — there is no separate cuid id, since the table is small and the natural key is unique
- Not used for user-visible configuration

## Relationships at a glance

```
User ─┬─< Session
      │
Project ─┬─< Folder (self-referencing parentId)
         │
         └─<? Mockup (SetNull)
                │
Folder ──<? Mockup (SetNull)
                │
Mockup ─┬─< MockupVersion (optional FK from Annotation.createdOnVersionId)
        │
        └─< Annotation ─── Thread ─< Message ─< Reaction
                ↑
        AgentToken ─ (no FK; authorId is a soft string reference matched by authorType)
```

Cascade rules:

- Deleting a `User` cascades to their `Session`s
- Deleting a `Project` cascades to its `Folder`s; sets `Mockup.projectId` to `NULL`
- Deleting a `Folder` cascades to its child `Folder`s; sets `Mockup.folderId` to `NULL`
- Deleting a `Mockup` cascades to its `MockupVersion`s and `Annotation`s
- Deleting an `Annotation` cascades to its `Thread` and `Message`s
- Deleting a `Message` cascades to its `Reaction`s
- Deleting a `MockupVersion` sets `Annotation.createdOnVersionId` to `NULL` (`onDelete: SetNull` — the Prisma default for an optional FK without an explicit clause)

## Conventions

- **cuid PKs**: every model has `id String @id @default(cuid())`. Time-sortable, URL-safe, no need for UUIDs.
- **String "enums"**: status fields are `String` with a default, not Prisma enums. SQLite + Prisma enum migrations are noisier than necessary; the validation lives in the route layer (Zod schemas) and on the service inputs.
- **Indexes**: every FK gets an index. Status columns and uniqueness constraints (slug, email, name) are indexed automatically by the unique constraint.
- **Optional FKs**: nullable when the parent might disappear (e.g. `createdOnVersionId` survives a deleted version). Required FKs use `onDelete: Cascade` — the row makes no sense without its parent.
- **No counter caches**: counts are computed on read via `_count: { select: { messages: true } }` — Prisma compiles this into a subquery, which is cheap at the project's scale.
