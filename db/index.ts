import { env } from 'cloudflare:workers';

let initialized=false;
export function getDb():D1Database { if (!env.DB) throw new Error('Cloud database is unavailable.'); return env.DB; }
export function getFiles():R2Bucket { if (!env.FILES) throw new Error('Object storage is unavailable.'); return env.FILES; }

export async function ensureSchema() {
  if (initialized) return;
  const db=getDb();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS user_state (owner_id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, display_name TEXT NOT NULL, state_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, state_json TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ai_usage (owner_id TEXT NOT NULL, period TEXT NOT NULL, request_count INTEGER NOT NULL DEFAULT 0, estimated_tokens INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY(owner_id, period))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS interview_reports (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, report_json TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, subscription_json TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reminder_subscriptions (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, channel TEXT NOT NULL, destination TEXT NOT NULL, reminder_time TEXT NOT NULL, timezone TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, last_sent_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(owner_id, channel))`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_backups_owner_created ON backups(owner_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_reports_owner_created ON interview_reports(owner_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_push_owner ON push_subscriptions(owner_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_reminders_owner ON reminder_subscriptions(owner_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminder_subscriptions(enabled, reminder_time)`),
  ]);
  await db.prepare('PRAGMA optimize').run(); initialized=true;
}
