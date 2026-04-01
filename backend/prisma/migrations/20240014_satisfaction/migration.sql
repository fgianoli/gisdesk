CREATE TABLE "TicketSatisfaction" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketSatisfaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TicketSatisfaction_ticketId_key" ON "TicketSatisfaction"("ticketId");
ALTER TABLE "TicketSatisfaction" ADD CONSTRAINT "TicketSatisfaction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
