import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { operatorsService } from "@/services/operatorsService";
import { operatorClientCategoriesService } from "@/services/operatorClientCategoriesService";
import { commissionsService } from "@/services/commissionsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  Radio,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Zap,
  Phone,
  Sun,
  X,
  Tags
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "energia_eletricidade", label: "Energia - Eletricidade", icon: Zap },
  { value: "energia_gas", label: "Energia - Gás", icon: Zap },
  { value: "telecomunicacoes", label: "Telecomunicações", icon: Phone },
  { value: "paineis_solares", label: "Painéis Solares", icon: Sun }
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

const getCategoryIcon = (category) => {
  const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
  return option ? option.icon : Radio;
};

const getCategoryLabel = (category) => {
  const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
  return option ? option.label : category;
};

export default function Operators() {
  const { isAdmin, user } = useAuth();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    categories: [],
    commission_visible_to_bo: false,
    has_client_categories: false,
    allowed_sale_types: []
  });

  const [clientCategories, setClientCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const operatorsData = await operatorsService.getOperators(null, true);
      setOperators(operatorsData);
    } catch (error) {
      toast.error("Erro ao carregar operadoras");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingOperator(null);
    setFormData({
      name: "",
      categories: [],
      commission_visible_to_bo: false,
      has_client_categories: false,
      allowed_sale_types: []
    });
    setClientCategories([]);
    setNewCategoryName("");
    setModalOpen(true);
  };

  const openEditModal = async (operator) => {
    setEditingOperator(operator);

    let allowedSaleTypes = operator.allowed_sale_types || [];

    if (allowedSaleTypes.length === 0) {
      try {
        const settings = await commissionsService.getOperatorSettings(operator.id);
        if (settings && settings.length > 0) {
          const saleTypesWithCommissions = new Set();

          for (const setting of settings) {
            const rules = await commissionsService.getRules(setting.id);
            if (rules && rules.length > 0) {
              rules.forEach(rule => {
                if (rule.sale_type) {
                  saleTypesWithCommissions.add(rule.sale_type);
                }
              });
            }
          }

          if (saleTypesWithCommissions.size > 0) {
            allowedSaleTypes = Array.from(saleTypesWithCommissions);
          }
        }
      } catch (error) {
        console.error("Error loading commission rules:", error);
      }
    }

    setFormData({
      name: operator.name || "",
      categories: operator.categories || [],
      commission_visible_to_bo: operator.commission_visible_to_bo || false,
      has_client_categories: operator.has_client_categories || false,
      allowed_sale_types: allowedSaleTypes
    });
    setNewCategoryName("");

    if (operator.has_client_categories) {
      try {
        const categories = await operatorClientCategoriesService.getCategories(operator.id);
        setClientCategories(categories);
      } catch (error) {
        toast.error("Erro ao carregar categorias de cliente");
        setClientCategories([]);
      }
    } else {
      setClientCategories([]);
    }

    setModalOpen(true);
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSaleTypeToggle = (saleType) => {
    setFormData(prev => ({
      ...prev,
      allowed_sale_types: prev.allowed_sale_types.includes(saleType)
        ? prev.allowed_sale_types.filter(st => st !== saleType)
        : [...prev.allowed_sale_types, saleType]
    }));
  };

  const handleAddClientCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      toast.error("Nome da categoria não pode estar vazio");
      return;
    }

    if (clientCategories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Já existe uma categoria com este nome");
      return;
    }

    setClientCategories([...clientCategories, { name: trimmedName, isNew: true }]);
    setNewCategoryName("");
  };

  const handleRemoveClientCategory = async (category) => {
    if (category.id && editingOperator) {
      try {
        await operatorClientCategoriesService.deleteCategory(category.id);
        toast.success("Categoria removida");
      } catch (error) {
        toast.error("Erro ao remover categoria");
        return;
      }
    }
    setClientCategories(clientCategories.filter(c => c !== category));
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Nome da operadora é obrigatório");
      return;
    }

    if (formData.categories.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }

    if (formData.has_client_categories && clientCategories.length === 0) {
      toast.error("Adicione pelo menos uma categoria de cliente");
      return;
    }

    setSaving(true);
    try {
      let operatorId;
      if (editingOperator) {
        const updated = await operatorsService.updateOperator(editingOperator.id, formData);
        operatorId = editingOperator.id;
        setOperators(operators.map(o => o.id === editingOperator.id ? updated : o));
      } else {
        const created = await operatorsService.createOperator({
          ...formData,
          active: true
        });
        operatorId = created.id;
        setOperators([...operators, created]);
      }

      if (formData.has_client_categories) {
        const newCategories = clientCategories.filter(cat => cat.isNew);
        for (const category of newCategories) {
          await operatorClientCategoriesService.createCategory(operatorId, category.name);
        }
      }

      toast.success(editingOperator ? "Operadora atualizada" : "Operadora criada");
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erro ao guardar operadora");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await operatorsService.deleteOperator(deleteId);
      setOperators(operators.filter(o => o.id !== deleteId));
      toast.success("Operadora eliminada");
    } catch (error) {
      toast.error("Erro ao eliminar operadora");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (operatorId) => {
    try {
      const operator = operators.find(o => o.id === operatorId);
      const updated = await operatorsService.toggleOperatorActive(operatorId, !operator.active);
      setOperators(operators.map(o => o.id === operatorId ? updated : o));
      toast.success("Status atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar status");
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
    <div className="space-y-6" data-testid="operators-page">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Manrope']">Operadoras</h1>
          <p className="text-white/50 text-sm mt-1">Gerir operadoras e suas categorias</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="btn-primary btn-primary-glow flex items-center gap-2"
          data-testid="new-operator-btn"
        >
          <Plus size={18} />
          Nova Operadora
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {operators.length > 0 ? (
          operators.map((operator) => (
            <Card key={operator.id} className="card-leiritrix" data-testid={`operator-card-${operator.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${operator.active ? 'bg-[#c8f31d]/20' : 'bg-white/10'}`}>
                      <Radio size={20} className={operator.active ? 'text-[#c8f31d]' : 'text-white/40'} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{operator.name}</p>
                      {!operator.active && (
                        <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs mt-1">
                          Inativa
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-white/50 text-xs mb-2">Categorias</p>
                    <div className="flex flex-wrap gap-1">
                      {operator.categories && operator.categories.length > 0 ? (
                        operator.categories.map((cat) => {
                          const Icon = getCategoryIcon(cat);
                          return (
                            <Badge key={cat} className="bg-[#c8f31d]/20 text-[#c8f31d] border border-[#c8f31d]/30 text-xs">
                              <Icon size={12} className="mr-1" />
                              {getCategoryLabel(cat)}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-white/40 text-xs">Sem categorias</span>
                      )}
                    </div>
                  </div>

                  <div>
                    {operator.commission_visible_to_bo ? (
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
                        {isAdmin ? "Comissões Visíveis BO" : "Com comissão a contabilizar"}
                      </Badge>
                    ) : (
                      <Badge className="bg-white/10 text-white/60 border border-white/10 text-xs">
                        {isAdmin ? "Comissões Ocultas BO" : "Sem comissão a contabilizar"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <Button
                    onClick={() => openEditModal(operator)}
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-white/70 hover:text-[#c8f31d]"
                    data-testid={`edit-operator-${operator.id}`}
                  >
                    <Edit2 size={16} className="mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => toggleActive(operator.id)}
                    variant="ghost"
                    size="sm"
                    className={`${operator.active ? 'text-red-400 hover:bg-red-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
                    data-testid={`toggle-operator-${operator.id}`}
                  >
                    {operator.active ? <PowerOff size={16} /> : <Power size={16} />}
                  </Button>
                  <Button
                    onClick={() => setDeleteId(operator.id)}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-red-400"
                    data-testid={`delete-operator-${operator.id}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="card-leiritrix col-span-full">
            <CardContent className="p-8 text-center">
              <Radio size={48} className="mx-auto text-white/20 mb-4" />
              <p className="text-white/50">Nenhuma operadora registada</p>
              <Button
                onClick={openCreateModal}
                className="btn-primary btn-primary-glow mt-4"
              >
                Criar Primeira Operadora
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#082d32] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white font-['Manrope']">
              {editingOperator ? "Editar Operadora" : "Nova Operadora"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="form-label">Nome da Operadora *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input mt-1"
                placeholder="Nome da operadora"
                data-testid="operator-name-input"
              />
            </div>

            <div>
              <Label className="form-label mb-3">Categorias de Vendas *</Label>
              <div className="space-y-2">
                {CATEGORY_OPTIONS.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={category.value}
                      className="flex items-center space-x-2 p-3 rounded-lg bg-[#0d474f] hover:bg-[#0d474f]/80 cursor-pointer"
                      onClick={() => handleCategoryToggle(category.value)}
                    >
                      <Checkbox
                        id={category.value}
                        checked={formData.categories.includes(category.value)}
                        onCheckedChange={() => handleCategoryToggle(category.value)}
                      />
                      <Icon size={16} className="text-[#c8f31d]" />
                      <Label
                        htmlFor={category.value}
                        className="text-white text-sm cursor-pointer flex-1"
                      >
                        {category.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="form-label mb-3">Tipos de Venda Permitidos</Label>
              <p className="text-white/50 text-xs mb-3">
                Selecione os tipos de venda disponíveis para esta operadora. Se nenhum for selecionado, todos os tipos estarão disponíveis.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SALE_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-[#0d474f] hover:bg-[#0d474f]/80 cursor-pointer"
                    onClick={() => handleSaleTypeToggle(type.value)}
                  >
                    <Checkbox
                      id={`sale-type-${type.value}`}
                      checked={formData.allowed_sale_types.includes(type.value)}
                      onCheckedChange={() => handleSaleTypeToggle(type.value)}
                    />
                    <Label
                      htmlFor={`sale-type-${type.value}`}
                      className="text-white text-sm cursor-pointer flex-1"
                    >
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#0d474f]">
                <div className="flex-1">
                  <Label className="form-label mb-1">Comissões Visíveis para Backoffice</Label>
                  <p className="text-white/50 text-xs">
                    Se ativo, os utilizadores de backoffice podem ver e registar comissões nas vendas desta operadora
                  </p>
                </div>
                <Switch
                  checked={formData.commission_visible_to_bo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, commission_visible_to_bo: checked })
                  }
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#0d474f]">
                <div className="flex-1">
                  <Label className="form-label mb-1">Categorias de Cliente</Label>
                  <p className="text-white/50 text-xs">
                    Permite definir diferentes categorias de cliente para esta operadora
                  </p>
                </div>
                <Switch
                  checked={formData.has_client_categories}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, has_client_categories: checked });
                    if (!checked) setClientCategories([]);
                  }}
                />
              </div>

              {formData.has_client_categories && (
                <div className="p-4 rounded-lg bg-[#0d474f] space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddClientCategory()}
                      placeholder="Nome da categoria"
                      className="form-input flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddClientCategory}
                      className="btn-primary"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>

                  {clientCategories.length > 0 && (
                    <div className="space-y-2">
                      {clientCategories.map((category, index) => (
                        <div
                          key={category.id || index}
                          className="flex items-center justify-between p-2 rounded bg-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <Tags size={14} className="text-[#c8f31d]" />
                            <span className="text-white text-sm">{category.name}</span>
                            {category.isNew && (
                              <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
                                Nova
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleRemoveClientCategory(category)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-400/10 h-6 w-6 p-0"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary btn-primary-glow"
              data-testid="save-operator-btn"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                editingOperator ? "Guardar" : "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#082d32] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Operadora</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem a certeza que pretende eliminar esta operadora? Esta ação não pode ser revertida.
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
