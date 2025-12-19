import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, User, FileText, Zap } from "lucide-react";

const CATEGORIES = [
  { value: "energia", label: "Energia" },
  { value: "telecomunicacoes", label: "Telecomunicações" },
  { value: "paineis_solares", label: "Painéis Solares" }
];

const SALE_TYPES = [
  { value: "nova_instalacao", label: "Nova Instalação" },
  { value: "refid", label: "Refid (Renovação)" }
];

const ENERGY_TYPES = [
  { value: "eletricidade", label: "Eletricidade" },
  { value: "gas", label: "Gás" },
  { value: "dual", label: "Dual (Eletricidade + Gás)" }
];

const POTENCIAS = [
  "1.15", "2.3", "3.45", "4.6", "5.75", "6.9", "10.35", "13.8", 
  "17.25", "20.7", "27.6", "34.5", "41.4", "Outra"
];

const ESCALOES_GAS = [
  "Escalão 1", "Escalão 2", "Escalão 3", "Escalão 4"
];

export default function SaleForm() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  
  const [formData, setFormData] = useState({
    // Client data
    client_name: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    client_nif: "",
    // Contract data
    category: "",
    sale_type: "",
    partner_id: "",
    contract_value: "",
    loyalty_months: "",
    notes: "",
    // Energy specific
    energy_type: "",
    cpe: "",
    potencia: "",
    cui: "",
    escalao: ""
  });

  useEffect(() => {
    fetchPartners();
  }, [token]);

  const fetchPartners = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/partners`, { headers });
      setPartners(response.data);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Erro ao carregar parceiros");
    } finally {
      setLoadingPartners(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.client_name || !formData.category || !formData.partner_id) {
      toast.error("Preencha os campos obrigatórios (Nome, Categoria, Parceiro)");
      return;
    }

    if (!formData.client_phone && !formData.client_email) {
      toast.error("Preencha pelo menos um contacto (telefone ou email)");
      return;
    }

    // Energy validation
    if (formData.category === "energia") {
      if (!formData.energy_type) {
        toast.error("Selecione o tipo de energia");
        return;
      }
      
      if ((formData.energy_type === "eletricidade" || formData.energy_type === "dual") && (!formData.cpe || !formData.potencia)) {
        toast.error("CPE e Potência são obrigatórios para eletricidade");
        return;
      }
      
      if ((formData.energy_type === "gas" || formData.energy_type === "dual") && (!formData.cui || !formData.escalao)) {
        toast.error("CUI e Escalão são obrigatórios para gás");
        return;
      }
    }

    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        ...formData,
        contract_value: parseFloat(formData.contract_value) || 0,
        loyalty_months: parseInt(formData.loyalty_months) || 0,
        sale_type: formData.sale_type || null,
        energy_type: formData.energy_type || null,
        cpe: formData.cpe || null,
        potencia: formData.potencia || null,
        cui: formData.cui || null,
        escalao: formData.escalao || null
      };

      await axios.post(`${API}/sales`, payload, { headers });
      toast.success("Venda criada com sucesso");
      navigate("/sales");
    } catch (error) {
      const message = error.response?.data?.detail || "Erro ao guardar venda";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Show sale_type only for energia and telecomunicacoes
  const showSaleType = formData.category === "energia" || formData.category === "telecomunicacoes";
  
  // Energy fields
  const showEnergyFields = formData.category === "energia";
  const showElectricityFields = formData.energy_type === "eletricidade" || formData.energy_type === "dual";
  const showGasFields = formData.energy_type === "gas" || formData.energy_type === "dual";

  if (loadingPartners) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="card-leiritrix">
          <CardContent className="p-8 text-center">
            <p className="text-white/70 mb-4">Não existem parceiros registados.</p>
            <p className="text-white/50 text-sm mb-6">É necessário criar pelo menos um parceiro antes de registar vendas.</p>
            <Button
              onClick={() => navigate("/partners")}
              className="btn-primary btn-primary-glow"
            >
              Criar Parceiro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="sale-form-page">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-white font-['Manrope']">Nova Venda</h1>
          <p className="text-white/50 text-sm mt-1">Preencha os dados para registar uma nova venda</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} data-testid="sale-form">
        {/* Client Data */}
        <Card className="card-leiritrix">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
              <User size={20} className="text-[#c8f31d]" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="client_name" className="form-label">Nome do Cliente *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleChange("client_name", e.target.value)}
                  className="form-input"
                  placeholder="Nome completo"
                  data-testid="client-name-input"
                />
              </div>
              
              <div>
                <Label htmlFor="client_nif" className="form-label">NIF</Label>
                <Input
                  id="client_nif"
                  value={formData.client_nif}
                  onChange={(e) => handleChange("client_nif", e.target.value)}
                  className="form-input"
                  placeholder="123456789"
                  data-testid="client-nif-input"
                />
              </div>

              <div>
                <Label htmlFor="client_email" className="form-label">Email *</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleChange("client_email", e.target.value)}
                  className="form-input"
                  placeholder="cliente@email.pt"
                  data-testid="client-email-input"
                />
              </div>

              <div>
                <Label htmlFor="client_phone" className="form-label">Telefone *</Label>
                <Input
                  id="client_phone"
                  value={formData.client_phone}
                  onChange={(e) => handleChange("client_phone", e.target.value)}
                  className="form-input"
                  placeholder="912 345 678"
                  data-testid="client-phone-input"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="client_address" className="form-label">Morada</Label>
                <Input
                  id="client_address"
                  value={formData.client_address}
                  onChange={(e) => handleChange("client_address", e.target.value)}
                  className="form-input"
                  placeholder="Rua, número, código postal, cidade"
                  data-testid="client-address-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Data */}
        <Card className="card-leiritrix mt-6">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
              <FileText size={20} className="text-[#c8f31d]" />
              Dados do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="category" className="form-label">Categoria *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => {
                    handleChange("category", v);
                    if (v === "paineis_solares") {
                      handleChange("sale_type", "");
                      handleChange("energy_type", "");
                    }
                    if (v !== "energia") {
                      handleChange("energy_type", "");
                      handleChange("cpe", "");
                      handleChange("potencia", "");
                      handleChange("cui", "");
                      handleChange("escalao", "");
                    }
                  }}
                >
                  <SelectTrigger className="form-input" data-testid="category-select">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-white/10">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showSaleType && (
                <div>
                  <Label htmlFor="sale_type" className="form-label">Tipo de Venda</Label>
                  <Select value={formData.sale_type} onValueChange={(v) => handleChange("sale_type", v)}>
                    <SelectTrigger className="form-input" data-testid="sale-type-select">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10">
                      {SALE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="partner_id" className="form-label">Parceiro *</Label>
                <Select value={formData.partner_id} onValueChange={(v) => handleChange("partner_id", v)}>
                  <SelectTrigger className="form-input" data-testid="partner-select">
                    <SelectValue placeholder="Selecione o parceiro" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id} className="text-white hover:bg-white/10">
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contract_value" className="form-label">Valor do Contrato (€)</Label>
                <Input
                  id="contract_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.contract_value}
                  onChange={(e) => handleChange("contract_value", e.target.value)}
                  className="form-input"
                  placeholder="0.00"
                  data-testid="contract-value-input"
                />
              </div>

              <div>
                <Label htmlFor="loyalty_months" className="form-label">Prazo de Fidelização (meses)</Label>
                <Input
                  id="loyalty_months"
                  type="number"
                  min="0"
                  value={formData.loyalty_months}
                  onChange={(e) => handleChange("loyalty_months", e.target.value)}
                  className="form-input"
                  placeholder="24"
                  data-testid="loyalty-months-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Energy Specific Fields */}
        {showEnergyFields && (
          <Card className="card-leiritrix mt-6">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
                <Zap size={20} className="text-[#c8f31d]" />
                Dados de Energia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="energy_type" className="form-label">Tipo de Energia *</Label>
                  <Select value={formData.energy_type} onValueChange={(v) => handleChange("energy_type", v)}>
                    <SelectTrigger className="form-input" data-testid="energy-type-select">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10">
                      {ENERGY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Electricity fields */}
                {showElectricityFields && (
                  <>
                    <div>
                      <Label htmlFor="cpe" className="form-label">CPE *</Label>
                      <Input
                        id="cpe"
                        value={formData.cpe}
                        onChange={(e) => handleChange("cpe", e.target.value)}
                        className="form-input"
                        placeholder="PT0002..."
                        data-testid="cpe-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="potencia" className="form-label">Potência (kVA) *</Label>
                      <Select value={formData.potencia} onValueChange={(v) => handleChange("potencia", v)}>
                        <SelectTrigger className="form-input" data-testid="potencia-select">
                          <SelectValue placeholder="Selecione a potência" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#082d32] border-white/10 max-h-60">
                          {POTENCIAS.map((pot) => (
                            <SelectItem key={pot} value={pot} className="text-white hover:bg-white/10">
                              {pot} {pot !== "Outra" && "kVA"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Gas fields */}
                {showGasFields && (
                  <>
                    <div>
                      <Label htmlFor="cui" className="form-label">CUI *</Label>
                      <Input
                        id="cui"
                        value={formData.cui}
                        onChange={(e) => handleChange("cui", e.target.value)}
                        className="form-input"
                        placeholder="CUI do ponto de entrega"
                        data-testid="cui-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="escalao" className="form-label">Escalão *</Label>
                      <Select value={formData.escalao} onValueChange={(v) => handleChange("escalao", v)}>
                        <SelectTrigger className="form-input" data-testid="escalao-select">
                          <SelectValue placeholder="Selecione o escalão" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#082d32] border-white/10">
                          {ESCALOES_GAS.map((esc) => (
                            <SelectItem key={esc} value={esc} className="text-white hover:bg-white/10">
                              {esc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card className="card-leiritrix mt-6">
          <CardContent className="pt-6">
            <Label htmlFor="notes" className="form-label">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="form-input min-h-24"
              placeholder="Observações adicionais..."
              data-testid="notes-input"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="btn-secondary"
            data-testid="cancel-btn"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="btn-primary btn-primary-glow"
            data-testid="submit-btn"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Criar Venda
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
