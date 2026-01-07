import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useNavigate, useSearchParams } from "react-router-dom";
import { salesService } from "@/services/salesService";
import { partnersService } from "@/services/partnersService";
import { operatorsService } from "@/services/operatorsService";
import { usersService } from "@/services/usersService";
import { commissionsService } from "@/services/commissionsService";
import { operatorClientCategoriesService } from "@/services/operatorClientCategoriesService";
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
import { ArrowLeft, Save, Loader2, User, FileText, Zap, ArrowRight, MapPin, Sun } from "lucide-react";

const CATEGORIES = [
  { value: "energia", label: "Energia" },
  { value: "telecomunicacoes", label: "Telecomunicações" },
  { value: "paineis_solares", label: "Painéis Solares" }
];

const SALE_TYPES = [
  { value: "NI", label: "NI (Nova Instalação)" },
  { value: "MC", label: "MC (Mudança de Casa)" },
  { value: "Refid", label: "Refid (Refidelização)" },
  { value: "Refid_Acrescimo", label: "Refid com Acréscimo" },
  { value: "Refid_Decrescimo", label: "Refid com Decréscimo" },
  { value: "Up_sell", label: "Up-sell" },
  { value: "Cross_sell", label: "Cross-sell" }
];

const LOYALTY_OPTIONS = [
  { value: "0", label: "Sem fidelização" },
  { value: "12", label: "12 meses" },
  { value: "24", label: "24 meses" },
  { value: "36", label: "36 meses" },
  { value: "outra", label: "Outra" }
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
  const [clientCategories, setClientCategories] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState(null);
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
  const [commissionType, setCommissionType] = useState("automatic");
  const [calculatingCommission, setCalculatingCommission] = useState(false);
  const [availableSaleTypes, setAvailableSaleTypes] = useState(SALE_TYPES);

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
    client_category_id: "",
    seller_id: "none",
    contract_value: "",
    loyalty_months: "",
    custom_loyalty_months: "",
    notes: "",
    energy_type: "",
    cpe: "",
    potencia: "",
    cui: "",
    escalao: "",
    sale_date: new Date(),
    previous_monthly_value: "",
    new_monthly_value: "",
    commission_seller: "",
    commission_partner: "",
    client_type: "",
    portfolio_status: ""
  });

  useEffect(() => {
    fetchPartners();
    fetchSellers();
    fetchOperators();
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

  const fetchOperators = async () => {
    setLoadingOperators(true);
    try {
      const operatorsData = await operatorsService.getOperators();
      setOperators(operatorsData);
    } catch (error) {
      console.error("Error fetching operators:", error);
      toast.error("Erro ao carregar operadoras");
    } finally {
      setLoadingOperators(false);
    }
  };

  const fetchPartnersByOperator = async (operatorId) => {
    if (!operatorId) {
      return [];
    }
    try {
      const allPartners = await partnersService.getPartners();
      const filteredPartners = allPartners.filter(partner => {
        return partner.partner_operators && partner.partner_operators.some(po => po.operator_id === operatorId);
      });
      return filteredPartners;
    } catch (error) {
      console.error("Error fetching partners by operator:", error);
      return [];
    }
  };

  const getFilteredPartners = () => {
    if (!formData.operator_id) return partners;
    return partners.filter(partner => {
      return partner.partner_operators && partner.partner_operators.some(po => po.operator_id === formData.operator_id);
    });
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
    if (formData.operator_id) {
      fetchPartnersByOperator(formData.operator_id).then(filteredPartners => {
        if (formData.partner_id && !filteredPartners.some(p => p.id === formData.partner_id)) {
          handleChange("partner_id", "");
        }
      });

      const operator = operators.find(op => op.id === formData.operator_id);
      if (operator?.allowed_sale_types && operator.allowed_sale_types.length > 0) {
        const filtered = SALE_TYPES.filter(st => operator.allowed_sale_types.includes(st.value));
        setAvailableSaleTypes(filtered);
      } else {
        setAvailableSaleTypes(SALE_TYPES);
      }
    }
  }, [formData.operator_id, operators]);

  useEffect(() => {
    const filtered = getFilteredOperators();
    const currentOperatorStillValid = filtered.some(op => op.id === formData.operator_id);
    if (!currentOperatorStillValid && formData.operator_id) {
      handleChange("operator_id", "");
    }
  }, [formData.category, formData.energy_type]);

  useEffect(() => {
    if (formData.operator_id && formData.partner_id) {
      checkCommissionType();
    }
  }, [formData.operator_id, formData.partner_id]);

  useEffect(() => {
    if (commissionType === "automatic" && shouldCalculateCommission()) {
      calculateCommission();
    }
  }, [
    formData.sale_type,
    formData.contract_value,
    formData.loyalty_months,
    formData.custom_loyalty_months,
    formData.potencia,
    commissionType
  ]);

  const checkCommissionType = async () => {
    try {
      const settings = await commissionsService.getOperatorSettings(
        formData.operator_id,
        formData.partner_id
      );

      if (settings && settings.length > 0) {
        const setting = settings.find(s => s.partner_id === formData.partner_id) || settings[0];
        setCommissionType(setting.commission_type);

        if (setting.allowed_sale_types && setting.allowed_sale_types.length > 0) {
          const filtered = SALE_TYPES.filter(st => setting.allowed_sale_types.includes(st.value));
          setAvailableSaleTypes(filtered);
        } else {
          setAvailableSaleTypes(SALE_TYPES);
        }

        if (setting.commission_type === "automatic") {
          calculateCommission();
        }
      } else {
        setCommissionType("manual");
        setAvailableSaleTypes(SALE_TYPES);
      }
    } catch (error) {
      console.error("Error checking commission type:", error);
      setCommissionType("manual");
      setAvailableSaleTypes(SALE_TYPES);
    }
  };

  const shouldCalculateCommission = () => {
    if (!formData.sale_type || !formData.operator_id || !formData.partner_id) {
      return false;
    }

    if (['Up_sell', 'Cross_sell'].includes(formData.sale_type)) {
      return formData.previous_monthly_value && formData.new_monthly_value;
    }

    return formData.contract_value;
  };

  const calculateCommission = async () => {
    if (!shouldCalculateCommission()) return;

    setCalculatingCommission(true);
    try {
      const loyaltyMonths = formData.loyalty_months === "outra"
        ? parseInt(formData.custom_loyalty_months) || 0
        : parseInt(formData.loyalty_months) || 0;

      const rule = await commissionsService.findApplicableRule({
        operatorId: formData.operator_id,
        partnerId: formData.partner_id,
        saleType: formData.sale_type,
        clientNif: formData.client_nif,
        loyaltyMonths: loyaltyMonths,
        clientCategoryId: formData.client_category_id,
        clientType: formData.client_type,
        portfolioStatus: formData.portfolio_status
      });

      if (!rule || rule.isManual) {
        setCommissionType("manual");
        return;
      }

      const commissions = await commissionsService.calculateCommission({
        rule,
        monthlyValue: parseFloat(formData.contract_value) || 0,
        previousMonthlyValue: parseFloat(formData.previous_monthly_value) || 0,
        newMonthlyValue: parseFloat(formData.new_monthly_value) || 0,
        saleType: formData.sale_type,
        quantity: 1,
        potencia: formData.potencia
      });

      if (['Up_sell', 'Cross_sell'].includes(formData.sale_type)) {
        const previousValue = parseFloat(formData.previous_monthly_value) || 0;
        const newValue = parseFloat(formData.new_monthly_value) || 0;

        if (previousValue >= newValue) {
          setAlertMessage(
            "Atenção: A mensalidade anterior é superior ou igual à nova mensalidade. " +
            "A comissão foi definida como 0. Pode alterar manualmente se necessário."
          );
          setShowAlert(true);
          setFormData(prev => ({
            ...prev,
            commission_seller: "0",
            commission_partner: "0"
          }));
          return;
        }
      }

      setFormData(prev => ({
        ...prev,
        commission_seller: commissions.seller.toString(),
        commission_partner: commissions.partner.toString()
      }));

    } catch (error) {
      console.error("Error calculating commission:", error);
    } finally {
      setCalculatingCommission(false);
    }
  };

  const handleMonthlyValueBlur = () => {
    if (!['Up_sell', 'Cross_sell'].includes(formData.sale_type)) {
      return;
    }

    const previousValue = parseFloat(formData.previous_monthly_value);
    const newValue = parseFloat(formData.new_monthly_value);

    if (!formData.previous_monthly_value || !formData.new_monthly_value) {
      return;
    }

    if (isNaN(previousValue) || isNaN(newValue)) {
      return;
    }

    if (commissionType === "automatic") {
      calculateCommission();
    }
  };

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

    if (type === "NI") {
      handleNovaVenda();
    } else {
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

    const newFormData = {
      ...formData,
      client_name: sale.client_name || "",
      client_email: sale.client_email || "",
      client_phone: sale.client_phone || "",
      client_nif: nifInput,
      category: sale.category || "",
      sale_type: selectedSaleFlow,
      partner_id: sale.partner_id || "",
      operator_id: sale.operator_id || "",
      seller_id: validSeller ? sale.seller_id : "none",
      energy_type: sale.energy_type || "",
    };

    if (selectedSaleFlow === "MC") {
      newFormData.street_address = "";
      newFormData.postal_code = "";
      newFormData.city = "";

      try {
        await salesService.updateSale(sale.id, { loyalty_months: 0 });
      } catch (error) {
        console.error("Error updating previous sale loyalty:", error);
      }
    } else {
      newFormData.street_address = sale.street_address || "";
      newFormData.postal_code = sale.postal_code || "";
      newFormData.city = sale.city || "";

      if (selectedSaleFlow.startsWith('Refid') || ['Up_sell', 'Cross_sell'].includes(selectedSaleFlow)) {
        newFormData.cpe = sale.cpe || "";
        newFormData.potencia = sale.potencia || "";
        newFormData.cui = sale.cui || "";
        newFormData.escalao = sale.escalao || "";

        try {
          await salesService.updateSale(sale.id, { loyalty_months: 0 });
        } catch (error) {
          console.error("Error updating previous sale loyalty:", error);
        }
      }

      if (['Up_sell', 'Cross_sell'].includes(selectedSaleFlow)) {
        newFormData.previous_monthly_value = sale.contract_value || "";
      }
    }

    setFormData(newFormData);
    setShowForm(true);
  };

  const handleRefidSelection = handleMCSelection;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOperatorChange = async (operatorId) => {
    setFormData(prev => ({ ...prev, operator_id: operatorId, client_category_id: "" }));

    const operator = operators.find(o => o.id === operatorId);
    setSelectedOperator(operator);

    if (operator?.has_client_categories) {
      try {
        const categories = await operatorClientCategoriesService.getCategories(operatorId);
        setClientCategories(categories);
      } catch (error) {
        console.error("Error fetching client categories:", error);
        setClientCategories([]);
      }
    } else {
      setClientCategories([]);
    }
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

    if (selectedOperator?.has_client_categories && !formData.client_category_id) {
      toast.error("Selecione a categoria de cliente");
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

    if (['Up_sell', 'Cross_sell'].includes(formData.sale_type)) {
      if (!formData.previous_monthly_value || !formData.new_monthly_value) {
        toast.error("Mensalidade anterior e nova são obrigatórias para Up-sell e Cross-sell");
        return;
      }
    }

    if (formData.loyalty_months === "outra" && !formData.custom_loyalty_months) {
      toast.error("Insira o prazo de fidelização personalizado");
      return;
    }

    setLoading(true);

    try {
      const finalLoyaltyMonths = formData.loyalty_months === "outra"
        ? parseInt(formData.custom_loyalty_months) || 0
        : parseInt(formData.loyalty_months) || 0;

      const payload = {
        ...formData,
        seller_id: formData.seller_id === "none" ? null : formData.seller_id,
        status: 'em_negociacao',
        contract_value: ['Up_sell', 'Cross_sell'].includes(formData.sale_type)
          ? parseFloat(formData.new_monthly_value) || 0
          : parseFloat(formData.contract_value) || 0,
        loyalty_months: finalLoyaltyMonths,
        custom_loyalty_months: formData.loyalty_months === "outra" ? parseInt(formData.custom_loyalty_months) || null : null,
        sale_type: formData.sale_type || null,
        energy_type: formData.energy_type || null,
        cpe: formData.cpe || null,
        potencia: formData.potencia || null,
        cui: formData.cui || null,
        escalao: formData.escalao || null,
        previous_monthly_value: ['Up_sell', 'Cross_sell'].includes(formData.sale_type)
          ? parseFloat(formData.previous_monthly_value) || 0
          : 0,
        new_monthly_value: ['Up_sell', 'Cross_sell'].includes(formData.sale_type)
          ? parseFloat(formData.new_monthly_value) || 0
          : 0,
        commission_seller: parseFloat(formData.commission_seller) || 0,
        commission_partner: parseFloat(formData.commission_partner) || 0,
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
  const showSolarFields = formData.category === "paineis_solares";

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
                onClick={() => handleSaleTypeSelection("NI")}
                className="w-full bg-[#c8f31d] hover:bg-[#b5db1a] text-[#031819] font-['Manrope'] font-semibold py-6"
              >
                NI (Nova Instalação)
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("MC")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-['Manrope'] font-semibold py-6"
              >
                MC (Mudança de Casa)
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("Refid")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-['Manrope'] font-semibold py-6"
              >
                Refid (Refidelização)
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("Refid_Acrescimo")}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-['Manrope'] font-semibold py-6"
              >
                Refid com Acréscimo
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("Refid_Decrescimo")}
                className="w-full bg-purple-400 hover:bg-purple-500 text-white font-['Manrope'] font-semibold py-6"
              >
                Refid com Decréscimo
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("Up_sell")}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-['Manrope'] font-semibold py-6"
              >
                Up-sell
              </Button>
              <Button
                onClick={() => handleSaleTypeSelection("Cross_sell")}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-['Manrope'] font-semibold py-6"
              >
                Cross-sell
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
                Escolha a morada da venda anterior que deseja processar
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
              custom_loyalty_months: "",
              notes: "",
              energy_type: "",
              cpe: "",
              potencia: "",
              cui: "",
              escalao: "",
              sale_date: new Date(),
              previous_monthly_value: "",
              new_monthly_value: "",
              commission_seller: "",
              commission_partner: ""
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

              <div>
                <Label htmlFor="operator_id" className="form-label">Operadora *</Label>
                <Select
                  value={formData.operator_id}
                  onValueChange={handleOperatorChange}
                  disabled={loadingOperators || !formData.category || (formData.category === 'energia' && !formData.energy_type)}
                >
                  <SelectTrigger className="form-input" data-testid="operator-select">
                    <SelectValue placeholder={
                      !formData.category
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
                {formData.category && (formData.category !== 'energia' || formData.energy_type) && getFilteredOperators().length === 0 && !loadingOperators && (
                  <p className="text-orange-400 text-xs mt-1">
                    Não há operadoras disponíveis para esta categoria.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="partner_id" className="form-label">Parceiro *</Label>
                <Select
                  value={formData.partner_id}
                  onValueChange={(v) => handleChange("partner_id", v)}
                  disabled={!formData.operator_id}
                >
                  <SelectTrigger className="form-input" data-testid="partner-select">
                    <SelectValue placeholder={
                      !formData.operator_id
                        ? "Selecione primeiro a operadora"
                        : getFilteredPartners().length === 0
                        ? "Nenhum parceiro com esta operadora"
                        : "Selecione o parceiro"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {getFilteredPartners().map((partner) => (
                      <SelectItem key={partner.id} value={partner.id} className="text-white hover:bg-white/10">
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.operator_id && getFilteredPartners().length === 0 && (
                  <p className="text-orange-400 text-xs mt-1">
                    Nenhum parceiro trabalha com esta operadora.
                  </p>
                )}
              </div>

              {showSaleType && (
                <div className="md:col-span-2">
                  <Label htmlFor="sale_type" className="form-label">
                    Tipo de Venda
                    {availableSaleTypes.length < SALE_TYPES.length && (
                      <span className="ml-2 text-xs text-[#c8f31d]">
                        (Filtrado por operadora)
                      </span>
                    )}
                  </Label>
                  <Select value={formData.sale_type} onValueChange={(v) => handleChange("sale_type", v)}>
                    <SelectTrigger className="form-input" data-testid="sale-type-select">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10">
                      {availableSaleTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedOperator?.has_client_categories && clientCategories.length > 0 && (
                <div>
                  <Label htmlFor="client_category_id" className="form-label">Categoria de Cliente *</Label>
                  <Select
                    value={formData.client_category_id}
                    onValueChange={(v) => handleChange("client_category_id", v)}
                    disabled={!formData.operator_id}
                  >
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Selecione a categoria do cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10">
                      {clientCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="text-white hover:bg-white/10">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="client_type" className="form-label">Tipo de Cliente *</Label>
                <Select
                  value={formData.client_type}
                  onValueChange={(v) => {
                    handleChange("client_type", v);
                    if (v === "residencial") {
                      handleChange("portfolio_status", "");
                    }
                  }}
                >
                  <SelectTrigger className="form-input" data-testid="client-type-select">
                    <SelectValue placeholder="Selecione o tipo de cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    <SelectItem value="residencial" className="text-white hover:bg-white/10">
                      Residencial
                    </SelectItem>
                    <SelectItem value="empresarial" className="text-white hover:bg-white/10">
                      Empresarial
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.client_type === "empresarial" && (
                <div>
                  <Label htmlFor="portfolio_status" className="form-label">Encarteiramento *</Label>
                  <Select
                    value={formData.portfolio_status}
                    onValueChange={(v) => handleChange("portfolio_status", v)}
                  >
                    <SelectTrigger className="form-input" data-testid="portfolio-status-select">
                      <SelectValue placeholder="Selecione o encarteiramento" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10">
                      <SelectItem value="novo" className="text-white hover:bg-white/10">
                        Novo
                      </SelectItem>
                      <SelectItem value="cliente_carteira" className="text-white hover:bg-white/10">
                        Cliente de Carteira
                      </SelectItem>
                      <SelectItem value="fora_carteira" className="text-white hover:bg-white/10">
                        Fora de Carteira
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

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

              {['Up_sell', 'Cross_sell'].includes(formData.sale_type) && (
                <>
                  <div>
                    <Label htmlFor="previous_monthly_value" className="form-label">Mensalidade Anterior (€) *</Label>
                    <Input
                      id="previous_monthly_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.previous_monthly_value}
                      onChange={(e) => handleChange("previous_monthly_value", e.target.value)}
                      onBlur={handleMonthlyValueBlur}
                      className="form-input"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_monthly_value" className="form-label">Nova Mensalidade (€) *</Label>
                    <Input
                      id="new_monthly_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.new_monthly_value}
                      onChange={(e) => handleChange("new_monthly_value", e.target.value)}
                      onBlur={handleMonthlyValueBlur}
                      className="form-input"
                      placeholder="0.00"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="loyalty_months" className="form-label">Prazo de Fidelização</Label>
                <Select value={formData.loyalty_months} onValueChange={(v) => handleChange("loyalty_months", v)}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Selecione o prazo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {LOYALTY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.loyalty_months === "outra" && (
                <div>
                  <Label htmlFor="custom_loyalty_months" className="form-label">Fidelização Personalizada (meses)</Label>
                  <Input
                    id="custom_loyalty_months"
                    type="number"
                    min="0"
                    value={formData.custom_loyalty_months}
                    onChange={(e) => handleChange("custom_loyalty_months", e.target.value)}
                    className="form-input"
                    placeholder="Insira o número de meses"
                  />
                </div>
              )}

              {formData.operator_id && formData.partner_id && (
                <>
                  {sellers.length > 0 && (
                    <div>
                      <Label htmlFor="commission_seller" className="form-label">
                        Comissão Vendedor (€)
                        {commissionType === "automatic" && (
                          <span className="ml-2 text-xs text-green-400">Automático</span>
                        )}
                      </Label>
                      <Input
                        id="commission_seller"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.commission_seller}
                        onChange={(e) => handleChange("commission_seller", e.target.value)}
                        className="form-input"
                        placeholder="0.00"
                        disabled={calculatingCommission}
                        readOnly={commissionType === "automatic"}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="commission_partner" className="form-label">
                      Comissão a receber (€)
                      {commissionType === "automatic" && (
                        <span className="ml-2 text-xs text-green-400">Automático</span>
                      )}
                    </Label>
                    <Input
                      id="commission_partner"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.commission_partner}
                      onChange={(e) => handleChange("commission_partner", e.target.value)}
                      className="form-input"
                      placeholder="0.00"
                      disabled={calculatingCommission}
                      readOnly={commissionType === "automatic"}
                    />
                  </div>
                </>
              )}
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

        {showSolarFields && (
          <Card className="card-leiritrix mt-6">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
                <Sun size={20} className="text-[#c8f31d]" />
                Detalhes de Painéis Solares
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="cpe" className="form-label">CPE</Label>
                  <Input
                    id="cpe"
                    value={formData.cpe}
                    onChange={(e) => handleChange("cpe", e.target.value)}
                    className="form-input"
                    placeholder="PT0002..."
                  />
                  <p className="text-white/40 text-xs mt-1">Opcional</p>
                </div>
                <div>
                  <Label htmlFor="solar_power" className="form-label">Potência Instalada (kW)</Label>
                  <Input
                    id="solar_power"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.solar_power || ""}
                    onChange={(e) => handleChange("solar_power", e.target.value ? parseFloat(e.target.value) : null)}
                    className="form-input"
                    placeholder="0.00"
                  />
                  <p className="text-white/40 text-xs mt-1">Opcional</p>
                </div>
                <div>
                  <Label htmlFor="solar_panel_quantity" className="form-label">Quantidade de Painéis</Label>
                  <Input
                    id="solar_panel_quantity"
                    type="number"
                    min="0"
                    value={formData.solar_panel_quantity || ""}
                    onChange={(e) => handleChange("solar_panel_quantity", e.target.value ? parseInt(e.target.value) : null)}
                    className="form-input"
                    placeholder="0"
                  />
                  <p className="text-white/40 text-xs mt-1">Opcional</p>
                </div>
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
