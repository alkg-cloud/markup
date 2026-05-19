-- Add stable, monotonically-increasing version number per mockup.
-- v3 stays v3 even after v1 / v2 are deleted: never reuse the value.
--
-- SQLite "ALTER TABLE ADD COLUMN" with a non-constant default is not
-- supported, so we add a plain NOT NULL column with default 0, backfill
-- existing rows in `createdAt` order, then enforce the uniqueness pair
-- via a unique index.

ALTER TABLE "MockupVersion" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 1;

-- Backfill: for each mockup, assign numbers 1..N by ascending createdAt.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY mockupId ORDER BY createdAt ASC, id ASC) AS n
  FROM "MockupVersion"
)
UPDATE "MockupVersion"
SET "number" = (SELECT n FROM ordered WHERE ordered.id = "MockupVersion".id);

CREATE UNIQUE INDEX "MockupVersion_mockupId_number_key" ON "MockupVersion" ("mockupId", "number");
