import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useNavigate } from "react-router-dom";
import { leadsService } from "@/services/leadsService";
import { partnersService } from "@/services/partnersService";
import { operatorsService } from "@/services/operatorsService";
import { usersService } from "@/services/usersService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Target,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  User,
  ArrowUpRight,
  Trash2,
  Loader2,
} from "lucide-react";
import LeadFormDialog from "@/components/LeadFormDialog";
import { toast } from "sonner";

const STATUS_MAP = {
  nova: { label: "Nova", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  em_contacto: { label: "Em Contacto", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  qualificada: { label: "Qualificada", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  convertida: { label: "Convertida", color: "bg-[#c8f31d]/20 text-[#c8f31d] border-[#c8f31d]/30" },
  perdida: { label: "Perdida", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PRIORITY_MAP = {
  alta: { label: "Alta", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  media: { label: "Media", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  baixa: { label: "Baixa", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const CATEGORY_LABELS = {
  energia: "Energia",
  telecomunicacoes: "Telecomunicacoes",
  paineis_solares: "Paineis Solares",
};

const SOURCE_LABELS = {
  telefone: "Telefone",
  email: "Email",
  presencial: "Presencial",
  website: "Website",
  referencia: "Referencia",
  outro: "Outro",
};

export default function Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [partners, setPartners] = useState([]);
  const [operators, setOperators] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leadsData, partnersData, operatorsData, usersData, statsData] = await Promise.all([
        leadsService.getLeads(),
        partnersService.getPartners(),
        operatorsService.getOperators(),
        usersService.getUsers(),
        leadsService.getLeadStats(),
      ]);
      setLeads(leadsData);
      setPartners(partnersData);
      setOperators(operatorsData);
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = () => {
    setEditingLead(null);
    setShowFormDialog(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowFormDialog(true);
  };

  const handleSaveLead = async (leadData) => {
    try {
      if (editingLead) {
        await leadsService.updateLead(editingLead.id, leadData);
        toast.success("Lead atualizada");
      } else {
        await leadsService.createLead({ ...leadData, created_by: user.id });
        toast.success("Lead criada");
      }
      setShowFormDialog(false);
      setEditingLead(null);
      fetchData();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast.error("Erro ao guardar lead");
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!confirm("Tem certeza que deseja eliminar esta lead?")) return;
    setDeletingId(leadId);
    try {
      await leadsService.deleteLead(leadId);
      toast.success("Lead eliminada");
      fetchData();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Erro ao eliminar lead");
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvertToSale = (lead) => {
    const params = new URLSearchParams({
      lead_id: lead.id,
      client_name: lead.client_name || "",
      client_email: lead.client_email || "",
      client_phone: lead.client_phone || "",
      client_nif: lead.client_nif || "",
      street_address: lead.street_address || "",
      postal_code: lead.postal_code || "",
      city: lead.city || "",
      category: lead.category || "",
      partner_id: lead.partner_id || "",
      operator_id: lead.operator_id || "",
    });
    navigate(`/sales/new?${params.toString()}`);
  };

  const getFilteredLeads = () => {
    return leads.filter((lead) => {
      if (statusFilter === "active" && ["convertida", "perdida"].includes(lead.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "active" && lead.status !== statusFilter) return false;
      if (categoryFilter !== "all" && lead.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && lead.priority !== priorityFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          lead.client_name?.toLowerCase().includes(term) ||
          lead.client_nif?.includes(term) ||
          lead.client_phone?.includes(term) ||
          lead.client_email?.toLowerCase().includes(term) ||
          lead.city?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  };

  const filteredLeads = getFilteredLeads();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="metric-card">
            <CardContent className="p-0">
              <p className="metric-value font-mono text-xl text-[#c8f31d]">{stats.active}</p>
              <p className="metric-label">Leads Ativas</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <p className="metric-value font-mono text-xl text-blue-400">{stats.byStatus.nova}</p>
              <p className="metric-label">Novas</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <p className="metric-value font-mono text-xl text-green-400">{stats.byStatus.convertida}</p>
              <p className="metric-label">Convertidas</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <p className="metric-value font-mono text-xl">{stats.byPriority.alta}</p>
              <p className="metric-label">Prioridade Alta</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <Input
              placeholder="Pesquisar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="form-input w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#082d32] border-white/10">
              <SelectItem value="active" className="text-white hover:bg-white/10">Ativas</SelectItem>
              <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-white/10">{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="form-input w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#082d32] border-white/10">
              <SelectItem value="all" className="text-white hover:bg-white/10">Categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-white/10">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="form-input w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#082d32] border-white/10">
              <SelectItem value="all" className="text-white hover:bg-white/10">Prioridade</SelectItem>
              {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-white/10">{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreateLead} className="btn-primary btn-primary-glow">
          <Plus size={18} className="mr-2" />
          Nova Lead
        </Button>
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <Card className="card-leiritrix">
            <CardContent className="py-12 text-center text-white/50">
              <Target size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nenhuma lead encontrada</p>
              <p className="text-sm mt-1">Crie uma nova lead para comecar</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => {
            const statusInfo = STATUS_MAP[lead.status] || STATUS_MAP.nova;
            const priorityInfo = PRIORITY_MAP[lead.priority] || PRIORITY_MAP.media;
            const isOverdue = lead.next_contact_date && new Date(lead.next_contact_date) < new Date() && !['convertida', 'perdida'].includes(lead.status);

            return (
              <Card
                key={lead.id}
                className={`card-leiritrix cursor-pointer transition-all hover:border-[#c8f31d]/30 ${isOverdue ? 'border-red-500/30' : ''}`}
                onClick={() => handleEditLead(lead)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold truncate">{lead.client_name}</h3>
                        <Badge className={`${statusInfo.color} border text-xs`}>{statusInfo.label}</Badge>
                        <Badge className={`${priorityInfo.color} border text-xs`}>{priorityInfo.label}</Badge>
                        {isOverdue && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                            Atrasada
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
                        {lead.client_nif && <span className="font-mono">{lead.client_nif}</span>}
                        {lead.client_phone && (
                          <span className="flex items-center gap-1"><Phone size={12} />{lead.client_phone}</span>
                        )}
                        {lead.client_email && (
                          <span className="flex items-center gap-1"><Mail size={12} />{lead.client_email}</span>
                        )}
                        <span>{CATEGORY_LABELS[lead.category]}</span>
                        {lead.partner_name && <span>{lead.partner_name}</span>}
                        {lead.next_contact_date && (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                            <Calendar size={12} />
                            {new Date(lead.next_contact_date).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                        {lead.assigned_user_name && (
                          <span className="flex items-center gap-1"><User size={12} />{lead.assigned_user_name}</span>
                        )}
                        <span className="text-white/30">{SOURCE_LABELS[lead.source]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!['convertida', 'perdida'].includes(lead.status) && (
                        <Button
                          size="sm"
                          onClick={() => handleConvertToSale(lead)}
                          className="bg-[#c8f31d] hover:bg-[#b5db1a] text-[#031819] text-xs"
                        >
                          <ArrowUpRight size={14} className="mr-1" />
                          Converter
                        </Button>
                      )}
                      {user.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLead(lead.id)}
                          disabled={deletingId === lead.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {deletingId === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Lead Form Dialog */}
      <LeadFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        lead={editingLead}
        onSave={handleSaveLead}
        onConvert={handleConvertToSale}
        partners={partners}
        operators={operators}
        users={users}
      />
    </div>
  );
}
