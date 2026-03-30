CREATE TABLE "ProjectMessage" (
  "id"        TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "pinned"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectMessage_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectMessage_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProjectMessage_projectId_idx" ON "ProjectMessage"("projectId");
CREATE INDEX "ProjectMessage_createdAt_idx" ON "ProjectMessage"("createdAt");
