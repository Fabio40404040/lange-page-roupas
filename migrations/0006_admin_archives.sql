ALTER TABLE orders ADD COLUMN archived_at TEXT;
ALTER TABLE customers ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_archive ON orders(archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_archive ON customers(archived_at, created_at DESC);
