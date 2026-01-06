import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useNavigate, useSearchParams } from "react-router-dom";
import { salesService } from "@/services/salesService";
import { partnersService } from "@/services/partnersService";
import { operatorsService } from "@/services/operatorsService";
import { usersService } from "@/services/usersService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateSelect } from "@/components/ui/date-select";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, User, FileText, Zap, ArrowRight, MapPin } from "lucide-react";

const CATEGORIES = [
  { value: "energia", label: "Energia" },
  { value: "telecomunicacoes", label: "Telecomunicações" },
  { value: "paineis_solares", label: "Painéis Solares" }
];

const SALE_TYPES = [
  { value: "nova_instalacao", label: "Nova Instalação" },
  { value: "mudanca_casa", label: "Mudança de Casa" },
  { value: "refid", label: "Refid (Renovação)" }
];

const ENERGY_TYPES = [
  { value: "eletricidade", label: "Eletricidade" },
  { value: "gas", label: "Gás" },
  { value: "dual", label: "Dual (Eletricidade + Gás)" }
];

const ENERGY_TYPE_MAP = {
  eletricidade: "Eletricidade",
  gas: "Gás",
  dual: "Dual (Eletricidade + Gás)"
};

const POTENCIAS = [
  "1.15", "2.3", "3.45", "4.6", "5.75", "6.9", "10.35", "13.8",
  "17.25", "20.7", "27.6", "34.5", "41.4", "Outra"
];

const ESCALOES_GAS = [
  "Escalão 1", "Escalão 2", "Escalão 3", "Escalão 4"
];

export default function SaleForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [checkingNIF, setCheckingNIF] = useState(false);
  const [partners, setPartners] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loadingOperators, setLoadingOperators] = useState(false);

  const [nifInput, setNifInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [previousSales, setPreviousSales] = useState([]);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [selectedSaleFlow, setSelectedSaleFlow] = useState(null);
  const [selectedPreviousAddress, setSelectedPreviousAddress] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    client_nif: "",
    street_address: "",
    postal_code: "",
    city: "",
    category: "",
    sale_type: "",
    partner_id: "",
    operator_id: "",
    seller_id: "none",
    contract_value: "",
    loyalty_months: "",
    notes: "",
    energy_type: "",
    cpe: "",
    potencia: "",
    cui: "",
    escalao: "",
    sale_date: new Date()
  });

  useEffect(() => {
    fetchPartners();
    fetchSellers();
  }, []);

  const fetchPartners = async () => {
    try {
      const partnersData = await partnersService.getPartners();
      setPartners(partnersData);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Erro ao carregar parceiros");
    } finally {
      setLoadingPartners(false);
    }
  };

  const fetchSellers = async () => {
    try {
      const sellersData = await usersService.getUsersByRole("vendedor");
      setSellers(sellersData);
    } catch (error) {
      console.error("Error fetching sellers:", error);
    }
  };

  const fetchOperators = async (partnerId) => {
    if (!partnerId) {
      setOperators([]);
      return;
    }
    setLoadingOperators(true);
    try {
      const operatorsData = await operatorsService.getOperatorsByPartner(partnerId);
      setOperators(operatorsData);
    } catch (error) {
      console.error("Error fetching operators:", error);
      toast.error("Erro ao carregar operadoras");
    } finally {
      setLoadingOperators(false);
    }
  };

  const getFilteredOperators = () => {
    if (!formData.category) return operators;

    const requiredCategories = [];

    if (formData.category === 'energia') {
      if (formData.energy_type === 'eletricidade') {
        requiredCategories.push('energia_eletricidade');
      } else if (formData.energy_type === 'gas') {
        requiredCategories.push('energia_gas');
      } else if (formData.energy_type === 'dual') {
        requiredCategories.push('energia_eletricidade', 'energia_gas');
      }
    } else if (formData.category === 'telecomunicacoes') {
      requiredCategories.push('telecomunicacoes');
    } else if (formData.category === 'paineis_solares') {
      requiredCategories.push('paineis_solares');
    }

    if (requiredCategories.length === 0) return [];

    const filtered = operators.filter(op => {
      if (!op.categories || op.categories.length === 0) return false;

      if (formData.category === 'energia' && formData.energy_type === 'dual') {
        return requiredCategories.every(cat => op.categories.includes(cat));
      }

      return requiredCategories.some(cat => op.categories.includes(cat));
    });

    return filtered;
  };

  useEffect(() => {
    if (formData.partner_id) {
      fetchOperators(formData.partner_id);
    } else {
      setOperators([]);
      handleChange("operator_id", "");
    }
  }, [formData.partner_id]);

  useEffect(() => {
    const filtered = getFilteredOperators();
    const currentOperatorStillValid = filtered.some(op => op.id === formData.operator_id);
    if (!currentOperatorStillValid && formData.operator_id) {
      handleChange("operator_id", "");
    }
  }, [formData.category, formData.energy_type]);

  const handleCheckNIF = async () => {
    if (!nifInput) {
      toast.error("Insira um NIF");
      return;
    }

    if (nifInput.length !== 9 || !/^\d+$/.test(nifInput)) {
      toast.error("O NIF deve ter 9 dígitos numéricos");
      return;
    }

    setCheckingNIF(true);
    try {
      const sales = await salesService.getSalesByNIF(nifInput);
      setPreviousSales(sales);

      if (sales.length > 0) {
        setShowTypeDialog(true);
      } else {
        handleChange("client_nif", nifInput);
        setShowForm(true);
      }
    } catch (error) {
      console.error("Error checking NIF:", error);
      toast.error("Erro ao verificar NIF");
    } finally {
      setCheckingNIF(false);
    }
  };

  const handleSaleTypeSelection = (type) => {
    setSelectedSaleFlow(type);
    setShowTypeDialog(false);

    if (type === "nova") {
      handleNovaVenda();
    } else if (type === "mc" || type === "refid") {
      setShowAddressDialog(true);
    }
  };

  const handleNovaVenda = () => {
    const latestSale = previousSales[0];
    setFormData({
      ...formData,
      client_name: latestSale.client_name || "",
      client_email: latestSale.client_email || "",
      client_phone: latestSale.client_phone || "",
      client_nif: nifInput,
      street_address: "",
      postal_code: "",
      city: "",
    });
    setShowForm(true);
  };

  const handleMCSelection = async (sale) => {
    setSelectedPreviousAddress(sale);
    setShowAddressDialog(false);

    const validSeller = sellers.find(s => s.id === sale.seller_id && s.active);

    setFormData({
      ...formData,
      client_name: sale.client_name || "",
      client_email: sale.client_email || "",
      client_phone: sale.client_phone || "",
      client_nif: nifInput,
      street_address: "",
      postal_code: "",
      city: "",
      category: sale.category || "",
      sale_type: "mudanca_casa",
      partner_id: sale.partner_id || "",
      operator_id: sale.operator_id || "",
      seller_id: validSeller ? sale.seller_id : "none",
      energy_type: sale.energy_type || "",
    });

    try {
      await salesService.updateSale(sale.id, { loyalty_months: 0 });
    } catch (error) {
      console.error("Error updating previous sale loyalty:", error);
    }

    setShowForm(true);
  };

  const handleRefidSelection = async (sale) => {
    setSelectedPreviousAddress(sale);
    setShowAddressDialog(false);

    const validSeller = sellers.find(s => s.id === sale.seller_id && s.active);

    setFormData({
      ...formData,
      client_name: sale.client_name || "",
      client_email: sale.client_email || "",
      client_phone: sale.client_phone || "",
      client_nif: nifInput,
      street_address: sale.street_address || "",
      postal_code: sale.postal_code || "",
      city: sale.city || "",
      category: sale.category || "",
      sale_type: "refid",
      partner_id: sale.partner_id || "",
      operator_id: sale.operator_id || "",
      seller_id: validSeller ? sale.seller_id : "none",
      energy_type: sale.energy_type || "",
      cpe: sale.cpe || "",
      potencia: sale.potencia || "",
      cui: sale.cui || "",
      escalao: sale.escalao || "",
    });

    try {
      await salesService.updateSale(sale.id, { loyalty_months: 0 });
    } catch (error) {
      console.error("Error updating previous sale loyalty:", error);
    }

    setShowForm(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_name || !formData.category || !formData.partner_id) {
      toast.error("Preencha os campos obrigatórios (Nome, Categoria, Parceiro)");
      return;
    }

    if (!formData.operator_id) {
      toast.error("Selecione uma operadora");
      return;
    }

    if (!formData.client_phone && !formData.client_email) {
      toast.error("Preencha pelo menos um contacto (telefone ou email)");
      return;
    }

    if (!formData.client_nif) {
      toast.error("O NIF é obrigatório");
      return;
    }

    if (formData.client_nif.length !== 9 || !/^\d+$/.test(formData.client_nif)) {
      toast.error("O NIF deve ter 9 dígitos numéricos");
      return;
    }

    if (!formData.street_address || !formData.postal_code || !formData.city) {
      toast.error("Todos os campos de morada são obrigatórios (Rua, Código Postal, Localidade)");
      return;
    }

    if (!/^\d{4}-\d{3}$/.test(formData.postal_code)) {
      toast.error("Código postal deve estar no formato 0000-000");
      return;
    }

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
      const payload = {
        ...formData,
        seller_id: formData.seller_id === "none" ? null : formData.seller_id,
        status: 'em_negociacao',
        contract_value: parseFloat(formData.contract_value) || 0,
        loyalty_months: parseInt(formData.loyalty_months) || 0,
        sale_type: formData.sale_type || null,
        energy_type: formData.energy_type || null,
        cpe: formData.cpe || null,
        potencia: formData.potencia || null,
        cui: formData.cui || null,
        escalao: formData.escalao || null,
        sale_date: formData.sale_date ? formData.sale_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };

      await salesService.createSale(payload);
      toast.success("Venda criada com sucesso");
      navigate("/sales");
    } catch (error) {
      const message = error.message || "Erro ao guardar venda";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const showSaleType = formData.category === "energia" || formData.category === "telecomunicacoes";
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

  if (!showForm) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white font-['Manrope']">Nova Venda</h1>
            <p className="text-white/50 text-sm mt-1">Insira o NIF do cliente para começar</p>
          </div>
        </div>

        <Card className="card-leiritrix">
          <CardContent className="p-8">
            <Label htmlFor="nif_input" className="form-label text-lg mb-4 block">NIF do Cliente</Label>
            <div className="flex gap-3">
              <Input
                id="nif_input"
                value={nifInput}
                onChange={(e) => setNifInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheckNIF()}
                className="form-input text-lg"
                placeholder="123456789"
                maxLength={9}
                autoFocus
              />
              <Button
                onClick={handleCheckNIF}
                disabled={checkingNIF}
                className="btn-primary btn-primary-glow px-8"
              >
                {checkingNIF ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <ArrowRight size={20} />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
          <DialogContent className="bg-[#082d32] border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white font-['Manrope'] text-xl">Cliente Existente</DialogTitle>
              <DialogDescription className="text-white/70">
                Encontrámos {previousSales.length} venda(s) para este NIF. Que tipo de venda deseja registar?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <Button
                onClick={() => handleSaleTypeSelection("nova")}
                className="w-full bg-[#c8f31d] hover:bg-[#b5db1a] text-[#031819] font-['Manrope'] font-semibold py-6"
              >
                Nova Venda
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("mc")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-['Manrope'] font-semibold py-6"
              >
                MC (Mudança de Casa)
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("refid")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-['Manrope'] font-semibold py-6"
              >
                Refid (Refidelização)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
          <DialogContent className="bg-[#082d32] border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white font-['Manrope'] text-xl flex items-center gap-2">
                <MapPin className="text-[#c8f31d]" size={24} />
                Selecione a Morada Original
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Escolha a morada da venda anterior que deseja {selectedSaleFlow === "mc" ? "mudar" : "refidelizar"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {previousSales.map((sale) => (
                <Card
                  key={sale.id}
                  className="card-leiritrix cursor-pointer hover:border-[#c8f31d]/50 transition-colors"
                  onClick={() => selectedSaleFlow === "mc" ? handleMCSelection(sale) : handleRefidSelection(sale)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-['Manrope'] font-semibold">
                          {sale.street_address}
                        </p>
                        <p className="text-white/60 text-sm">
                          {sale.postal_code} {sale.city}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-white/50">
                          <span>{sale.operators?.name || "Sem operadora"}</span>
                          <span>{sale.category}</span>
                          {sale.loyalty_months > 0 && (
                            <span className="text-orange-400">
                              {sale.loyalty_months} meses fidelização
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-[#c8f31d]" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
          <AlertDialogContent className="bg-[#082d32] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white font-['Manrope']">Atenção</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                {alertMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/10 text-white hover:bg-white/20">OK</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="sale-form-page">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => {
            setShowForm(false);
            setNifInput("");
            setPreviousSales([]);
            setFormData({
              client_name: "",
              client_email: "",
              client_phone: "",
              client_nif: "",
              street_address: "",
              postal_code: "",
              city: "",
              category: "",
              sale_type: "",
              partner_id: "",
              operator_id: "",
              seller_id: "none",
              contract_value: "",
              loyalty_months: "",
              notes: "",
              energy_type: "",
              cpe: "",
              potencia: "",
              cui: "",
              escalao: "",
              sale_date: new Date()
            });
          }}
          className="text-white/70 hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white font-['Manrope']">Nova Venda</h1>
          <p className="text-white/50 text-sm mt-1">NIF: {formData.client_nif}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} data-testid="sale-form">
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
                <Label htmlFor="client_email" className="form-label">Email</Label>
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
                <Label htmlFor="client_phone" className="form-label">Telefone</Label>
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
                <Label htmlFor="street_address" className="form-label">Rua e Número *</Label>
                <Input
                  id="street_address"
                  value={formData.street_address}
                  onChange={(e) => handleChange("street_address", e.target.value)}
                  className="form-input"
                  placeholder="Rua das Flores, nº 123, 2º Esq"
                  data-testid="street-address-input"
                />
              </div>

              <div>
                <Label htmlFor="postal_code" className="form-label">Código Postal *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                  className="form-input"
                  placeholder="1000-100"
                  maxLength={8}
                  data-testid="postal-code-input"
                />
              </div>

              <div>
                <Label htmlFor="city" className="form-label">Localidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="form-input"
                  placeholder="Lisboa"
                  data-testid="city-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-leiritrix mt-6">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
              <FileText size={20} className="text-[#c8f31d]" />
              Dados do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="sale_date" className="form-label">Data de Venda *</Label>
                <DateSelect
                  value={formData.sale_date}
                  onChange={(date) => handleChange("sale_date", date)}
                  placeholder="Selecionar data"
                  maxDate={new Date()}
                  data-testid="sale-date-select"
                />
                <p className="text-white/40 text-xs mt-1">
                  Esta data será usada para contabilizar comissões e mensalidades no respetivo mês
                </p>
              </div>

              <div className="md:col-span-2">
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

              {showEnergyFields && (
                <div className="md:col-span-2 p-4 bg-[#c8f31d]/5 border border-[#c8f31d]/20 rounded-lg">
                  <Label htmlFor="energy_type" className="form-label flex items-center gap-2">
                    <Zap size={16} className="text-[#c8f31d]" />
                    Tipo de Energia * (selecione para ver as operadoras disponíveis)
                  </Label>
                  <Select value={formData.energy_type} onValueChange={(v) => handleChange("energy_type", v)}>
                    <SelectTrigger className="form-input mt-2" data-testid="energy-type-select">
                      <SelectValue placeholder="Selecione o tipo de energia" />
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
              )}

              {showSaleType && (
                <div className="md:col-span-2">
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
                <Label htmlFor="operator_id" className="form-label">Operadora *</Label>
                <Select
                  value={formData.operator_id}
                  onValueChange={(v) => handleChange("operator_id", v)}
                  disabled={!formData.partner_id || loadingOperators || !formData.category || (formData.category === 'energia' && !formData.energy_type)}
                >
                  <SelectTrigger className="form-input" data-testid="operator-select">
                    <SelectValue placeholder={
                      !formData.partner_id
                        ? "Selecione primeiro um parceiro"
                        : !formData.category
                        ? "Selecione primeiro a categoria"
                        : (formData.category === 'energia' && !formData.energy_type)
                        ? "Selecione o tipo de energia acima"
                        : loadingOperators
                        ? "A carregar operadoras..."
                        : getFilteredOperators().length === 0
                        ? "Sem operadoras disponíveis"
                        : "Selecione a operadora"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {getFilteredOperators().map((operator) => (
                      <SelectItem key={operator.id} value={operator.id} className="text-white hover:bg-white/10">
                        {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.partner_id && formData.category && (formData.category !== 'energia' || formData.energy_type) && getFilteredOperators().length === 0 && !loadingOperators && (
                  <p className="text-orange-400 text-xs mt-1">
                    Este parceiro não tem operadoras para esta categoria.
                  </p>
                )}
              </div>

              {sellers.length > 0 && (
                <div>
                  <Label htmlFor="seller_id" className="form-label">Vendedor</Label>
                  <Select value={formData.seller_id} onValueChange={(v) => handleChange("seller_id", v)}>
                    <SelectTrigger className="form-input" data-testid="seller-select">
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10">
                      <SelectItem value="none" className="text-white hover:bg-white/10">
                        Nenhum
                      </SelectItem>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id} className="text-white hover:bg-white/10">
                          {seller.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.category === "telecomunicacoes" && (
                <div>
                  <Label htmlFor="contract_value" className="form-label">Mensalidade Contratada (€)</Label>
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
              )}

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

        {showEnergyFields && formData.energy_type && (
          <Card className="card-leiritrix mt-6">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
                <Zap size={20} className="text-[#c8f31d]" />
                Detalhes de Energia ({ENERGY_TYPE_MAP[formData.energy_type]})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowForm(false);
              setNifInput("");
              setPreviousSales([]);
            }}
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

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="bg-[#082d32] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-['Manrope']">Atenção</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              {alertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white hover:bg-white/20">OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
