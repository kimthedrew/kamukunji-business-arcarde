-- Supabase Database Schema for Kamukunji Business Arcade

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-secret-key';

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop_number TEXT UNIQUE NOT NULL,
  shop_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  till_number TEXT,
  payment_provider TEXT,
  payment_notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  public_id TEXT,
  category TEXT DEFAULT 'shoes',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product sizes table
CREATE TABLE IF NOT EXISTS product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  quantity INTEGER DEFAULT 0
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  paid_at TIMESTAMP WITH TIME ZONE,
  confirmed_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop subscriptions table
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  monthly_fee DECIMAL(10,2) DEFAULT 0
);

-- Shop subscriptions data table (for push notifications)
CREATE TABLE IF NOT EXISTS shop_subscription_data (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_public_id ON products(public_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_shop_id ON shop_subscriptions(shop_id);

-- Enable Row Level Security (RLS)
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscription_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shops table
CREATE POLICY "Shops are viewable by everyone" ON shops FOR SELECT USING (true);
CREATE POLICY "Shops can update their own data" ON shops FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for products table
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Shops can manage their own products" ON products FOR ALL USING (auth.uid()::text = shop_id::text);

-- RLS Policies for orders table
CREATE POLICY "Shops can view their own orders" ON orders FOR SELECT USING (auth.uid()::text = shop_id::text);
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);

-- RLS Policies for shop_subscriptions table
CREATE POLICY "Shop subscriptions are viewable by everyone" ON shop_subscriptions FOR SELECT USING (true);
CREATE POLICY "Admins can manage subscriptions" ON shop_subscriptions FOR ALL USING (true);

-- RLS Policies for shop_subscription_data table
CREATE POLICY "Shops can manage their own subscription data" ON shop_subscription_data FOR ALL USING (auth.uid()::text = shop_id::text);


