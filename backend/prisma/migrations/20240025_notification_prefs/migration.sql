CREATE TABLE IF NOT EXISTS "UserNotificationPreference" (
  "userId"               TEXT NOT NULL,
  "emailOnTicketCreated" BOOLEAN NOT NULL DEFAULT true,
  "emailOnStatusChange"  BOOLEAN NOT NULL DEFAULT true,
  "emailOnComment"       BOOLEAN NOT NULL DEFAULT true,
  "emailOnSlaWarning"    BOOLEAN NOT NULL DEFAULT true,
  "weeklyReport"         BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "UserNotificationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
