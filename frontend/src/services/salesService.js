import { supabase } from '@/lib/supabase';
import { notificationsService } from './notificationsService';

export const salesService = {
  async getSales(sellerId = null, filters = {}) {
    let query = supabase
      .from('sales')
      .select(`
        *,
        operators:operator_id (
          id,
          name,
          commission_visible_to_bo
        ),
        partners:partner_id (
          id,
          name
        ),
        users:seller_id (
          id,
          name
        )
      `);

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.partnerId) {
      query = query.eq('partner_id', filters.partnerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const mappedData = data.map(sale => {
      const commissionTotal =
        (sale.commission_seller || 0) +
        (sale.commission_partner || 0) +
        (sale.commission_backoffice || 0);

      return {
        ...sale,
        partner_name: sale.partners?.name || '',
        seller_name: sale.users?.name || '',
        commission: commissionTotal
      };
    });

    return mappedData;
  },

  async getSaleById(saleId) {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        operators:operator_id (
          id,
          name,
          commission_visible_to_bo
        ),
        partners:partner_id (
          id,
          name
        ),
        users:seller_id (
          id,
          name
        )
      `)
      .eq('id', saleId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const commissionTotal =
        (data.commission_seller || 0) +
        (data.commission_partner || 0) +
        (data.commission_backoffice || 0);

      return {
        ...data,
        partner_name: data.partners?.name || '',
        seller_name: data.users?.name || '',
        commission: commissionTotal
      };
    }

    return data;
  },

  async createSale(saleData) {
    const { data, error } = await supabase
      .from('sales')
      .insert([saleData])
      .select()
      .single();

    if (error) throw error;

    try {
      await notificationsService.createSaleNotifications(data, 'sale_created');
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
    }

    return data;
  },

  async updateSale(saleId, saleData) {
    const originalSale = await this.getSaleById(saleId);

    const { data, error } = await supabase
      .from('sales')
      .update(saleData)
      .eq('id', saleId)
      .select()
      .single();

    if (error) throw error;

    if (originalSale && originalSale.status !== data.status) {
      try {
        await notificationsService.createSaleNotifications(data, 'sale_status_changed');
      } catch (notifError) {
        console.error('Error creating notifications:', notifError);
      }
    }

    return data;
  },

  async deleteSale(saleId) {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (error) throw error;
  },

  async getSalesByStatus(status) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getSalesByPartner(partnerId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getSaleStatistics() {
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select(`
        status,
        category,
        contract_value,
        commission_seller,
        commission_partner,
        operators:operator_id (
          commission_visible_to_bo
        )
      `);

    if (salesError) throw salesError;

    const stats = {
      total: salesData.length,
      active: salesData.filter(s => s.status === 'ativo').length,
      pending: salesData.filter(s => s.status === 'pendente').length,
      negotiating: salesData.filter(s => s.status === 'em_negociacao').length,
      lost: salesData.filter(s => s.status === 'perdido').length,
      cancelled: salesData.filter(s => s.status === 'anulado').length,
      totalValue: salesData.reduce((sum, s) => sum + (s.contract_value || 0), 0),
      totalCommissionsSeller: salesData
        .filter(s => s.operators?.commission_visible_to_bo)
        .reduce((sum, s) => sum + (s.commission_seller || 0), 0),
      totalCommissionsPartner: salesData
        .filter(s => s.operators?.commission_visible_to_bo)
        .reduce((sum, s) => sum + (s.commission_partner || 0), 0),
      byCategory: {
        energia: salesData.filter(s => s.category === 'energia').length,
        telecomunicacoes: salesData.filter(s => s.category === 'telecomunicacoes').length,
        paineis_solares: salesData.filter(s => s.category === 'paineis_solares').length,
      },
      byStatus: {
        em_negociacao: salesData.filter(s => s.status === 'em_negociacao').length,
        pendente: salesData.filter(s => s.status === 'pendente').length,
        ativo: salesData.filter(s => s.status === 'ativo').length,
        perdido: salesData.filter(s => s.status === 'perdido').length,
        anulado: salesData.filter(s => s.status === 'anulado').length,
      },
    };

    return stats;
  },

  async getSalesByNIF(nif) {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        operators:operator_id (
          id,
          name
        ),
        partners:partner_id (
          id,
          name
        ),
        users:seller_id (
          id,
          name
        )
      `)
      .eq('client_nif', nif)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedData = (data || []).map(sale => {
      const commissionTotal =
        (sale.commission_seller || 0) +
        (sale.commission_partner || 0) +
        (sale.commission_backoffice || 0);

      return {
        ...sale,
        partner_name: sale.partners?.name || '',
        seller_name: sale.users?.name || '',
        commission: commissionTotal
      };
    });

    return mappedData;
  },
};
