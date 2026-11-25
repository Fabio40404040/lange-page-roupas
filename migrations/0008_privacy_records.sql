ALTER TABLE customers ADD COLUMN privacy_version TEXT;
ALTER TABLE customers ADD COLUMN privacy_acknowledged_at TEXT;
ALTER TABLE product_reviews ADD COLUMN public_consent_at TEXT;
ALTER TABLE product_reviews ADD COLUMN privacy_version TEXT;
ALTER TABLE product_reviews ADD COLUMN withdrawn_at TEXT;
