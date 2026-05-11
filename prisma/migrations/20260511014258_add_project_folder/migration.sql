-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Folder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mockup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "currentVersionId" TEXT,
    "projectId" TEXT,
    "folderId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mockup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mockup_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Mockup" ("createdAt", "currentVersionId", "id", "name", "slug", "status", "updatedAt") SELECT "createdAt", "currentVersionId", "id", "name", "slug", "status", "updatedAt" FROM "Mockup";
DROP TABLE "Mockup";
ALTER TABLE "new_Mockup" RENAME TO "Mockup";
CREATE UNIQUE INDEX "Mockup_slug_key" ON "Mockup"("slug");
CREATE INDEX "Mockup_status_idx" ON "Mockup"("status");
CREATE INDEX "Mockup_projectId_idx" ON "Mockup"("projectId");
CREATE INDEX "Mockup_folderId_idx" ON "Mockup"("folderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Folder_projectId_idx" ON "Folder"("projectId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_projectId_parentId_name_key" ON "Folder"("projectId", "parentId", "name");

-- Backfill: create "Unsorted" project
INSERT OR IGNORE INTO "Project" ("id", "name", "slug", "position", "createdAt", "updatedAt")
VALUES ('unsorted-default', 'Unsorted', 'unsorted', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill: assign orphan mockups to "Unsorted"
UPDATE "Mockup"
SET "projectId" = (SELECT "id" FROM "Project" WHERE "slug" = 'unsorted')
WHERE "projectId" IS NULL;
