import { supabase } from '@/lib/supabase';

export const usersService = {
  async getUsers(includeInactive = false) {
    let query = supabase.from('users').select('*');

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getUserById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createUser(email, name, role) {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          name,
          role,
          active: true,
          must_change_password: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateUser(userId, userData) {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUser(userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  },

  async toggleUserActive(userId, active) {
    return this.updateUser(userId, { active });
  },

  async getUsersByRole(role, includeInactive = false) {
    let query = supabase.from('users').select('*').eq('role', role);

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getUserSalesStats(userId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('seller_id', userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      active: data.filter(s => s.status === 'ativo').length,
      pending: data.filter(s => s.status === 'pendente').length,
      negotiating: data.filter(s => s.status === 'em_negociacao').length,
      lost: data.filter(s => s.status === 'perdido').length,
      totalValue: data.reduce((sum, s) => sum + (s.contract_value || 0), 0),
    };

    return stats;
  },

  async resetUserPassword(userId, newPassword) {
    const { data, error } = await supabase.rpc('admin_reset_user_password', {
      target_user_id: userId,
      new_password: newPassword,
    });

    if (error) {
      throw new Error(error.message || 'Erro ao resetar password');
    }

    return data;
  },
};
