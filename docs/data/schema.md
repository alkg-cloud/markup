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
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?
}
```

- Plaintext shown once at creation and never persisted; only the SHA-256 hash is stored
- `name` is the human-friendly identifier (`claude-code-prod`, `designer-bot`, `ci-builder`, etc.)

### Project

```prisma
model Project {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  position  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  folders   Folder[]
  mockups   Mockup[]
}
```

- Organizes mockups into named projects
- `slug` is unique, used in URLs
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
  path                 String
  createdAt            DateTime     @default(now())
  createdBy            String
  createdByType        String
  annotationsCreatedOn Annotation[] @relation("CreatedOnVersion")
  @@index([mockupId])
}
```

- `path` is the relative path under `${DATA_DIR}` to the extracted build directory (e.g. `mockups/<mid>/versions/<vid>/build`)
- `createdByType` is `'user' | 'agent'` — string, not enum
- The reverse relation `annotationsCreatedOn` powers the time-travel scope of an annotation (which version was current when the user drew on it)

### Annotation

```prisma
model Annotation {
  id                 String         @id @default(cuid())
  mockupId           String
  mockup             Mockup         @relation(fields: [mockupId], references: [id], onDelete: Cascade)
  screenshotPath     String
  tldrawPath         String
  pinCoords          String?
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

- `screenshotPath` and `tldrawPath` are relative paths under `${DATA_DIR}` to sidecar files in the annotation's directory
- `pinCoords` is JSON-encoded `{ scrollX, scrollY, viewportWidth, viewportHeight, bboxX, bboxY, bboxW, bboxH }` — null when the annotation has no drawn shapes
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
  id         String   @id @default(cuid())
  threadId   String
  thread     Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  authorType String
  authorId   String
  body       String
  createdAt  DateTime @default(now())
  @@index([threadId])
}
```

- `authorType` is `'user' | 'agent'`; `authorId` is the cuid of either a `User` or an `AgentToken`
- The display layer resolves the cuid to a human-readable name via `resolveDisplayName` — never render the raw cuid

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
        └─< Annotation ─── Thread ─< Message
                ↑
        AgentToken ─ (no FK; authorId is a soft string reference matched by authorType)
```

Cascade rules:

- Deleting a `User` cascades to their `Session`s
- Deleting a `Project` cascades to its `Folder`s; sets `Mockup.projectId` to `NULL`
- Deleting a `Folder` cascades to its child `Folder`s; sets `Mockup.folderId` to `NULL`
- Deleting a `Mockup` cascades to its `MockupVersion`s and `Annotation`s
- Deleting an `Annotation` cascades to its `Thread` and `Message`s
- Deleting a `MockupVersion` sets `Annotation.createdOnVersionId` to `NULL` (`onDelete: SetNull`)

## Conventions

- **cuid PKs**: every model has `id String @id @default(cuid())`. Time-sortable, URL-safe, no need for UUIDs.
- **String "enums"**: status fields are `String` with a default, not Prisma enums. SQLite + Prisma enum migrations are noisier than necessary; the validation lives in the route layer (Zod schemas) and on the service inputs.
- **Indexes**: every FK gets an index. Status columns and uniqueness constraints (slug, email, name) are indexed automatically by the unique constraint.
- **Optional FKs**: nullable when the parent might disappear (e.g. `createdOnVersionId` survives a deleted version). Required FKs use `onDelete: Cascade` — the row makes no sense without its parent.
- **No counter caches**: counts are computed on read via `_count: { select: { messages: true } }` — Prisma compiles this into a subquery, which is cheap at the project's scale.
