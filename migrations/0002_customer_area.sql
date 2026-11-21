ALTER TABLE orders ADD COLUMN customer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_email ON customer_sessions(email, expires_at);
