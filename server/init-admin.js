const bcrypt = require('bcryptjs');
const db = require('./db');

async function createAdmin() {
  try {
    const { rows } = await db.query('SELECT id FROM admins WHERE username = $1', ['admin']);

    if (rows.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.query(
      'INSERT INTO admins (username, email, password) VALUES ($1, $2, $3)',
      ['admin', 'admin@kamukunji.com', hashedPassword]
    );

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Please change the password after first login.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
