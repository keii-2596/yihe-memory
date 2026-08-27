CREATE TABLE IF NOT EXISTS reminder_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  reminder_time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_sent_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_id, channel)
);
CREATE INDEX IF NOT EXISTS idx_reminders_owner ON reminder_subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminder_subscriptions(enabled, reminder_time);
