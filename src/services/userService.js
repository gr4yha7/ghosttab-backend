const supabase = require('../config/database');

class UserService {
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, wallet_address, avatar_url, trust_score_status, created_at, updated_at')
      .order('id', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, wallet_address, avatar_url, trust_score_status, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async createUser(username, email, wallet_address, avatar_url) {
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, email, wallet_address, avatar_url, updated_at: new Date().toISOString() }])
      .select('username, email, wallet_address, avatar_url, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id, name, email) {
    const { data, error } = await supabase
      .from('users')
      .update({ name, email, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, email, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async deleteUser(id) {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return true;
  }
}

module.exports = new UserService();