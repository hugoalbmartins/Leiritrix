import { supabase } from '@/lib/supabase';

export const leadsService = {
  async getLeads(filters = {}) {
    let query = supabase
      .from('leads')
      .select(`
        *,
        operators:operator_id (id, name),
        partners:partner_id (id, name),
        assigned_user:assigned_to (id, name),
        creator:created_by (id, name)
      `);

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(lead => ({
      ...lead,
      partner_name: lead.partners?.name || '',
      operator_name: lead.operators?.name || '',
      assigned_user_name: lead.assigned_user?.name || '',
      creator_name: lead.creator?.name || '',
    }));
  },

  async getLeadById(leadId) {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        operators:operator_id (id, name),
        partners:partner_id (id, name),
        assigned_user:assigned_to (id, name),
        creator:created_by (id, name)
      `)
      .eq('id', leadId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        ...data,
        partner_name: data.partners?.name || '',
        operator_name: data.operators?.name || '',
        assigned_user_name: data.assigned_user?.name || '',
        creator_name: data.creator?.name || '',
      };
    }

    return data;
  },

  async createLead(leadData) {
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLead(leadId, leadData) {
    const { data, error } = await supabase
      .from('leads')
      .update({ ...leadData, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteLead(leadId) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;
  },

  async convertToSale(leadId, saleId) {
    const { data, error } = await supabase
      .from('leads')
      .update({
        status: 'convertida',
        converted_sale_id: saleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLeadAlerts() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        operators:operator_id (id, name),
        partners:partner_id (id, name),
        assigned_user:assigned_to (id, name)
      `)
      .in('status', ['nova', 'em_contacto', 'qualificada'])
      .or(`next_contact_date.lte.${today},next_contact_date.is.null`)
      .order('priority', { ascending: true })
      .order('next_contact_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data || []).map(lead => ({
      ...lead,
      partner_name: lead.partners?.name || '',
      operator_name: lead.operators?.name || '',
      assigned_user_name: lead.assigned_user?.name || '',
    }));
  },

  async getLeadStats() {
    const { data, error } = await supabase
      .from('leads')
      .select('status, priority');

    if (error) throw error;

    const stats = {
      total: data.length,
      byStatus: {
        nova: data.filter(l => l.status === 'nova').length,
        em_contacto: data.filter(l => l.status === 'em_contacto').length,
        qualificada: data.filter(l => l.status === 'qualificada').length,
        convertida: data.filter(l => l.status === 'convertida').length,
        perdida: data.filter(l => l.status === 'perdida').length,
      },
      byPriority: {
        alta: data.filter(l => l.priority === 'alta').length,
        media: data.filter(l => l.priority === 'media').length,
        baixa: data.filter(l => l.priority === 'baixa').length,
      },
      active: data.filter(l => !['convertida', 'perdida'].includes(l.status)).length,
    };

    return stats;
  },
};
