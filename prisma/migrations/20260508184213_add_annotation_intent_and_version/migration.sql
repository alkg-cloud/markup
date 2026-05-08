-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mockupId" TEXT NOT NULL,
    "screenshotPath" TEXT NOT NULL,
    "tldrawPath" TEXT NOT NULL,
    "pinCoords" TEXT,
    "intentType" TEXT NOT NULL DEFAULT 'other',
    "createdOnVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    CONSTRAINT "Annotation_mockupId_fkey" FOREIGN KEY ("mockupId") REFERENCES "Mockup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Annotation_createdOnVersionId_fkey" FOREIGN KEY ("createdOnVersionId") REFERENCES "MockupVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Annotation" ("createdAt", "createdBy", "createdByType", "id", "mockupId", "pinCoords", "screenshotPath", "tldrawPath") SELECT "createdAt", "createdBy", "createdByType", "id", "mockupId", "pinCoords", "screenshotPath", "tldrawPath" FROM "Annotation";
DROP TABLE "Annotation";
ALTER TABLE "new_Annotation" RENAME TO "Annotation";
CREATE INDEX "Annotation_mockupId_idx" ON "Annotation"("mockupId");
CREATE INDEX "Annotation_createdOnVersionId_idx" ON "Annotation"("createdOnVersionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
