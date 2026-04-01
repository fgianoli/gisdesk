CREATE TABLE "AssignmentRule" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "priority" TEXT,
  "type" TEXT,
  "assigneeId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentRule_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON UPDATE CASCADE;
