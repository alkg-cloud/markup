-- 1) Add new polymorphic columns
ALTER TABLE "Project" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Project" ADD COLUMN "createdByType" TEXT;
ALTER TABLE "Folder"  ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Folder"  ADD COLUMN "createdByType" TEXT;
ALTER TABLE "Mockup"  ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Mockup"  ADD COLUMN "createdByType" TEXT;

-- 2) Backfill from createdById (which only ever held user cuids)
UPDATE "Project" SET "createdBy" = "createdById",
  "createdByType" = CASE WHEN "createdById" IS NULL THEN NULL ELSE 'user' END;
UPDATE "Folder"  SET "createdBy" = "createdById",
  "createdByType" = CASE WHEN "createdById" IS NULL THEN NULL ELSE 'user' END;
UPDATE "Mockup"  SET "createdBy" = "createdById",
  "createdByType" = CASE WHEN "createdById" IS NULL THEN NULL ELSE 'user' END;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 3) Drop the old FK column on each table.
--    SQLite requires a copy-rename dance.

-- Project ------------------------------------------------------------------
CREATE TABLE "new_Project" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "slug"          TEXT NOT NULL,
  "icon"          TEXT,
  "position"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     DATETIME NOT NULL,
  "createdBy"     TEXT,
  "createdByType" TEXT
);
INSERT INTO "new_Project" ("id","name","slug","icon","position","createdAt","updatedAt","createdBy","createdByType")
  SELECT "id","name","slug","icon","position","createdAt","updatedAt","createdBy","createdByType" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key"    ON "Project"("slug");
CREATE INDEX        "Project_createdBy_idx" ON "Project"("createdBy");

-- Folder -------------------------------------------------------------------
CREATE TABLE "new_Folder" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "projectId"     TEXT NOT NULL,
  "parentId"      TEXT,
  "name"          TEXT NOT NULL,
  "position"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     DATETIME NOT NULL,
  "createdBy"     TEXT,
  "createdByType" TEXT,
  CONSTRAINT "Folder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Folder_parentId_fkey"  FOREIGN KEY ("parentId")  REFERENCES "Folder"  ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Folder" ("id","projectId","parentId","name","position","createdAt","updatedAt","createdBy","createdByType")
  SELECT "id","projectId","parentId","name","position","createdAt","updatedAt","createdBy","createdByType" FROM "Folder";
DROP TABLE "Folder";
ALTER TABLE "new_Folder" RENAME TO "Folder";
CREATE UNIQUE INDEX "Folder_projectId_parentId_name_key" ON "Folder"("projectId","parentId","name");
CREATE INDEX        "Folder_projectId_idx" ON "Folder"("projectId");
CREATE INDEX        "Folder_parentId_idx"  ON "Folder"("parentId");
CREATE INDEX        "Folder_createdBy_idx" ON "Folder"("createdBy");

-- Mockup -------------------------------------------------------------------
CREATE TABLE "new_Mockup" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "name"             TEXT NOT NULL,
  "slug"             TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'open',
  "currentVersionId" TEXT,
  "projectId"        TEXT,
  "folderId"         TEXT,
  "position"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        DATETIME NOT NULL,
  "createdBy"        TEXT,
  "createdByType"    TEXT,
  CONSTRAINT "Mockup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Mockup_folderId_fkey"  FOREIGN KEY ("folderId")  REFERENCES "Folder"  ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Mockup" ("id","name","slug","status","currentVersionId","projectId","folderId","position","createdAt","updatedAt","createdBy","createdByType")
  SELECT "id","name","slug","status","currentVersionId","projectId","folderId","position","createdAt","updatedAt","createdBy","createdByType" FROM "Mockup";
DROP TABLE "Mockup";
ALTER TABLE "new_Mockup" RENAME TO "Mockup";
CREATE UNIQUE INDEX "Mockup_slug_key"      ON "Mockup"("slug");
CREATE INDEX        "Mockup_status_idx"    ON "Mockup"("status");
CREATE INDEX        "Mockup_projectId_idx" ON "Mockup"("projectId");
CREATE INDEX        "Mockup_folderId_idx"  ON "Mockup"("folderId");
CREATE INDEX        "Mockup_createdBy_idx" ON "Mockup"("createdBy");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
