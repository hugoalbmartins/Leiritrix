import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { salesService } from "@/services/salesService";
import { usersService } from "@/services/usersService";
import { partnersService } from "@/services/partnersService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateSelect } from "@/components/ui/date-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Filter,
  Loader2
} from "lucide-react";

const STATUS_MAP = {
  em_negociacao: { label: "Em Negociação", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  perdido: { label: "Perdido", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  pendente: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  ativo: { label: "Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  anulado: { label: "Anulado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" }
};

const CATEGORY_MAP = {
  energia: "Energia",
  telecomunicacoes: "Telecomunicações",
  paineis_solares: "Painéis Solares"
};

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [partners, setPartners] = useState([]);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [partnerId, setPartnerId] = useState("");

  useEffect(() => {
    fetchFiltersData();
  }, []);

  const fetchFiltersData = async () => {
    try {
      const [usersData, partnersData] = await Promise.all([
        usersService.getUsersByRole("vendedor"),
        partnersService.getPartners()
      ]);
      setSellers(usersData);
      setPartners(partnersData);
    } catch (error) {
      console.error("Error fetching filters data:", error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let salesData = await salesService.getSales();

      if (startDate) {
        salesData = salesData.filter(s => new Date(s.sale_date || s.created_at) >= startDate);
      }
      if (endDate) {
        salesData = salesData.filter(s => new Date(s.sale_date || s.created_at) <= endDate);
      }
      if (category && category !== "all") {
        salesData = salesData.filter(s => s.category === category);
      }
      if (status && status !== "all") {
        salesData = salesData.filter(s => s.status === status);
      }
      if (sellerId && sellerId !== "all") {
        salesData = salesData.filter(s => s.seller_id === sellerId);
      }
      if (partnerId && partnerId !== "all") {
        salesData = salesData.filter(s => s.partner_id === partnerId);
      }

      const reportData = {
        sales: salesData,
        total_sales: salesData.length,
        total_value: salesData.reduce((sum, s) => sum + (s.contract_value || 0), 0),
        total_commission: salesData.reduce((sum, s) => sum + (s.commission || 0), 0),
        by_category: {
          energia: salesData.filter(s => s.category === 'energia').length,
          telecomunicacoes: salesData.filter(s => s.category === 'telecomunicacoes').length,
          paineis_solares: salesData.filter(s => s.category === 'paineis_solares').length
        },
        by_status: {
          em_negociacao: salesData.filter(s => s.status === 'em_negociacao').length,
          perdido: salesData.filter(s => s.status === 'perdido').length,
          pendente: salesData.filter(s => s.status === 'pendente').length,
          ativo: salesData.filter(s => s.status === 'ativo').length,
          anulado: salesData.filter(s => s.status === 'anulado').length
        }
      };

      setReport(reportData);
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report || !report.sales.length) {
      toast.error("Sem dados para exportar");
      return;
    }

    const headers = [
      "Cliente", "NIF", "Categoria", "Tipo", "Parceiro",
      "Valor Contrato", "Comissão", "Estado", "Vendedor", "Data de Venda"
    ];

    const rows = report.sales.map(sale => [
      sale.client_name,
      sale.client_nif || "",
      CATEGORY_MAP[sale.category] || sale.category,
      sale.sale_type || "",
      sale.partner_name || "",
      sale.contract_value,
      sale.commission || "",
      STATUS_MAP[sale.status]?.label || sale.status,
      sale.seller_name,
      new Date(sale.sale_date || sale.created_at).toLocaleDateString('pt-PT')
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_vendas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success("Relatório exportado com sucesso");
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-['Manrope']">Relatórios</h1>
        <p className="text-white/50 text-sm mt-1">Gere relatórios de vendas com filtros personalizados</p>
      </div>

      {/* Filters */}
      <Card className="card-leiritrix">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
            <Filter size={20} className="text-[#c8f31d]" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DateSelect
              value={startDate}
              onChange={setStartDate}
              placeholder="Data início"
              data-testid="start-date-picker"
            />

            <DateSelect
              value={endDate}
              onChange={setEndDate}
              placeholder="Data fim"
              data-testid="end-date-picker"
            />

            {/* Category */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="form-input" data-testid="report-category-filter">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#082d32] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="form-input" data-testid="report-status-filter">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-[#082d32] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todos</SelectItem>
                {Object.entries(STATUS_MAP).map(([key, s]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Partner */}
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger className="form-input" data-testid="report-partner-filter">
                <SelectValue placeholder="Parceiro" />
              </SelectTrigger>
              <SelectContent className="bg-[#082d32] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todos</SelectItem>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id} className="text-white hover:bg-white/10">
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Seller */}
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger className="form-input" data-testid="report-seller-filter">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent className="bg-[#082d32] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todos</SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id} className="text-white hover:bg-white/10">
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={generateReport}
              disabled={loading}
              className="btn-primary btn-primary-glow"
              data-testid="generate-report-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <FileText size={18} className="mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {report && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="metric-card" data-testid="report-total-count">
              <CardContent className="p-0">
                <p className="metric-value">{report.total_sales}</p>
                <p className="metric-label">Total de Vendas</p>
              </CardContent>
            </Card>
            <Card className="metric-card" data-testid="report-total-value">
              <CardContent className="p-0">
                <p className="metric-value font-mono">
                  {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(report.total_value)}
                </p>
                <p className="metric-label">Valor Total</p>
              </CardContent>
            </Card>
            <Card className="metric-card" data-testid="report-total-commission">
              <CardContent className="p-0">
                <p className="metric-value font-mono text-green-400">
                  {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(report.total_commission)}
                </p>
                <p className="metric-label">Total Comissões</p>
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={exportToCSV}
              className="btn-secondary flex items-center gap-2"
              data-testid="export-csv-btn"
            >
              <Download size={18} />
              Exportar CSV
            </Button>
          </div>

          {/* Data Table */}
          <Card className="card-leiritrix overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table" data-testid="report-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Categoria</th>
                    <th>Parceiro</th>
                    <th>Valor</th>
                    <th>Comissão</th>
                    <th>Estado</th>
                    <th>Vendedor</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.length > 0 ? (
                    report.sales.map((sale) => {
                      const statusInfo = STATUS_MAP[sale.status];
                      return (
                        <tr key={sale.id} className="table-row-hover">
                          <td>
                            <div>
                              <p className="font-medium">{sale.client_name}</p>
                              {sale.client_nif && (
                                <p className="text-white/50 text-sm font-mono">{sale.client_nif}</p>
                              )}
                            </div>
                          </td>
                          <td className="text-white/80">{CATEGORY_MAP[sale.category]}</td>
                          <td className="text-white/80">{sale.partner_name}</td>
                          <td className="font-mono text-[#c8f31d]">
                            {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(sale.contract_value)}
                          </td>
                          <td className="font-mono">
                            {sale.commission !== null && sale.commission !== undefined ? (
                              <span className="text-green-400">
                                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(sale.commission)}
                              </span>
                            ) : (
                              <span className="text-white/30">-</span>
                            )}
                          </td>
                          <td>
                            <Badge className={`${statusInfo?.color} border text-xs`}>
                              {statusInfo?.label}
                            </Badge>
                          </td>
                          <td className="text-white/80">{sale.seller_name}</td>
                          <td className="text-white/60 text-sm">
                            {new Date(sale.created_at).toLocaleDateString('pt-PT')}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-white/50">
                        Nenhuma venda encontrada com os filtros selecionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
