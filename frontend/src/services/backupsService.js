import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const STATUS_LABELS = {
  em_negociacao: 'Em Negociacao',
  pendente: 'Pendente',
  ativo: 'Ativo',
  perdido: 'Perdido',
  anulado: 'Anulado',
};

const CATEGORY_LABELS = {
  energia: 'Energia',
  telecomunicacoes: 'Telecomunicacoes',
  paineis_solares: 'Paineis Solares',
};

const TYPE_LABELS = {
  nova_instalacao: 'Nova Instalacao',
  refid: 'Refid',
};

export const backupsService = {
  async getLastBackup() {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async checkBackupNeeded() {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const isOddMonth = month % 2 === 1;

    if (day !== 3 || !isOddMonth) return false;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data, error } = await supabase
      .from('backups')
      .select('id')
      .gte('created_at', threeDaysAgo.toISOString())
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return !data;
  },

  async recordBackup(userId, userName, totalSales, fileName) {
    const { data, error } = await supabase
      .from('backups')
      .insert({
        user_id: userId,
        user_name: userName,
        total_sales: totalSales,
        file_name: fileName,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async exportSalesToExcel(userId, userName) {
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        *,
        operators:operator_id (id, name),
        partners:partner_id (id, name),
        users:seller_id (id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (sales || []).map((sale) => ({
      'Cliente': sale.client_name || '',
      'NIF': sale.client_nif || '',
      'Email': sale.client_email || '',
      'Telefone': sale.client_phone || '',
      'Morada': sale.street_address || '',
      'Codigo Postal': sale.postal_code || '',
      'Cidade': sale.city || '',
      'Categoria': CATEGORY_LABELS[sale.category] || sale.category || '',
      'Tipo': TYPE_LABELS[sale.sale_type] || sale.sale_type || '',
      'Operadora': sale.operators?.name || '',
      'Parceiro': sale.partners?.name || '',
      'Vendedor': sale.users?.name || '',
      'Valor Contrato': sale.contract_value || 0,
      'Comissao Vendedor': sale.commission_seller || 0,
      'Comissao Parceiro': sale.commission_partner || 0,
      'Comissao Backoffice': sale.commission_backoffice || 0,
      'Estado': STATUS_LABELS[sale.status] || sale.status || '',
      'Data Venda': sale.sale_date
        ? new Date(sale.sale_date).toLocaleDateString('pt-PT')
        : '',
      'Data Ativacao': sale.active_date
        ? new Date(sale.active_date).toLocaleDateString('pt-PT')
        : '',
      'Data Criacao': sale.created_at
        ? new Date(sale.created_at).toLocaleDateString('pt-PT')
        : '',
      'Notas': sale.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length + 2, 15),
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `backup_vendas_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);

    await this.recordBackup(userId, userName, rows.length, fileName);

    return { fileName, totalSales: rows.length };
  },
};
