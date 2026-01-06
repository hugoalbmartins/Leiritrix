import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import { Link } from "react-router-dom";
import { salesService } from "@/services/salesService";
import { partnersService } from "@/services/partnersService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2,
  Zap,
  Phone,
  Sun,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_MAP = {
  em_negociacao: { label: "Em Negociação", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  perdido: { label: "Perdido", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  pendente: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  ativo: { label: "Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  anulado: { label: "Anulado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" }
};

const CATEGORY_MAP = {
  energia: { label: "Energia", icon: Zap },
  telecomunicacoes: { label: "Telecomunicações", icon: Phone },
  paineis_solares: { label: "Painéis Solares", icon: Sun }
};

const TYPE_MAP = {
  nova_instalacao: "Nova Instalação",
  refid: "Refid"
};

export default function Sales() {
  const { user, isAdminOrBackoffice } = useAuth();
  const [sales, setSales] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const partnersData = await partnersService.getPartners();
      setPartners(partnersData);

      const filters = {};
      if (statusFilter && statusFilter !== "all") filters.status = statusFilter;
      if (categoryFilter && categoryFilter !== "all") filters.category = categoryFilter;
      if (partnerFilter && partnerFilter !== "all") filters.partnerId = partnerFilter;

      const salesData = await salesService.getSales(null, filters);

      let filtered = salesData;
      if (search) {
        filtered = salesData.filter(sale =>
          sale.client_name?.toLowerCase().includes(search.toLowerCase()) ||
          sale.client_email?.toLowerCase().includes(search.toLowerCase()) ||
          sale.client_phone?.includes(search)
        );
      }

      setSales(filtered);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, partnerFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await salesService.deleteSale(deleteId);
      toast.success("Venda eliminada com sucesso");
      setSales(sales.filter(s => s.id !== deleteId));
    } catch (error) {
      toast.error("Erro ao eliminar venda");
    } finally {
      setDeleteId(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setPartnerFilter("");
    setSearch("");
  };

  const hasFilters = statusFilter || categoryFilter || partnerFilter || search;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Manrope']">Vendas</h1>
          <p className="text-white/50 text-sm mt-1">{sales.length} registos encontrados</p>
        </div>
        <Link to="/sales/new">
          <Button className="btn-primary btn-primary-glow flex items-center gap-2" data-testid="new-sale-btn">
            <Plus size={18} />
            Nova Venda
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="card-leiritrix">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por cliente, NIF ou parceiro..."
                  className="form-input pl-10"
                  data-testid="search-input"
                />
              </div>
            </form>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-44 form-input" data-testid="status-filter">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-[#082d32] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todos</SelectItem>
                {Object.entries(STATUS_MAP).map(([key, status]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-44 form-input" data-testid="category-filter">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#082d32] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
                {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Partner Filter */}
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger className="w-full lg:w-44 form-input" data-testid="partner-filter">
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

            {/* Clear filters */}
            {hasFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                className="text-white/70 hover:text-white"
                data-testid="clear-filters-btn"
              >
                <X size={18} className="mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="card-leiritrix overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" data-testid="sales-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Parceiro</th>
                <th>Valor</th>
                <th>Comissão</th>
                <th>Estado</th>
                <th>Data de Venda</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sales.length > 0 ? (
                sales.map((sale) => {
                  const category = CATEGORY_MAP[sale.category];
                  const CategoryIcon = category?.icon || Zap;
                  const status = STATUS_MAP[sale.status];
                  
                  return (
                    <tr key={sale.id} className="table-row-hover" data-testid={`sale-row-${sale.id}`}>
                      <td>
                        <div>
                          <p className="font-medium">{sale.client_name}</p>
                          {sale.client_nif && (
                            <p className="text-white/50 text-sm font-mono">{sale.client_nif}</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <CategoryIcon size={16} className="text-[#c8f31d]" />
                          <span className="text-white/80">{category?.label}</span>
                        </div>
                      </td>
                      <td>
                        {sale.sale_type ? (
                          <span className="text-white/60 text-sm">
                            {TYPE_MAP[sale.sale_type]}
                          </span>
                        ) : "-"}
                      </td>
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
                        <Badge className={`${status?.color} border text-xs`}>
                          {status?.label}
                        </Badge>
                      </td>
                      <td className="text-white/60 text-sm">
                        {new Date(sale.sale_date || sale.created_at).toLocaleDateString('pt-PT')}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/sales/${sale.id}`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-white/60 hover:text-white"
                              data-testid={`view-sale-${sale.id}`}
                            >
                              <Eye size={16} />
                            </Button>
                          </Link>
                          <Link to={`/sales/${sale.id}/edit`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-white/60 hover:text-[#c8f31d]"
                              data-testid={`edit-sale-${sale.id}`}
                            >
                              <Edit2 size={16} />
                            </Button>
                          </Link>
                          {isAdminOrBackoffice && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-white/60 hover:text-red-400"
                              onClick={() => setDeleteId(sale.id)}
                              data-testid={`delete-sale-${sale.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-white/50">
                    Nenhuma venda encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#082d32] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Venda</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem a certeza que pretende eliminar esta venda? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-secondary">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
