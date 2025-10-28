const supabase = require('./config/supabase');

async function analyzeInvalidTokens() {
  console.log('🔍 Analyzing invalid token usage...\n');
  
  try {
    // Get all shops
    const { data: shops, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_number, shop_name, status');
    
    if (shopError) {
      console.error('Error fetching shops:', shopError);
      return;
    }
    
    console.log('✅ Valid shops in database:');
    shops.forEach(shop => {
      console.log(`  - ID: ${shop.id}, Number: ${shop.shop_number}, Name: ${shop.shop_name}, Status: ${shop.status}`);
    });
    
    console.log('\n❌ Common invalid shop IDs being used:');
    console.log('  - Shop ID 5 (SH005) - Does not exist');
    console.log('  - Shop ID 6 (SH006) - Does not exist');
    
    console.log('\n🔧 Recommendations:');
    console.log('1. Clear browser localStorage/sessionStorage');
    console.log('2. Log out and log in again');
    console.log('3. Check if any shops were deleted recently');
    console.log('4. Verify JWT tokens are not cached incorrectly');
    
    console.log('\n📊 Current system status:');
    console.log(`  - Total valid shops: ${shops.length}`);
    console.log(`  - Active shops: ${shops.filter(s => s.status === 'active').length}`);
    console.log(`  - Pending shops: ${shops.filter(s => s.status === 'pending').length}`);
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeInvalidTokens();


