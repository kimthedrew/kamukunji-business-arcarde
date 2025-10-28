const supabase = require('./config/supabase');
const bcrypt = require('bcryptjs');

async function seedTestData() {
  console.log('Seeding test data to Supabase...');
  
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .insert({
        username: 'admin',
        email: 'admin@kamukunji.com',
        password: hashedPassword
      })
      .select()
      .single();
    
    if (adminError && !adminError.message.includes('duplicate key')) {
      console.error('Error creating admin:', adminError);
    } else {
      console.log('✓ Admin user created/verified');
    }
    
    // Create test shops
    const shops = [
      {
        shop_number: 'SH001',
        shop_name: 'Test Shop 1',
        contact: '0712345678',
        email: 'shop1@test.com',
        password: await bcrypt.hash('password123', 10),
        status: 'active'
      },
      {
        shop_number: 'SH002',
        shop_name: 'Test Shop 2',
        contact: '0723456789',
        email: 'shop2@test.com',
        password: await bcrypt.hash('password123', 10),
        status: 'pending'
      }
    ];
    
    for (const shop of shops) {
      const { data: existingShop } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_number', shop.shop_number)
        .single();
      
      if (!existingShop) {
        const { error: shopError } = await supabase
          .from('shops')
          .insert(shop);
        
        if (shopError) {
          console.error(`Error creating shop ${shop.shop_number}:`, shopError);
        } else {
          console.log(`✓ Shop ${shop.shop_number} created`);
        }
      } else {
        console.log(`✓ Shop ${shop.shop_number} already exists`);
      }
    }
    
    // Get the first shop to create products
    const { data: firstShop } = await supabase
      .from('shops')
      .select('id')
      .eq('shop_number', 'SH001')
      .single();
    
    if (firstShop) {
      // Create test products
      const products = [
        {
          shop_id: firstShop.id,
          name: 'Nike Air Max',
          description: 'Comfortable running shoes',
          price: 15000,
          category: 'shoes',
          image_url: 'https://via.placeholder.com/300x300',
          public_id: 'test-product-1'
        },
        {
          shop_id: firstShop.id,
          name: 'Adidas Stan Smith',
          description: 'Classic white sneakers',
          price: 12000,
          category: 'shoes',
          image_url: 'https://via.placeholder.com/300x300',
          public_id: 'test-product-2'
        }
      ];
      
      for (const product of products) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('name', product.name)
          .eq('shop_id', product.shop_id)
          .single();
        
        if (!existingProduct) {
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert(product)
            .select()
            .single();
          
          if (productError) {
            console.error(`Error creating product ${product.name}:`, productError);
          } else {
            console.log(`✓ Product ${product.name} created`);
            
            // Add sizes for the product
            const sizes = [
              { product_id: newProduct.id, size: '7', in_stock: true, quantity: 5 },
              { product_id: newProduct.id, size: '8', in_stock: true, quantity: 3 },
              { product_id: newProduct.id, size: '9', in_stock: false, quantity: 0 }
            ];
            
            const { error: sizesError } = await supabase
              .from('product_sizes')
              .insert(sizes);
            
            if (sizesError) {
              console.error(`Error creating sizes for ${product.name}:`, sizesError);
            } else {
              console.log(`✓ Sizes created for ${product.name}`);
            }
          }
        } else {
          console.log(`✓ Product ${product.name} already exists`);
        }
      }
    }
    
    console.log('✓ Test data seeding completed!');
    
  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

seedTestData();


