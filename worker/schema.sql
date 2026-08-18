CREATE TABLE IF NOT EXISTS skilltrees (
  seed TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  web_url TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS skilltree_progress (
  seed TEXT PRIMARY KEY,
  progress_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY(seed) REFERENCES skilltrees(seed) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skilltrees_channel
  ON skilltrees(channel_id);
