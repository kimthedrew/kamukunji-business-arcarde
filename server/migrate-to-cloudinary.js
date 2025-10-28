const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration to add public_id column...');

db.serialize(() => {
  // Add public_id column to products table
  db.run(`
    ALTER TABLE products ADD COLUMN public_id TEXT
  `, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('public_id column already exists, skipping...');
      } else {
        console.error('Error adding public_id column:', err);
        return;
      }
    } else {
      console.log('Successfully added public_id column to products table');
    }
  });

  // Create index on public_id for better performance
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_products_public_id ON products(public_id)
  `, (err) => {
    if (err) {
      console.error('Error creating index:', err);
    } else {
      console.log('Successfully created index on public_id');
    }
  });

  console.log('Migration completed!');
});

db.close();


