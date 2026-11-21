CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_status TEXT NOT NULL DEFAULT 'pending',
  customer JSONB NOT NULL,
  address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  payment_method TEXT,
  payment_provider TEXT,
  payment_reference TEXT,
  shipping_provider TEXT,
  shipping_service TEXT,
  tracking_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, payment_status);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
