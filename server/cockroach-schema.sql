-- KBA CockroachDB Schema
-- Run this in your CockroachDB SQL shell or web console

CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop_number VARCHAR(50) UNIQUE NOT NULL,
  shop_name VARCHAR(255) NOT NULL,
  contact VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  till_number VARCHAR(50),
  payment_provider VARCHAR(100),
  payment_notes TEXT,
  pos_enabled BOOLEAN DEFAULT false,
  banner_url TEXT,
  business_hours VARCHAR(255),
  is_featured BOOLEAN DEFAULT false,
  credit_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  public_id VARCHAR(255),
  category VARCHAR(50) DEFAULT 'shoes',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  quantity INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_contact VARCHAR(50) NOT NULL,
  product_id INTEGER REFERENCES products(id),
  size VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  payment_reference VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  confirmed_by INTEGER,
  source VARCHAR(20) DEFAULT 'online',
  sale_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  plan VARCHAR(20) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active',
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS credit_sales (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  items TEXT,
  total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'outstanding',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_payments (
  id SERIAL PRIMARY KEY,
  credit_sale_id INTEGER REFERENCES credit_sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'cash',
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_staff (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'attendant',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, email)
);

CREATE TABLE IF NOT EXISTS shop_subscription_data (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  UNIQUE(shop_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_source_status ON orders(source, payment_status);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_shop_id ON shop_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_shop_id ON credit_sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_sale_id ON credit_payments(credit_sale_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON shop_staff(shop_id);
