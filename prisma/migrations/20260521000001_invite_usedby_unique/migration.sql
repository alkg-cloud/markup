-- Pre-flight check: SELECT usedById, COUNT(*) FROM Invite WHERE usedById IS NOT NULL
-- GROUP BY usedById HAVING COUNT(*) > 1;
-- If that query returns any rows, the migration will fail — contact the operator before
-- applying.
--
-- A given User can only have been minted by one invite. Partial index so it doesn't
-- conflict with the dominant case (status='unused' rows where usedById IS NULL).
CREATE UNIQUE INDEX "Invite_usedById_unique"
  ON "Invite"("usedById")
  WHERE "usedById" IS NOT NULL;
