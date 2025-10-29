const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Check if Supabase is properly configured
function isSupabaseConfigured() {
  const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_API_KEY;
  
  return supabaseUrl && 
         supabaseKey && 
         supabaseUrl !== 'https://your-project-id.supabase.co' &&
         supabaseKey !== 'your_supabase_anon_key_here';
}

// SQLite Database class with Supabase-compatible interface
class SQLiteDB {
  constructor() {
    const dbPath = path.join(__dirname, 'database.sqlite');
    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
  }

  initializeTables() {
    this.db.serialize(() => {
      // Shops table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS shops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_number TEXT UNIQUE NOT NULL,
          shop_name TEXT NOT NULL,
          contact TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Admin table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          image_url TEXT,
          category TEXT DEFAULT 'shoes',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shop_id) REFERENCES shops (id)
        )
      `);

      // Product sizes table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS product_sizes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          size TEXT NOT NULL,
          in_stock BOOLEAN DEFAULT 1,
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);

      // Orders table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          customer_contact TEXT NOT NULL,
          product_id INTEGER NOT NULL,
          size TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shop_id) REFERENCES shops (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);

      // Shop subscriptions table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS shop_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL,
          plan TEXT NOT NULL DEFAULT 'free',
          status TEXT NOT NULL DEFAULT 'active',
          start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          end_date DATETIME,
          monthly_fee DECIMAL(10,2) DEFAULT 0,
          FOREIGN KEY (shop_id) REFERENCES shops (id)
        )
      `);
    });
  }

  // Supabase-compatible interface
  from(table) {
    return {
      select: (columns = '*') => ({
        eq: (column, value) => this._buildQuery(table, columns, { [column]: value }),
        gte: (column, value) => this._buildQuery(table, columns, { [column]: { gte: value } }),
        lte: (column, value) => this._buildQuery(table, columns, { [column]: { lte: value } }),
        ilike: (column, value) => this._buildQuery(table, columns, { [column]: { ilike: value } }),
        or: (condition) => this._buildQuery(table, columns, { or: condition }),
        order: (column, options = {}) => this._buildQuery(table, columns, {}, { orderBy: column, ascending: options.ascending !== false }),
        single: () => this._buildQuery(table, columns, {}, { single: true }),
        limit: (count) => this._buildQuery(table, columns, {}, { limit: count }),
        then: (resolve, reject) => this._executeQuery(table, columns, {}).then(resolve, reject)
      }),
      insert: (data) => ({
        select: (columns = '*') => ({
          single: () => this._insertRecord(table, data, columns, true),
          then: (resolve, reject) => this._insertRecord(table, data, columns, false).then(resolve, reject)
        }),
        then: (resolve, reject) => this._insertRecord(table, data, '*', false).then(resolve, reject)
      }),
      update: (data) => ({
        eq: (column, value) => ({
          select: (columns = '*') => this._updateRecord(table, data, { [column]: value }, columns),
          then: (resolve, reject) => this._updateRecord(table, data, { [column]: value }, '*').then(resolve, reject)
        }),
        then: (resolve, reject) => this._updateRecord(table, data, {}, '*').then(resolve, reject)
      }),
      delete: () => ({
        eq: (column, value) => ({
          then: (resolve, reject) => this._deleteRecord(table, { [column]: value }).then(resolve, reject)
        }),
        then: (resolve, reject) => this._deleteRecord(table, {}).then(resolve, reject)
      })
    };
  }

  _buildQuery(table, columns, filters = {}, options = {}) {
    return {
      eq: (column, value) => this._buildQuery(table, columns, { ...filters, [column]: value }, options),
      gte: (column, value) => this._buildQuery(table, columns, { ...filters, [column]: { ...filters[column], gte: value } }, options),
      lte: (column, value) => this._buildQuery(table, columns, { ...filters, [column]: { ...filters[column], lte: value } }, options),
      ilike: (column, value) => this._buildQuery(table, columns, { ...filters, [column]: { ...filters[column], ilike: value } }, options),
      or: (condition) => this._buildQuery(table, columns, { ...filters, or: condition }, options),
      order: (column, orderOptions = {}) => this._buildQuery(table, columns, filters, { ...options, orderBy: column, ascending: orderOptions.ascending !== false }),
      single: () => this._buildQuery(table, columns, filters, { ...options, single: true }),
      limit: (count) => this._buildQuery(table, columns, filters, { ...options, limit: count }),
      then: (resolve, reject) => this._executeQuery(table, columns, filters, options).then(resolve, reject)
    };
  }

  _executeQuery(table, columns, filters = {}, options = {}) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT ${columns} FROM ${table}`;
      const params = [];

      // Build WHERE clause
      const whereConditions = [];
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'or') {
          whereConditions.push(`(${value})`);
        } else if (typeof value === 'object' && value !== null) {
          if (value.gte !== undefined) {
            whereConditions.push(`${key} >= ?`);
            params.push(value.gte);
          }
          if (value.lte !== undefined) {
            whereConditions.push(`${key} <= ?`);
            params.push(value.lte);
          }
          if (value.ilike !== undefined) {
            whereConditions.push(`${key} LIKE ?`);
            params.push(`%${value.ilike}%`);
          }
        } else {
          whereConditions.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Add ORDER BY
      if (options.orderBy) {
        sql += ` ORDER BY ${options.orderBy} ${options.ascending === false ? 'DESC' : 'ASC'}`;
      }

      // Add LIMIT
      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          if (options.single) {
            resolve({ data: rows[0] || null, error: null });
          } else {
            resolve({ data: rows, error: null });
          }
        }
      });
    });
  }

  _insertRecord(table, data, columns, single = false) {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          const newRecord = { id: this.lastID, ...data };
          if (single) {
            resolve({ data: newRecord, error: null });
          } else {
            resolve({ data: [newRecord], error: null });
          }
        }
      });
    });
  }

  _updateRecord(table, data, filters, columns) {
    return new Promise((resolve, reject) => {
      const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const whereClause = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
      const values = [...Object.values(data), ...Object.values(filters)];
      
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ data: null, error: null });
        }
      });
    });
  }

  _deleteRecord(table, filters) {
    return new Promise((resolve, reject) => {
      const whereClause = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(filters);
      
      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ data: null, error: null });
        }
      });
    });
  }
}

// Export the appropriate database based on configuration
if (isSupabaseConfigured()) {
  console.log('Using Supabase database');
  module.exports = require('./config/supabase');
} else {
  console.log('Supabase not configured, using SQLite fallback');
  module.exports = new SQLiteDB();
}
