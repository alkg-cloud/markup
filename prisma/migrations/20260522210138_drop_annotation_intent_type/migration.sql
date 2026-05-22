/*
  Warnings:

  - You are about to drop the column `intentType` on the `Annotation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mockupId" TEXT NOT NULL,
    "screenshotPath" TEXT NOT NULL,
    "tldrawPath" TEXT NOT NULL,
    "pinCoords" TEXT,
    "anchors" TEXT NOT NULL DEFAULT '[]',
    "colorIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdOnVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    CONSTRAINT "Annotation_mockupId_fkey" FOREIGN KEY ("mockupId") REFERENCES "Mockup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Annotation_createdOnVersionId_fkey" FOREIGN KEY ("createdOnVersionId") REFERENCES "MockupVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Annotation" ("anchors", "colorIndex", "createdAt", "createdBy", "createdByType", "createdOnVersionId", "id", "mockupId", "pinCoords", "screenshotPath", "status", "tldrawPath") SELECT "anchors", "colorIndex", "createdAt", "createdBy", "createdByType", "createdOnVersionId", "id", "mockupId", "pinCoords", "screenshotPath", "status", "tldrawPath" FROM "Annotation";
DROP TABLE "Annotation";
ALTER TABLE "new_Annotation" RENAME TO "Annotation";
CREATE INDEX "Annotation_mockupId_idx" ON "Annotation"("mockupId");
CREATE INDEX "Annotation_createdOnVersionId_idx" ON "Annotation"("createdOnVersionId");
CREATE TABLE "new_Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "Folder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Folder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Folder" ("createdAt", "createdById", "id", "name", "parentId", "position", "projectId", "updatedAt") SELECT "createdAt", "createdById", "id", "name", "parentId", "position", "projectId", "updatedAt" FROM "Folder";
DROP TABLE "Folder";
ALTER TABLE "new_Folder" RENAME TO "Folder";
CREATE INDEX "Folder_projectId_idx" ON "Folder"("projectId");
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");
CREATE INDEX "Folder_createdById_idx" ON "Folder"("createdById");
CREATE UNIQUE INDEX "Folder_projectId_parentId_name_key" ON "Folder"("projectId", "parentId", "name");
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
    "createdById" TEXT,
    CONSTRAINT "Mockup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mockup_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mockup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Mockup" ("createdAt", "createdById", "currentVersionId", "folderId", "id", "name", "position", "projectId", "slug", "status", "updatedAt") SELECT "createdAt", "createdById", "currentVersionId", "folderId", "id", "name", "position", "projectId", "slug", "status", "updatedAt" FROM "Mockup";
DROP TABLE "Mockup";
ALTER TABLE "new_Mockup" RENAME TO "Mockup";
CREATE UNIQUE INDEX "Mockup_slug_key" ON "Mockup"("slug");
CREATE INDEX "Mockup_status_idx" ON "Mockup"("status");
CREATE INDEX "Mockup_projectId_idx" ON "Mockup"("projectId");
CREATE INDEX "Mockup_folderId_idx" ON "Mockup"("folderId");
CREATE INDEX "Mockup_createdById_idx" ON "Mockup"("createdById");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "createdById", "icon", "id", "name", "position", "slug", "updatedAt") SELECT "createdAt", "createdById", "icon", "id", "name", "position", "slug", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "Invite_usedById_unique";
CREATE UNIQUE INDEX "Invite_usedById_key" ON "Invite"("usedById");
