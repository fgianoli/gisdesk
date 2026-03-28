-- TimeEntry
CREATE TABLE "TimeEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
  CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- Notification
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "linkUrl" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- TicketDependency
CREATE TABLE "TicketDependency" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "dependsOnId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketDependency_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
  CONSTRAINT "TicketDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
  CONSTRAINT "TicketDependency_ticketId_dependsOnId_key" UNIQUE ("ticketId", "dependsOnId")
);

-- TicketTemplate
CREATE TABLE "TicketTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "titleTemplate" TEXT NOT NULL,
  "descriptionTemplate" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "type" TEXT NOT NULL DEFAULT 'STANDARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

-- Todo recurrence
ALTER TABLE "Todo" ADD COLUMN "recurrence" TEXT NOT NULL DEFAULT 'NONE';
