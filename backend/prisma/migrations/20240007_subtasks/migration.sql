-- Add parentId to TimelineItem for subtask support

ALTER TABLE "TimelineItem"
  ADD COLUMN "parentId" TEXT;

ALTER TABLE "TimelineItem"
  ADD CONSTRAINT "TimelineItem_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "TimelineItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
