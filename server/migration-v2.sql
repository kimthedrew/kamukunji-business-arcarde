-- ============================================================
-- KBA v2 Migration — run in Supabase SQL Editor
-- ============================================================

-- 1. M-Pesa STK Push toggle on shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS mpesa_stk_enabled BOOLEAN DEFAULT FALSE;

-- 2. M-Pesa transactions log
CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  checkout_request_id TEXT UNIQUE NOT NULL,
  phone               TEXT NOT NULL,
  amount              DECIMAL(10,2),
  status              TEXT DEFAULT 'pending',  -- pending | completed | failed
  mpesa_reference     TEXT,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mpesa_txn_shop ON mpesa_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_txn_status ON mpesa_transactions(status);

-- 3. Customers table (buyer accounts)
CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  phone      TEXT,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 4. Shop reviews
CREATE TABLE IF NOT EXISTS shop_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  reviewer_name TEXT DEFAULT 'Anonymous',
  reviewer_ip   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON shop_reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON shop_reviews(created_at);

-- 5. Allow orders to reference customer account (optional linkage)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 6. Featured listing billing log
CREATE TABLE IF NOT EXISTS featured_billing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount      DECIMAL(10,2) NOT NULL,
  weeks       INTEGER DEFAULT 1,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_featured_billing_shop ON featured_billing(shop_id);

-- 7. Add avg_rating denormalized on shops for fast sorting
ALTER TABLE shops ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,1) DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 8. Function + trigger to keep avg_rating in sync
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shops
  SET avg_rating   = (SELECT COALESCE(AVG(rating)::NUMERIC(3,1), 0) FROM shop_reviews WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id)),
      review_count = (SELECT COUNT(*) FROM shop_reviews WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id))
  WHERE id = COALESCE(NEW.shop_id, OLD.shop_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_shop_rating ON shop_reviews;
CREATE TRIGGER trg_update_shop_rating
AFTER INSERT OR UPDATE OR DELETE ON shop_reviews
FOR EACH ROW EXECUTE FUNCTION update_shop_rating();
