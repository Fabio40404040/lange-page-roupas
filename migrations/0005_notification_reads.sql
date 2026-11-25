CREATE TABLE IF NOT EXISTS notification_reads (
  audience TEXT NOT NULL,
  recipient TEXT NOT NULL,
  event_id TEXT NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (audience, recipient, event_id)
);
