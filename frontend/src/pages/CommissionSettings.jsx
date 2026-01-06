import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useNavigate } from "react-router-dom";
import { commissionsService } from "@/services/commissionsService";
import { operatorsService } from "@/services/operatorsService";
import { partnersService } from "@/services/partnersService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Settings,
  Plus,
  Edit2,
  Trash2,
  Loader2
} from "lucide-react";

export default function CommissionSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [settings, setSettings] = useState([]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
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

  const fetchSettings = async (operatorId) => {
    try {
      const data = await commissionsService.getOperatorSettings(operatorId);
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    }
  };

  useEffect(() => {
    if (selectedOperator) {
      fetchSettings(selectedOperator);
    } else {
      setSettings([]);
    }
  }, [selectedOperator]);

  const handleDeleteSetting = async (settingId) => {
    if (!confirm("Tem a certeza que deseja eliminar esta configuração? Todas as regras associadas serão eliminadas.")) {
      return;
    }

    try {
      await commissionsService.deleteOperatorSetting(settingId);
      toast.success("Configuração eliminada com sucesso");
      fetchSettings(selectedOperator);
    } catch (error) {
      console.error("Error deleting setting:", error);
      toast.error("Erro ao eliminar configuração");
    }
  };

  const getPartnerName = (partnerId) => {
    if (!partnerId) return "Todos os parceiros";
    const partner = partners.find(p => p.id === partnerId);
    return partner?.name || "Desconhecido";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white font-['Manrope']">
              Configurações de Comissões
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Gerir cálculo automático de comissões por operadora
            </p>
          </div>
        </div>
      </div>

      <Card className="card-leiritrix">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Selecione uma operadora" />
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
            {selectedOperator && (
              <Button
                onClick={() => navigate(`/settings/commissions/new?operator=${selectedOperator}`)}
                className="btn-primary btn-primary-glow"
              >
                <Plus size={18} className="mr-2" />
                Nova Configuração
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOperator && settings.length === 0 && (
        <Card className="card-leiritrix">
          <CardContent className="p-8 text-center">
            <Settings className="mx-auto mb-4 text-white/30" size={48} />
            <p className="text-white/70 mb-2">Nenhuma configuração definida</p>
            <p className="text-white/50 text-sm mb-6">
              Crie uma configuração para definir como as comissões serão calculadas para esta operadora
            </p>
            <Button
              onClick={() => navigate(`/settings/commissions/new?operator=${selectedOperator}`)}
              className="btn-primary btn-primary-glow"
            >
              <Plus size={18} className="mr-2" />
              Criar Configuração
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedOperator && settings.length > 0 && (
        <div className="space-y-4">
          {settings.map((setting) => (
            <Card key={setting.id} className="card-leiritrix">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-white font-['Manrope']">
                        {getPartnerName(setting.partner_id)}
                      </h3>
                      <Badge className={
                        setting.commission_type === 'automatic'
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }>
                        {setting.commission_type === 'automatic' ? 'Automático' : 'Manual'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/50 mb-1">Diferenciação por NIF</p>
                        <p className="text-white">
                          {setting.nif_differentiation ? 'Sim (5xx vs 1/2/3xxx)' : 'Não'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 mb-1">Tipos de Venda Permitidos</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {setting.allowed_sale_types?.map((type) => (
                            <Badge key={type} variant="outline" className="text-xs text-white/70 border-white/20">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => navigate(`/settings/commissions/${setting.id}`)}
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      onClick={() => handleDeleteSetting(setting.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
