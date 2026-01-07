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
import { DateSelect } from "@/components/ui/date-select";
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Zap,
  Phone,
  Sun,
  X,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
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
  const [saleDateFrom, setSaleDateFrom] = useState(null);
  const [saleDateTo, setSaleDateTo] = useState(null);
  const [activeDateFrom, setActiveDateFrom] = useState(null);
  const [activeDateTo, setActiveDateTo] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState("sale_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const ITEMS_PER_PAGE = 10;

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
        filtered = filtered.filter(sale =>
          sale.client_name?.toLowerCase().includes(search.toLowerCase()) ||
          sale.client_email?.toLowerCase().includes(search.toLowerCase()) ||
          sale.client_phone?.includes(search)
        );
      }

      if (saleDateFrom) {
        filtered = filtered.filter(sale => {
          if (!sale.sale_date) return false;
          const saleDate = new Date(sale.sale_date);
          return saleDate >= saleDateFrom;
        });
      }

      if (saleDateTo) {
        filtered = filtered.filter(sale => {
          if (!sale.sale_date) return false;
          const saleDate = new Date(sale.sale_date);
          return saleDate <= saleDateTo;
        });
      }

      if (activeDateFrom) {
        filtered = filtered.filter(sale => {
          if (!sale.active_date) return false;
          const activeDate = new Date(sale.active_date);
          return activeDate >= activeDateFrom;
        });
      }

      if (activeDateTo) {
        filtered = filtered.filter(sale => {
          if (!sale.active_date) return false;
          const activeDate = new Date(sale.active_date);
          return activeDate <= activeDateTo;
        });
      }

      setSales(filtered);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, partnerFilter, search, saleDateFrom, saleDateTo, activeDateFrom, activeDateTo]);

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
    setSaleDateFrom(null);
    setSaleDateTo(null);
    setActiveDateFrom(null);
    setActiveDateTo(null);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const sortedSales = [...sales].sort((a, b) => {
    let aValue = a[sortColumn];
    let bValue = b[sortColumn];

    if (sortColumn === "client_name") {
      aValue = a.client_name || "";
      bValue = b.client_name || "";
    } else if (sortColumn === "category") {
      aValue = CATEGORY_MAP[a.category]?.label || "";
      bValue = CATEGORY_MAP[b.category]?.label || "";
    } else if (sortColumn === "partner_name") {
      aValue = a.partner_name || "";
      bValue = b.partner_name || "";
    } else if (sortColumn === "contract_value") {
      aValue = a.contract_value || 0;
      bValue = b.contract_value || 0;
    } else if (sortColumn === "commission") {
      aValue = a.commission || 0;
      bValue = b.commission || 0;
    } else if (sortColumn === "status") {
      aValue = STATUS_MAP[a.status]?.label || "";
      bValue = STATUS_MAP[b.status]?.label || "";
    } else if (sortColumn === "sale_date") {
      aValue = new Date(a.sale_date || a.created_at).getTime();
      bValue = new Date(b.sale_date || b.created_at).getTime();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedSales.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSales = sortedSales.slice(startIndex, endIndex);

  const hasFilters = statusFilter || categoryFilter || partnerFilter || search || saleDateFrom || saleDateTo || activeDateFrom || activeDateTo;

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

      {/* Filters - Compact Design */}
      <div className="space-y-3">
        {/* Main Search Bar */}
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar cliente, NIF, email ou telefone..."
                className="form-input pl-9 h-10 text-sm"
                data-testid="search-input"
              />
            </div>
          </form>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 px-3"
          >
            <Filter size={16} />
          </Button>

          {hasFilters && (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white h-10 px-3"
              data-testid="clear-filters-btn"
            >
              <X size={16} />
            </Button>
          )}
        </div>

        {/* Advanced Filters - Collapsible */}
        {showFilters && (
          <Card className="card-leiritrix border-[#c8f31d]/20">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="form-input h-9 text-sm" data-testid="status-filter">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10 z-50">
                      <SelectItem value="all" className="text-white hover:bg-white/10">Todos</SelectItem>
                      {Object.entries(STATUS_MAP).map(([key, status]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-white/10 text-sm">
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Categoria</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="form-input h-9 text-sm" data-testid="category-filter">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10 z-50">
                      <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
                      {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-white/10 text-sm">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Parceiro</label>
                  <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                    <SelectTrigger className="form-input h-9 text-sm" data-testid="partner-filter">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10 z-50">
                      <SelectItem value="all" className="text-white hover:bg-white/10">Todos</SelectItem>
                      {partners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id} className="text-white hover:bg-white/10 text-sm">
                          {partner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Data de Venda (De)</label>
                  <DateSelect
                    value={saleDateFrom}
                    onChange={setSaleDateFrom}
                    placeholder="Data inicial"
                    className="h-10 text-sm w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-2 block">Data de Venda (Até)</label>
                  <DateSelect
                    value={saleDateTo}
                    onChange={setSaleDateTo}
                    placeholder="Data final"
                    className="h-10 text-sm w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-2 block">Data de Ativação (De)</label>
                  <DateSelect
                    value={activeDateFrom}
                    onChange={setActiveDateFrom}
                    placeholder="Data inicial"
                    className="h-10 text-sm w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-2 block">Data de Ativação (Até)</label>
                  <DateSelect
                    value={activeDateTo}
                    onChange={setActiveDateTo}
                    placeholder="Data final"
                    className="h-10 text-sm w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales Table */}
      <Card className="card-leiritrix overflow-hidden flex flex-col" style={{maxHeight: 'calc(100vh - 280px)'}}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="data-table" data-testid="sales-table">
            <thead>
              <tr>
                <th>
                  <button
                    onClick={() => handleSort("client_name")}
                    className="flex items-center gap-1 hover:text-[#c8f31d] transition-colors"
                  >
                    Cliente
                    <ArrowUpDown size={14} className={sortColumn === "client_name" ? "text-[#c8f31d]" : "text-white/40"} />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort("category")}
                    className="flex items-center gap-1 hover:text-[#c8f31d] transition-colors"
                  >
                    Categoria
                    <ArrowUpDown size={14} className={sortColumn === "category" ? "text-[#c8f31d]" : "text-white/40"} />
                  </button>
                </th>
                <th>Tipo</th>
                <th>
                  <button
                    onClick={() => handleSort("partner_name")}
                    className="flex items-center gap-1 hover:text-[#c8f31d] transition-colors"
                  >
                    Parceiro
                    <ArrowUpDown size={14} className={sortColumn === "partner_name" ? "text-[#c8f31d]" : "text-white/40"} />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort("contract_value")}
                    className="flex items-center gap-1 hover:text-[#c8f31d] transition-colors"
                  >
                    Valor
                    <ArrowUpDown size={14} className={sortColumn === "contract_value" ? "text-[#c8f31d]" : "text-white/40"} />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort("commission")}
                    className="flex items-center gap-1 hover:text-[#c8f31d] transition-colors"
                  >
                    Comissão
                    <ArrowUpDown size={14} className={sortColumn === "commission" ? "text-[#c8f31d]" : "text-white/40"} />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 hover:text-[#c8f31d] transition-colors"
                  >
                    Estado
                    <ArrowUpDown size={14} className={sortColumn === "status" ? "text-[#c8f31d]" : "text-white/40"} />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort("sale_date")}
                    className="flex items-center gap-1 hover:text-[#c8f31d] transition-colors"
                  >
                    Data de Venda
                    <ArrowUpDown size={14} className={sortColumn === "sale_date" ? "text-[#c8f31d]" : "text-white/40"} />
                  </button>
                </th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length > 0 ? (
                paginatedSales.map((sale) => {
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
                        {(() => {
                          const shouldShowCommission =
                            user.role === 'admin' ||
                            (user.role === 'backoffice' && sale.operators?.commission_visible_to_bo);

                          if (!shouldShowCommission) {
                            return <span className="text-white/30">-</span>;
                          }

                          if (sale.commission !== null && sale.commission !== undefined) {
                            const colorClass = user.role === 'admin' ? 'text-[#c8f31d]' : 'text-green-400';
                            return (
                              <span className={colorClass}>
                                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(sale.commission)}
                              </span>
                            );
                          }

                          return <span className="text-white/30">-</span>;
                        })()}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-white/60 text-sm">
            Página {currentPage} de {totalPages} ({sortedSales.length} vendas)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-white/10 text-white hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              Anterior
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={
                        page === currentPage
                          ? "bg-[#c8f31d] text-[#082d32] hover:bg-[#c8f31d]/90"
                          : "border-white/10 text-white hover:bg-white/5"
                      }
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="text-white/40 px-2">...</span>;
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-white/10 text-white hover:bg-white/5 disabled:opacity-30"
            >
              Seguinte
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

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
