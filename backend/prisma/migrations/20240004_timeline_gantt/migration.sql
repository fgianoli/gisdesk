-- Add Gantt fields to TimelineItem and link to Todo

ALTER TABLE "TimelineItem"
  ADD COLUMN "todoId"   TEXT,
  ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "color"    TEXT;

ALTER TABLE "TimelineItem"
  ADD CONSTRAINT "TimelineItem_todoId_fkey"
  FOREIGN KEY ("todoId") REFERENCES "Todo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
