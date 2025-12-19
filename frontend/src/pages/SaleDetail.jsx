import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  ArrowLeft, 
  Edit2, 
  Euro, 
  User, 
  Phone, 
  Mail,
  MapPin,
  FileText,
  Calendar as CalendarIcon,
  Clock,
  Zap,
  Sun,
  AlertTriangle,
  Save,
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
  energia: { label: "Energia", icon: Zap },
  telecomunicacoes: { label: "Telecomunicações", icon: Phone },
  paineis_solares: { label: "Painéis Solares", icon: Sun }
};

const TYPE_MAP = {
  nova_instalacao: "Nova Instalação",
  refid: "Refid (Renovação)"
};

const ENERGY_TYPE_MAP = {
  eletricidade: "Eletricidade",
  gas: "Gás",
  dual: "Dual"
};

const STATUSES = [
  { value: "em_negociacao", label: "Em Negociação" },
  { value: "pendente", label: "Pendente" },
  { value: "ativo", label: "Ativo" },
  { value: "perdido", label: "Perdido" },
  { value: "anulado", label: "Anulado" }
];

export default function SaleDetail({ editMode = false }) {
  const { token, isAdminOrBackoffice } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commissionModal, setCommissionModal] = useState(false);
  const [commission, setCommission] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);
  
  // Edit fields (limited)
  const [editStatus, setEditStatus] = useState("");
  const [editActiveDate, setEditActiveDate] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [editReq, setEditReq] = useState("");
  const [isEditing, setIsEditing] = useState(editMode);

  useEffect(() => {
    fetchSale();
  }, [id, token]);

  const fetchSale = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/sales/${id}`, { headers });
      const saleData = response.data;
      setSale(saleData);
      setCommission(saleData.commission?.toString() || "");
      setEditStatus(saleData.status || "");
      setEditNotes(saleData.notes || "");
      setEditReq(saleData.req || "");
      if (saleData.active_date) {
        setEditActiveDate(new Date(saleData.active_date));
      }
    } catch (error) {
      toast.error("Erro ao carregar venda");
      navigate("/sales");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        status: editStatus,
        notes: editNotes,
        active_date: editActiveDate ? editActiveDate.toISOString() : null,
        req: sale.category === "telecomunicacoes" ? editReq : null
      };
      
      const response = await axios.put(`${API}/sales/${id}`, payload, { headers });
      setSale(response.data);
      setIsEditing(false);
      toast.success("Venda atualizada com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar venda");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCommission = async () => {
    if (!commission || isNaN(parseFloat(commission))) {
      toast.error("Insira um valor válido");
      return;
    }

    setSavingCommission(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(
        `${API}/sales/${id}/commission`,
        { commission: parseFloat(commission) },
        { headers }
      );
      setSale(response.data);
      setCommissionModal(false);
      toast.success("Comissão atribuída com sucesso");
    } catch (error) {
      toast.error("Erro ao atribuir comissão");
    } finally {
      setSavingCommission(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!sale) {
    return null;
  }

  const status = STATUS_MAP[sale.status];
  const category = CATEGORY_MAP[sale.category];
  const CategoryIcon = category?.icon || Zap;

  // Calculate days until loyalty end
  let daysUntilEnd = null;
  if (sale.loyalty_end_date) {
    const endDate = new Date(sale.loyalty_end_date);
    const now = new Date();
    daysUntilEnd = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
  }

  const isTelecom = sale.category === "telecomunicacoes";
  const isEnergy = sale.category === "energia";

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="sale-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white"
            data-testid="back-btn"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-['Manrope']">
                {sale.client_name}
              </h1>
              <Badge className={`${status?.color} border`}>
                {status?.label}
              </Badge>
            </div>
            <p className="text-white/50 text-sm mt-1">
              ID: <span className="font-mono">{sale.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)}
            className="btn-primary btn-primary-glow flex items-center gap-2" 
            data-testid="edit-sale-btn"
          >
            <Edit2 size={16} />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsEditing(false)}
              variant="ghost"
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="btn-primary btn-primary-glow flex items-center gap-2"
              data-testid="save-btn"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar
            </Button>
          </div>
        )}
      </div>

      {/* Alert for loyalty ending soon */}
      {daysUntilEnd !== null && daysUntilEnd <= 210 && sale.status === "ativo" && (
        <Card className="card-leiritrix border-l-4 border-l-[#c8f31d]" data-testid="loyalty-alert">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="text-[#c8f31d]" size={24} />
            <div>
              <p className="text-white font-medium">Fidelização a terminar</p>
              <p className="text-white/60 text-sm">
                Este contrato termina em <span className="text-[#c8f31d] font-bold">{daysUntilEnd} dias</span>. 
                Inicie a negociação para renovação.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form (if editing) */}
      {isEditing && (
        <Card className="card-leiritrix border-2 border-[#c8f31d]/30">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
              <Edit2 size={20} className="text-[#c8f31d]" />
              Editar Venda
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="form-label">Estado</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="form-input" data-testid="edit-status-select">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-white hover:bg-white/10">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="form-label">Data de Ativação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="form-input w-full justify-start text-left font-normal"
                      data-testid="edit-active-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#c8f31d]" />
                      {editActiveDate ? format(editActiveDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#082d32] border-white/10">
                    <Calendar
                      mode="single"
                      selected={editActiveDate}
                      onSelect={setEditActiveDate}
                      locale={pt}
                      className="bg-[#082d32]"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* REQ field only for telecom */}
              {isTelecom && (
                <div className="md:col-span-2">
                  <Label className="form-label">REQ (Telecomunicações)</Label>
                  <Input
                    value={editReq}
                    onChange={(e) => setEditReq(e.target.value)}
                    className="form-input"
                    placeholder="Número de requisição"
                    data-testid="edit-req-input"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <Label className="form-label">Notas</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="form-input min-h-24"
                  placeholder="Observações..."
                  data-testid="edit-notes-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card className="card-leiritrix lg:col-span-2">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
              <User size={20} className="text-[#c8f31d]" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-white/50 text-sm mb-1">Nome</p>
                <p className="text-white font-medium">{sale.client_name}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm mb-1">NIF</p>
                <p className="text-white font-mono">{sale.client_nif || "-"}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm mb-1 flex items-center gap-1">
                  <Mail size={14} /> Email
                </p>
                <p className="text-white">{sale.client_email || "-"}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm mb-1 flex items-center gap-1">
                  <Phone size={14} /> Telefone
                </p>
                <p className="text-white">{sale.client_phone || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-white/50 text-sm mb-1 flex items-center gap-1">
                  <MapPin size={14} /> Morada
                </p>
                <p className="text-white">{sale.client_address || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Value & Commission */}
        <Card className="card-leiritrix">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
              <Euro size={20} className="text-[#c8f31d]" />
              Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <p className="text-white/50 text-sm mb-1">Valor do Contrato</p>
              <p className="text-2xl font-bold text-[#c8f31d] font-mono">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(sale.contract_value)}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1">Comissão</p>
              {sale.commission !== null && sale.commission !== undefined ? (
                <div>
                  <p className="text-2xl font-bold text-green-400 font-mono">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(sale.commission)}
                  </p>
                  {sale.commission_assigned_by && (
                    <p className="text-white/40 text-xs mt-1">
                      Atribuída por {sale.commission_assigned_by}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-white/30 mb-2">Não atribuída</p>
                  {isAdminOrBackoffice && (
                    <Button
                      onClick={() => setCommissionModal(true)}
                      className="btn-primary btn-primary-glow text-xs"
                      data-testid="assign-commission-btn"
                    >
                      Atribuir Comissão
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Details */}
      <Card className="card-leiritrix">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
            <FileText size={20} className="text-[#c8f31d]" />
            Detalhes do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-white/50 text-sm mb-1">Categoria</p>
              <div className="flex items-center gap-2">
                <CategoryIcon size={18} className="text-[#c8f31d]" />
                <p className="text-white">{category?.label}</p>
              </div>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1">Tipo</p>
              <p className="text-white">{TYPE_MAP[sale.sale_type] || "-"}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1">Parceiro</p>
              <p className="text-white">{sale.partner_name}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1">Vendedor</p>
              <p className="text-white">{sale.seller_name}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1 flex items-center gap-1">
                <Clock size={14} /> Prazo Fidelização
              </p>
              <p className="text-white">{sale.loyalty_months ? `${sale.loyalty_months} meses` : "-"}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1 flex items-center gap-1">
                <CalendarIcon size={14} /> Data de Ativação
              </p>
              <p className="text-white">
                {sale.active_date ? new Date(sale.active_date).toLocaleDateString('pt-PT') : "-"}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1">Fim da Fidelização</p>
              <p className="text-white">
                {sale.loyalty_end_date ? new Date(sale.loyalty_end_date).toLocaleDateString('pt-PT') : "-"}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-sm mb-1">Data de Criação</p>
              <p className="text-white">
                {new Date(sale.created_at).toLocaleDateString('pt-PT')}
              </p>
            </div>

            {/* Telecom REQ */}
            {isTelecom && sale.req && (
              <div>
                <p className="text-white/50 text-sm mb-1">REQ</p>
                <p className="text-white font-mono">{sale.req}</p>
              </div>
            )}
          </div>

          {/* Energy Details */}
          {isEnergy && sale.energy_type && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <Zap size={16} className="text-[#c8f31d]" />
                Dados de Energia
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-white/50 text-sm mb-1">Tipo de Energia</p>
                  <p className="text-white">{ENERGY_TYPE_MAP[sale.energy_type]}</p>
                </div>
                {(sale.energy_type === "eletricidade" || sale.energy_type === "dual") && (
                  <>
                    <div>
                      <p className="text-white/50 text-sm mb-1">CPE</p>
                      <p className="text-white font-mono">{sale.cpe || "-"}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-sm mb-1">Potência</p>
                      <p className="text-white">{sale.potencia ? `${sale.potencia} kVA` : "-"}</p>
                    </div>
                  </>
                )}
                {(sale.energy_type === "gas" || sale.energy_type === "dual") && (
                  <>
                    <div>
                      <p className="text-white/50 text-sm mb-1">CUI</p>
                      <p className="text-white font-mono">{sale.cui || "-"}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-sm mb-1">Escalão</p>
                      <p className="text-white">{sale.escalao || "-"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {sale.notes && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-white/50 text-sm mb-2">Notas</p>
              <p className="text-white/80 whitespace-pre-wrap">{sale.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Modal */}
      <Dialog open={commissionModal} onOpenChange={setCommissionModal}>
        <DialogContent className="bg-[#082d32] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-['Manrope']">Atribuir Comissão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="commission" className="form-label">
              Valor da Comissão (€)
            </Label>
            <Input
              id="commission"
              type="number"
              step="0.01"
              min="0"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="form-input mt-2"
              placeholder="0.00"
              data-testid="commission-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCommissionModal(false)}
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCommission}
              disabled={savingCommission}
              className="btn-primary btn-primary-glow"
              data-testid="save-commission-btn"
            >
              {savingCommission ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
