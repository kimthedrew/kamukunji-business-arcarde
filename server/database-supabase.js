const supabase = require('./config/supabase');

class SupabaseDB {
  // Generic query method
  async query(sql, params = []) {
    try {
      // For now, we'll use the REST API for complex queries
      // In production, you might want to use stored procedures or functions
      const { data, error } = await supabase.rpc('execute_sql', { 
        sql_query: sql, 
        params: params 
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Database query error:', error);
      return { data: null, error };
    }
  }

  // Get single record
  async get(table, filters = {}) {
    try {
      let query = supabase.from(table).select('*');
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return { data, error: null };
    } catch (error) {
      console.error('Database get error:', error);
      return { data: null, error };
    }
  }

  // Get multiple records
  async all(table, filters = {}, orderBy = null) {
    try {
      let query = supabase.from(table).select('*');
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.asc !== false });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Database all error:', error);
      return { data: null, error };
    }
  }

  // Insert record
  async insert(table, record) {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(record)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Database insert error:', error);
      return { data: null, error };
    }
  }

  // Update record
  async update(table, filters, updates) {
    try {
      let query = supabase.from(table).update(updates);
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query.select();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Database update error:', error);
      return { data: null, error };
    }
  }

  // Delete record
  async delete(table, filters) {
    try {
      let query = supabase.from(table).delete();
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Database delete error:', error);
      return { data: null, error };
    }
  }

  // Custom query for complex operations
  async customQuery(queryFunction) {
    try {
      return await queryFunction(supabase);
    } catch (error) {
      console.error('Custom query error:', error);
      return { data: null, error };
    }
  }
}

// Create singleton instance
const db = new SupabaseDB();

module.exports = db;


