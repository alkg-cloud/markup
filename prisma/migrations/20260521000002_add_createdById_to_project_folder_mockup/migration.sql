-- Add createdById to Project
ALTER TABLE "Project" ADD COLUMN "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- Add createdById to Folder
ALTER TABLE "Folder" ADD COLUMN "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Folder_createdById_idx" ON "Folder"("createdById");

-- Add createdById to Mockup
ALTER TABLE "Mockup" ADD COLUMN "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Mockup_createdById_idx" ON "Mockup"("createdById");
