const supabase = require('./config/supabase');

async function migrateToSupabase() {
  console.log('Starting migration to Supabase...');
  
  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('shops')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('Tables not found, creating them...');
      
      // Create tables using SQL
      const createTablesSQL = `
        -- Create shops table
        CREATE TABLE IF NOT EXISTS shops (
          id SERIAL PRIMARY KEY,
          shop_number TEXT UNIQUE NOT NULL,
          shop_name TEXT NOT NULL,
          contact TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create admins table
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create products table
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

        -- Create product_sizes table
        CREATE TABLE IF NOT EXISTS product_sizes (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          size TEXT NOT NULL,
          in_stock BOOLEAN DEFAULT true,
          quantity INTEGER DEFAULT 0
        );

        -- Create orders table
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          customer_name TEXT NOT NULL,
          customer_contact TEXT NOT NULL,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          size TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create shop_subscriptions table
        CREATE TABLE IF NOT EXISTS shop_subscriptions (
          id SERIAL PRIMARY KEY,
          shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          plan TEXT NOT NULL DEFAULT 'free',
          status TEXT NOT NULL DEFAULT 'active',
          start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_date TIMESTAMP WITH TIME ZONE,
          monthly_fee DECIMAL(10,2) DEFAULT 0
        );

        -- Create shop_subscription_data table
        CREATE TABLE IF NOT EXISTS shop_subscription_data (
          id SERIAL PRIMARY KEY,
          shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          subscription_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // Note: In a real setup, you would run this SQL in the Supabase dashboard
      // or use a migration tool. For now, we'll just log it.
      console.log('Please run the following SQL in your Supabase dashboard:');
      console.log(createTablesSQL);
      
    } else {
      console.log('✓ Tables already exist');
    }
    
    // Create a test admin user
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('username', 'admin')
      .single();
    
    if (!existingAdmin) {
      console.log('Creating admin user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          username: 'admin',
          email: 'admin@kamukunji.com',
          password: hashedPassword
        });
      
      if (adminError) {
        console.error('Error creating admin:', adminError);
      } else {
        console.log('✓ Admin user created');
      }
    } else {
      console.log('✓ Admin user already exists');
    }
    
    console.log('Migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateToSupabase();


