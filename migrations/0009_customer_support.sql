CREATE TABLE IF NOT EXISTS support_threads (
  id TEXT PRIMARY KEY,
  customer_email TEXT NOT NULL UNIQUE REFERENCES customers(email),
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  customer_read_id INTEGER NOT NULL DEFAULT 0,
  admin_read_id INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL REFERENCES support_threads(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id, id);
CREATE INDEX IF NOT EXISTS idx_support_threads_updated ON support_threads(updated_at);
