const bcrypt = require('bcryptjs');
const db = require('./database');

async function createAdmin() {
  try {
    // Check if admin already exists
    db.get('SELECT * FROM admins WHERE username = ?', ['admin'], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return;
      }
      
      if (row) {
        console.log('Admin user already exists');
        return;
      }

      // Create default admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      db.run(
        'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
        ['admin', 'admin@kamukunji.com', hashedPassword],
        function(err) {
          if (err) {
            console.error('Failed to create admin:', err);
          } else {
            console.log('Admin user created successfully!');
            console.log('Username: admin');
            console.log('Password: admin123');
            console.log('Please change the password after first login');
          }
        }
      );
    });
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();







