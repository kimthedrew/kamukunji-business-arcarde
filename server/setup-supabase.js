const supabase = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function setupSupabase() {
  console.log('Setting up Supabase database...');
  
  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'supabase-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        });
        
        if (error) {
          console.warn(`Warning for statement ${i + 1}:`, error.message);
          // Continue with other statements even if one fails
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.warn(`Error executing statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('Supabase setup completed!');
    
    // Test the connection
    const { data, error } = await supabase.from('shops').select('count').limit(1);
    if (error) {
      console.error('Connection test failed:', error);
    } else {
      console.log('✓ Database connection test successful');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// Run the setup
setupSupabase();


