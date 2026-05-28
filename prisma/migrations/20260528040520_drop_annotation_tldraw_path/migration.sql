/*
  Warnings:

  - You are about to drop the column `tldrawPath` on the `Annotation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mockupId" TEXT NOT NULL,
    "screenshotPath" TEXT NOT NULL,
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
INSERT INTO "new_Annotation" ("anchors", "colorIndex", "createdAt", "createdBy", "createdByType", "createdOnVersionId", "id", "mockupId", "pinCoords", "screenshotPath", "status") SELECT "anchors", "colorIndex", "createdAt", "createdBy", "createdByType", "createdOnVersionId", "id", "mockupId", "pinCoords", "screenshotPath", "status" FROM "Annotation";
DROP TABLE "Annotation";
ALTER TABLE "new_Annotation" RENAME TO "Annotation";
CREATE INDEX "Annotation_mockupId_idx" ON "Annotation"("mockupId");
CREATE INDEX "Annotation_createdOnVersionId_idx" ON "Annotation"("createdOnVersionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
