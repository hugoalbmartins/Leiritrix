import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { commissionsService } from "@/services/commissionsService";
import { operatorsService } from "@/services/operatorsService";
import { partnersService } from "@/services/partnersService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2
} from "lucide-react";

const SALE_TYPES = [
  { value: 'NI', label: 'NI (Nova Instalação)' },
  { value: 'MC', label: 'MC (Mudança de Casa)' },
  { value: 'Refid', label: 'Refid (Refidelização)' },
  { value: 'Refid_Acrescimo', label: 'Refid com Acréscimo' },
  { value: 'Refid_Decrescimo', label: 'Refid com Decréscimo' },
  { value: 'Up_sell', label: 'Up-sell' },
  { value: 'Cross_sell', label: 'Cross-sell' }
];

const LOYALTY_PERIODS = [0, 12, 24, 36];

export default function CommissionWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const operatorIdFromQuery = searchParams.get('operator');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operators, setOperators] = useState([]);
  const [partners, setPartners] = useState([]);

  const [operatorId, setOperatorId] = useState(operatorIdFromQuery || "");
  const [partnerId, setPartnerId] = useState("");
  const [commissionType, setCommissionType] = useState("automatic");
  const [nifDifferentiation, setNifDifferentiation] = useState(false);
  const [allowedSaleTypes, setAllowedSaleTypes] = useState(['NI', 'MC', 'Refid']);
  const [rules, setRules] = useState([]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    if (id) {
      loadSetting();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [operatorsData, partnersData] = await Promise.all([
        operatorsService.getOperators(),
        partnersService.getPartners()
      ]);
      setOperators(operatorsData);
      setPartners(partnersData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadSetting = async () => {
    try {
      const setting = await commissionsService.getOperatorSettingById(id);
      const rulesData = await commissionsService.getRules(id);

      setOperatorId(setting.operator_id);
      setPartnerId(setting.partner_id || "");
      setCommissionType(setting.commission_type);
      setNifDifferentiation(setting.nif_differentiation);
      setAllowedSaleTypes(setting.allowed_sale_types || []);
      setRules(rulesData || []);
    } catch (error) {
      console.error("Error loading setting:", error);
      toast.error("Erro ao carregar configuração");
      navigate('/settings/commissions');
    }
  };

  const addRule = () => {
    setRules([...rules, {
      sale_type: 'NI',
      nif_type: 'all',
      calculation_method: 'fixed_per_quantity',
      depends_on_loyalty: false,
      loyalty_months: null,
      applies_to_seller: true,
      applies_to_partner: true,
      seller_fixed_value: 0,
      seller_monthly_multiplier: 0,
      partner_fixed_value: 0,
      partner_monthly_multiplier: 0
    }]);
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };

    if (field === 'calculation_method') {
      if (value === 'fixed_per_quantity') {
        newRules[index].seller_monthly_multiplier = 0;
        newRules[index].partner_monthly_multiplier = 0;
      } else {
        newRules[index].seller_fixed_value = 0;
        newRules[index].partner_fixed_value = 0;
      }
    }

    if (field === 'depends_on_loyalty' && !value) {
      newRules[index].loyalty_months = null;
    }

    setRules(newRules);
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const toggleSaleType = (type) => {
    if (allowedSaleTypes.includes(type)) {
      setAllowedSaleTypes(allowedSaleTypes.filter(t => t !== type));
    } else {
      setAllowedSaleTypes([...allowedSaleTypes, type]);
    }
  };

  const handleSave = async () => {
    if (!operatorId) {
      toast.error("Selecione uma operadora");
      return;
    }

    if (allowedSaleTypes.length === 0) {
      toast.error("Selecione pelo menos um tipo de venda");
      return;
    }

    if (commissionType === 'automatic' && rules.length === 0) {
      toast.error("Defina pelo menos uma regra de comissão");
      return;
    }

    setSaving(true);
    try {
      const settingData = {
        operator_id: operatorId,
        partner_id: partnerId || null,
        commission_type: commissionType,
        nif_differentiation: nifDifferentiation,
        allowed_sale_types: allowedSaleTypes
      };

      let settingId = id;

      if (id) {
        await commissionsService.updateOperatorSetting(id, settingData);
        await commissionsService.deleteRulesBySettingId(id);
      } else {
        const created = await commissionsService.createOperatorSetting(settingData);
        settingId = created.id;
      }

      if (commissionType === 'automatic') {
        for (const rule of rules) {
          await commissionsService.createRule({
            ...rule,
            setting_id: settingId
          });
        }
      }

      toast.success(id ? "Configuração atualizada com sucesso" : "Configuração criada com sucesso");
      navigate('/settings/commissions');
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao guardar configuração");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/settings/commissions')}
          className="text-white/70 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white font-['Manrope']">
            {id ? 'Editar' : 'Nova'} Configuração de Comissões
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Defina como as comissões serão calculadas
          </p>
        </div>
      </div>

      <Card className="card-leiritrix">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-white font-['Manrope'] text-lg">
            1. Operadora e Parceiro
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="form-label">Operadora *</Label>
              <Select value={operatorId} onValueChange={setOperatorId} disabled={!!id}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Selecione a operadora" />
                </SelectTrigger>
                <SelectContent className="bg-[#082d32] border-white/10">
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id} className="text-white hover:bg-white/10">
                      {op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">Parceiro (Opcional)</Label>
              <Select value={partnerId} onValueChange={setPartnerId} disabled={!!id}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Todos os parceiros" />
                </SelectTrigger>
                <SelectContent className="bg-[#082d32] border-white/10">
                  <SelectItem value="" className="text-white hover:bg-white/10">
                    Todos os parceiros
                  </SelectItem>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white hover:bg-white/10">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-white/40 text-xs mt-1">
                Deixe vazio para aplicar a todos os parceiros
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-leiritrix">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-white font-['Manrope'] text-lg">
            2. Tipo de Comissão
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label className="form-label">Método de Comissionamento *</Label>
            <Select value={commissionType} onValueChange={setCommissionType}>
              <SelectTrigger className="form-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#082d32] border-white/10">
                <SelectItem value="manual" className="text-white hover:bg-white/10">
                  Manual (Inserção manual em cada venda)
                </SelectItem>
                <SelectItem value="automatic" className="text-white hover:bg-white/10">
                  Automático (Cálculo baseado em regras)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="card-leiritrix">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-white font-['Manrope'] text-lg">
            3. Tipos de Venda Permitidos *
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SALE_TYPES.map((type) => (
              <div key={type.value} className="flex items-center gap-3">
                <Checkbox
                  id={`sale-type-${type.value}`}
                  checked={allowedSaleTypes.includes(type.value)}
                  onCheckedChange={() => toggleSaleType(type.value)}
                />
                <Label
                  htmlFor={`sale-type-${type.value}`}
                  className="text-white cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {commissionType === 'automatic' && (
        <>
          <Card className="card-leiritrix">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-white font-['Manrope'] text-lg">
                4. Diferenciação por NIF
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="nif-diff"
                  checked={nifDifferentiation}
                  onCheckedChange={setNifDifferentiation}
                />
                <Label htmlFor="nif-diff" className="text-white cursor-pointer">
                  Diferenciar comissões entre NIFs 5xx e NIFs 1/2/3xxx
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="card-leiritrix">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white font-['Manrope'] text-lg">
                  5. Regras de Comissão
                </CardTitle>
                <Button
                  onClick={addRule}
                  size="sm"
                  className="btn-primary btn-primary-glow"
                >
                  <Plus size={16} className="mr-2" />
                  Adicionar Regra
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {rules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/50 mb-4">Nenhuma regra definida</p>
                  <Button onClick={addRule} className="btn-primary btn-primary-glow">
                    <Plus size={16} className="mr-2" />
                    Adicionar Primeira Regra
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {rules.map((rule, index) => (
                    <Card key={index} className="bg-white/5 border-white/10">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-medium">Regra {index + 1}</h4>
                          <Button
                            onClick={() => removeRule(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="form-label text-sm">Tipo de Venda</Label>
                            <Select
                              value={rule.sale_type}
                              onValueChange={(v) => updateRule(index, 'sale_type', v)}
                            >
                              <SelectTrigger className="form-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#082d32] border-white/10">
                                {SALE_TYPES.filter(t => allowedSaleTypes.includes(t.value)).map((type) => (
                                  <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {nifDifferentiation && (
                            <div>
                              <Label className="form-label text-sm">Tipo de NIF</Label>
                              <Select
                                value={rule.nif_type}
                                onValueChange={(v) => updateRule(index, 'nif_type', v)}
                              >
                                <SelectTrigger className="form-input">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#082d32] border-white/10">
                                  <SelectItem value="all" className="text-white hover:bg-white/10">
                                    Todos os NIFs
                                  </SelectItem>
                                  <SelectItem value="5xx" className="text-white hover:bg-white/10">
                                    NIFs 5xx
                                  </SelectItem>
                                  <SelectItem value="123xxx" className="text-white hover:bg-white/10">
                                    NIFs 1/2/3xxx
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="md:col-span-2">
                            <Label className="form-label text-sm">Método de Cálculo</Label>
                            <Select
                              value={rule.calculation_method}
                              onValueChange={(v) => updateRule(index, 'calculation_method', v)}
                            >
                              <SelectTrigger className="form-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#082d32] border-white/10">
                                <SelectItem value="fixed_per_quantity" className="text-white hover:bg-white/10">
                                  Valor Fixo por Quantidade
                                </SelectItem>
                                <SelectItem value="monthly_multiple" className="text-white hover:bg-white/10">
                                  Múltiplo de Mensalidade
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="md:col-span-2">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`depends-loyalty-${index}`}
                                checked={rule.depends_on_loyalty}
                                onCheckedChange={(v) => updateRule(index, 'depends_on_loyalty', v)}
                              />
                              <Label htmlFor={`depends-loyalty-${index}`} className="text-white text-sm cursor-pointer">
                                Depende do período de fidelização
                              </Label>
                            </div>
                          </div>

                          {rule.depends_on_loyalty && (
                            <div>
                              <Label className="form-label text-sm">Fidelização (meses)</Label>
                              <Select
                                value={rule.loyalty_months?.toString() || ""}
                                onValueChange={(v) => updateRule(index, 'loyalty_months', parseInt(v))}
                              >
                                <SelectTrigger className="form-input">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#082d32] border-white/10">
                                  {LOYALTY_PERIODS.map((period) => (
                                    <SelectItem key={period} value={period.toString()} className="text-white hover:bg-white/10">
                                      {period === 0 ? 'Sem fidelização' : `${period} meses`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="md:col-span-2 pt-4 border-t border-white/10">
                            <h5 className="text-white text-sm font-medium mb-3">Valores de Comissão</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Checkbox
                                    id={`applies-seller-${index}`}
                                    checked={rule.applies_to_seller}
                                    onCheckedChange={(v) => updateRule(index, 'applies_to_seller', v)}
                                  />
                                  <Label htmlFor={`applies-seller-${index}`} className="text-white text-sm cursor-pointer">
                                    Comissão Vendedor
                                  </Label>
                                </div>
                                {rule.applies_to_seller && (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={rule.calculation_method === 'fixed_per_quantity' ? rule.seller_fixed_value : rule.seller_monthly_multiplier}
                                    onChange={(e) => updateRule(
                                      index,
                                      rule.calculation_method === 'fixed_per_quantity' ? 'seller_fixed_value' : 'seller_monthly_multiplier',
                                      parseFloat(e.target.value) || 0
                                    )}
                                    className="form-input"
                                    placeholder={rule.calculation_method === 'fixed_per_quantity' ? '€ por venda' : 'Multiplicador'}
                                  />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Checkbox
                                    id={`applies-partner-${index}`}
                                    checked={rule.applies_to_partner}
                                    onCheckedChange={(v) => updateRule(index, 'applies_to_partner', v)}
                                  />
                                  <Label htmlFor={`applies-partner-${index}`} className="text-white text-sm cursor-pointer">
                                    Comissão Operadora
                                  </Label>
                                </div>
                                {rule.applies_to_partner && (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={rule.calculation_method === 'fixed_per_quantity' ? rule.partner_fixed_value : rule.partner_monthly_multiplier}
                                    onChange={(e) => updateRule(
                                      index,
                                      rule.calculation_method === 'fixed_per_quantity' ? 'partner_fixed_value' : 'partner_monthly_multiplier',
                                      parseFloat(e.target.value) || 0
                                    )}
                                    className="form-input"
                                    placeholder={rule.calculation_method === 'fixed_per_quantity' ? '€ por venda' : 'Multiplicador'}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-end gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/settings/commissions')}
          className="btn-secondary"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary btn-primary-glow"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              Guardar Configuração
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
