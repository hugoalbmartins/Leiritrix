import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { Link } from "react-router-dom";
import { salesService } from "@/services/salesService";
import { usersService } from "@/services/usersService";
import { operatorsService } from "@/services/operatorsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  ShoppingCart,
  Euro,
  AlertTriangle,
  ArrowRight,
  Zap,
  Phone,
  Sun,
  Calendar,
  Clock,
  CheckCircle,
  Users,
  EyeOff
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const STATUS_MAP = {
  em_negociacao: { label: "Em Negociação", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  perdido: { label: "Perdido", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  pendente: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  ativo: { label: "Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  anulado: { label: "Anulado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" }
};

const CATEGORY_ICONS = {
  energia: Zap,
  telecomunicacoes: Phone,
  paineis_solares: Sun
};

const CATEGORY_LABELS = {
  energia: "Energia",
  telecomunicacoes: "Telecomunicações",
  paineis_solares: "Painéis Solares"
};

const PIE_COLORS = ["#c8f31d", "#3b82f6", "#f59e0b"];

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [metrics, setMetrics] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasSellers, setHasSellers] = useState(false);
  const [hasHiddenOperators, setHasHiddenOperators] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [filterNIF, setFilterNIF] = useState("");
  const [filterPartner, setFilterPartner] = useState("");

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const stats = await salesService.getSaleStatistics();
      const sales = await salesService.getSales();

      let currentUserData = null;
      if (user.role === 'backoffice') {
        const users = await usersService.getUsers();
        currentUserData = users.find(u => u.id === user.id);
      }

      if (user.role === 'admin') {
        const sellers = await usersService.getUsersByRole('vendedor');
        setHasSellers(sellers.length > 0);

        const allOperators = await operatorsService.getOperators();
        const hiddenOperators = allOperators.filter(op => !op.commission_visible_to_bo);
        setHasHiddenOperators(hiddenOperators.length > 0);
      }

      const currentYear = selectedYear;
      const currentMonth = selectedMonth;
      const lastYear = currentYear - 1;

      const currentYearSales = [];
      const lastYearSales = [];
      const currentMonthSales = [];
      const lastYearSameMonthSales = [];

      sales.forEach(sale => {
        const saleDate = new Date(sale.sale_date || sale.created_at);
        const saleYear = saleDate.getFullYear();
        const saleMonth = saleDate.getMonth();

        if (saleYear === currentYear && saleMonth === currentMonth) {
          currentMonthSales.push(sale);
        }

        if (saleYear === lastYear && saleMonth === currentMonth) {
          lastYearSameMonthSales.push(sale);
        }

        if (saleYear === currentYear) {
          currentYearSales.push(sale);
        } else if (saleYear === lastYear) {
          lastYearSales.push(sale);
        }
      });

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const yoyData = monthNames.map((month, index) => {
        const currentYearMonthSales = currentYearSales.filter(s => new Date(s.sale_date || s.created_at).getMonth() === index);
        const lastYearMonthSales = lastYearSales.filter(s => new Date(s.sale_date || s.created_at).getMonth() === index);

        return {
          month,
          anoCorrente: currentYearMonthSales.length,
          anoAnterior: lastYearMonthSales.length,
        };
      });

      const calcMensalidadesTelecom = (salesList) => {
        return salesList
          .filter(s => s.category === 'telecomunicacoes' && s.status === 'ativo')
          .reduce((sum, s) => sum + (s.contract_value || 0), 0);
      };

      const calcSellerCommissions = (salesList) => {
        return salesList.reduce((sum, s) => sum + (s.commission_seller || 0), 0);
      };

      const calcNonVisibleOperatorCommissions = (salesList) => {
        return salesList
          .filter(s => !s.operators?.commission_visible_to_bo)
          .reduce((sum, s) => sum + (s.commission_partner || 0), 0);
      };

      const calcPartnerCommissions = (salesList) => {
        return salesList
          .filter(s => s.operators?.commission_visible_to_bo)
          .reduce((sum, s) => sum + (s.commission_partner || 0), 0);
      };

      const calcPartnerCommissionsActive = (salesList) => {
        return salesList
          .filter(s => s.status === 'ativo' && s.operators?.commission_visible_to_bo)
          .reduce((sum, s) => sum + (s.commission_partner || 0), 0);
      };

      const calcBackofficeCommission = (salesList, percentage, threshold) => {
        const visibleCommissions = calcPartnerCommissions(salesList);
        if (visibleCommissions < (threshold || 0)) {
          return 0;
        }
        return visibleCommissions * (percentage / 100);
      };

      const currentMonthMensalidades = calcMensalidadesTelecom(currentMonthSales);
      const lastYearMonthMensalidades = calcMensalidadesTelecom(lastYearSameMonthSales);

      const calcPercentageChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      let metricsData = {};

      if (user.role === 'admin') {
        const currentMonthSellerCommissions = calcSellerCommissions(currentMonthSales);
        const lastYearSellerCommissions = calcSellerCommissions(lastYearSameMonthSales);

        const currentMonthNonVisibleCommissions = calcNonVisibleOperatorCommissions(currentMonthSales);
        const lastYearNonVisibleCommissions = calcNonVisibleOperatorCommissions(lastYearSameMonthSales);

        const currentMonthPartnerCommissions = calcPartnerCommissions(currentMonthSales);
        const lastYearPartnerCommissions = calcPartnerCommissions(lastYearSameMonthSales);

        const currentMonthActiveCommissions = calcPartnerCommissionsActive(currentMonthSales);
        const lastYearActiveCommissions = calcPartnerCommissionsActive(lastYearSameMonthSales);

        metricsData = {
          seller_commissions: currentMonthSellerCommissions,
          seller_commissions_yoy: calcPercentageChange(currentMonthSellerCommissions, lastYearSellerCommissions),
          non_visible_commissions: currentMonthNonVisibleCommissions,
          non_visible_commissions_yoy: calcPercentageChange(currentMonthNonVisibleCommissions, lastYearNonVisibleCommissions),
          partner_commissions: currentMonthPartnerCommissions,
          partner_commissions_yoy: calcPercentageChange(currentMonthPartnerCommissions, lastYearPartnerCommissions),
          active_commissions: currentMonthActiveCommissions,
          active_commissions_yoy: calcPercentageChange(currentMonthActiveCommissions, lastYearActiveCommissions),
        };
      } else if (user.role === 'backoffice') {
        const percentage = currentUserData?.commission_percentage || 0;
        const threshold = currentUserData?.commission_threshold || 0;

        const currentMonthBoCommission = calcBackofficeCommission(currentMonthSales, percentage, threshold);
        const lastYearBoCommission = calcBackofficeCommission(lastYearSameMonthSales, percentage, threshold);

        const currentMonthPartnerCommissions = calcPartnerCommissions(currentMonthSales);
        const lastYearPartnerCommissions = calcPartnerCommissions(lastYearSameMonthSales);

        const currentMonthActiveCommissions = calcPartnerCommissionsActive(currentMonthSales);
        const lastYearActiveCommissions = calcPartnerCommissionsActive(lastYearSameMonthSales);

        metricsData = {
          backoffice_commission: currentMonthBoCommission,
          backoffice_commission_yoy: calcPercentageChange(currentMonthBoCommission, lastYearBoCommission),
          partner_commissions: currentMonthPartnerCommissions,
          partner_commissions_yoy: calcPercentageChange(currentMonthPartnerCommissions, lastYearPartnerCommissions),
          active_commissions: currentMonthActiveCommissions,
          active_commissions_yoy: calcPercentageChange(currentMonthActiveCommissions, lastYearActiveCommissions),
        };
      }

      const expiringSoon = sales.filter(sale => {
        if (sale.status !== 'ativo' || !sale.loyalty_end_date) return false;

        const endDate = new Date(sale.loyalty_end_date);
        const now = new Date();
        const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilEnd > 210 || daysUntilEnd < 0) return false;

        const hasRefidRenewal = sales.some(otherSale =>
          otherSale.id !== sale.id &&
          otherSale.sale_type === 'refid' &&
          otherSale.client_name === sale.client_name &&
          otherSale.client_address === sale.client_address &&
          new Date(otherSale.sale_date || otherSale.created_at) > new Date(sale.sale_date || sale.created_at)
        );

        return !hasRefidRenewal;
      });

      setMetrics({
        sales_this_month: currentMonthSales.length,
        total_mensalidades: currentMonthMensalidades,
        mensalidades_yoy: calcPercentageChange(currentMonthMensalidades, lastYearMonthMensalidades),
        sales_by_category: stats.byCategory,
        sales_by_status: stats.byStatus,
        ...metricsData
      });

      setMonthlyStats(yoyData);

      const sortedAlerts = expiringSoon.sort((a, b) => {
        const endDateA = new Date(a.loyalty_end_date);
        const endDateB = new Date(b.loyalty_end_date);
        const nowDate = new Date();
        const daysA = Math.ceil((endDateA - nowDate) / (1000 * 60 * 60 * 24));
        const daysB = Math.ceil((endDateB - nowDate) / (1000 * 60 * 60 * 24));
        return daysA - daysB;
      });

      setAlerts(sortedAlerts);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const categoryData = metrics?.sales_by_category ? 
    Object.entries(metrics.sales_by_category).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value
    })) : [];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getPercentageColor = (value) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const months = [
    { value: 0, label: "Janeiro" },
    { value: 1, label: "Fevereiro" },
    { value: 2, label: "Março" },
    { value: 3, label: "Abril" },
    { value: 4, label: "Maio" },
    { value: 5, label: "Junho" },
    { value: 6, label: "Julho" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Setembro" },
    { value: 9, label: "Outubro" },
    { value: 10, label: "Novembro" },
    { value: 11, label: "Dezembro" }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Month/Year Filter */}
      <div className="flex justify-end items-center gap-2 mb-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="bg-[#082d32]/50 border border-white/10 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:border-[#c8f31d]/50 transition-colors font-['Manrope']"
        >
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="bg-[#082d32]/50 border border-white/10 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:border-[#c8f31d]/50 transition-colors font-['Manrope']"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Metrics Grid - Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
        <Card className="metric-card w-full" data-testid="metric-mensalidades">
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="metric-value font-mono text-xl">
                  {formatCurrency(metrics?.total_mensalidades)}
                </p>
                <p className="metric-label">
                  Mensalidades Telecom
                  {metrics?.mensalidades_yoy !== undefined && (
                    <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.mensalidades_yoy)}`}>
                      {formatPercentage(metrics.mensalidades_yoy)} vs ano anterior
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <Phone className="text-blue-400" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        {user.role === 'admin' ? (
          <>
            {hasSellers && (
              <Card className="metric-card w-full" data-testid="metric-seller-commissions">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="metric-value font-mono text-xl">
                        {formatCurrency(metrics?.seller_commissions)}
                      </p>
                      <p className="metric-label">
                        Comissões Vendedores
                        {metrics?.seller_commissions_yoy !== undefined && (
                          <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.seller_commissions_yoy)}`}>
                            {formatPercentage(metrics.seller_commissions_yoy)} vs ano anterior
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-purple-500/10 p-2 rounded-lg">
                      <Users className="text-purple-400" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasHiddenOperators && (
              <Card className="metric-card w-full" data-testid="metric-non-visible-commissions">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="metric-value font-mono text-xl">
                        {formatCurrency(metrics?.non_visible_commissions)}
                      </p>
                      <p className="metric-label">
                        Comissões Operadoras Ocultas
                        {metrics?.non_visible_commissions_yoy !== undefined && (
                          <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.non_visible_commissions_yoy)}`}>
                            {formatPercentage(metrics.non_visible_commissions_yoy)} vs ano anterior
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-500/10 p-2 rounded-lg">
                      <EyeOff className="text-gray-400" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : user.role === 'backoffice' ? (
          <>
            <Card className="metric-card w-full" data-testid="metric-backoffice-commission">
              <CardContent className="p-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="metric-value font-mono text-xl text-[#c8f31d]">
                      {formatCurrency(metrics?.backoffice_commission)}
                    </p>
                    <p className="metric-label">
                      Comissão Backoffice
                      {metrics?.backoffice_commission_yoy !== undefined && (
                        <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.backoffice_commission_yoy)}`}>
                          {formatPercentage(metrics.backoffice_commission_yoy)} vs ano anterior
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-[#c8f31d]/10 p-2 rounded-lg">
                    <Euro className="text-[#c8f31d]" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card w-full" data-testid="metric-partner-commissions">
              <CardContent className="p-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="metric-value font-mono text-xl">
                      {formatCurrency(metrics?.partner_commissions)}
                    </p>
                    <p className="metric-label">
                      Comissões Operadoras
                      {metrics?.partner_commissions_yoy !== undefined && (
                        <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.partner_commissions_yoy)}`}>
                          {formatPercentage(metrics.partner_commissions_yoy)} vs ano anterior
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-yellow-500/10 p-2 rounded-lg">
                    <Euro className="text-yellow-400" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Second row for admin - partner and active commissions */}
      {user.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
          <Card className="metric-card w-full" data-testid="metric-partner-commissions">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="metric-value font-mono text-xl">
                    {formatCurrency(metrics?.partner_commissions)}
                  </p>
                  <p className="metric-label">
                    Comissões previstas
                    {metrics?.partner_commissions_yoy !== undefined && (
                      <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.partner_commissions_yoy)}`}>
                        {formatPercentage(metrics.partner_commissions_yoy)} vs ano anterior
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-yellow-500/10 p-2 rounded-lg">
                  <Euro className="text-yellow-400" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card w-full" data-testid="metric-active-commissions">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="metric-value font-mono text-xl text-green-400">
                    {formatCurrency(metrics?.active_commissions)}
                  </p>
                  <p className="metric-label">
                    Comissões vendas ativas
                    {metrics?.active_commissions_yoy !== undefined && (
                      <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.active_commissions_yoy)}`}>
                        {formatPercentage(metrics.active_commissions_yoy)} vs ano anterior
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <CheckCircle className="text-green-400" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active commissions for backoffice */}
      {user.role === 'backoffice' && (
        <div className="grid grid-cols-1 gap-4">
          <Card className="metric-card w-full" data-testid="metric-active-commissions">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="metric-value font-mono text-xl text-green-400">
                    {formatCurrency(metrics?.active_commissions)}
                  </p>
                  <p className="metric-label">
                    Comissões Ativas
                    {metrics?.active_commissions_yoy !== undefined && (
                      <span className={`block mt-1 text-xs font-mono ${getPercentageColor(metrics.active_commissions_yoy)}`}>
                        {formatPercentage(metrics.active_commissions_yoy)} vs ano anterior
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <CheckCircle className="text-green-400" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Year-over-Year Line Chart */}
        <Card className="card-leiritrix lg:col-span-2" data-testid="monthly-chart">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg">
              Evolução de Vendas (Ano Corrente vs Ano Anterior)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const current = data.anoCorrente || 0;
                        const previous = data.anoAnterior || 0;
                        const change = previous > 0 ? ((current - previous) / previous * 100) : (current > 0 ? 100 : 0);
                        const changeText = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
                        const changeColor = change >= 0 ? '#4ade80' : '#f87171';

                        return (
                          <div className="bg-[#082d32] border border-[#c8f31d]/20 rounded p-3 text-white text-sm">
                            <p className="font-bold mb-2">{data.month}</p>
                            <p className="text-[#c8f31d]">Ano Corrente: {current}</p>
                            <p className="text-[#3b82f6]">Ano Anterior: {previous}</p>
                            <p style={{ color: changeColor }} className="font-bold mt-1">
                              {changeText} {change >= 0 ? '↑' : '↓'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="anoCorrente"
                    stroke="#c8f31d"
                    strokeWidth={3}
                    name="Ano Corrente"
                    dot={{ fill: '#c8f31d', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="anoAnterior"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Ano Anterior"
                    dot={{ fill: '#3b82f6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="card-leiritrix" data-testid="category-chart">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg">
              Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#082d32', 
                        border: '1px solid rgba(200,243,29,0.2)',
                        borderRadius: '0.3rem',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50">
                  Sem dados
                </div>
              )}
            </div>

            {/* Total Sales */}
            {categoryData.length > 0 && (
              <div className="text-center mt-4 mb-2">
                <p className="text-white/50 text-sm">Total de Vendas do Mês</p>
                <p className="text-white text-2xl font-bold font-mono">
                  {categoryData.reduce((sum, item) => sum + item.value, 0)}
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="text-sm text-white/70">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Summary */}
        <Card className="card-leiritrix" data-testid="status-summary">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-white font-['Manrope'] text-lg">
              Por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Object.entries(STATUS_MAP).map(([key, status]) => {
                const count = metrics?.sales_by_status?.[key] || 0;
                return (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className={`badge ${status.color} border`}>
                      {status.label}
                    </span>
                    <span className="text-white font-mono font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Alerts */}
        <Card className="card-leiritrix" data-testid="loyalty-alerts">
          <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-white font-['Manrope'] text-lg flex items-center gap-2">
              <AlertTriangle className="text-[#c8f31d]" size={20} />
              Alertas de Fidelização
            </CardTitle>
            <Badge className="bg-[#c8f31d] text-[#0d474f]">
              {alerts.length}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4 max-h-72 overflow-y-auto">
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => {
                  const CategoryIcon = CATEGORY_ICONS[alert.category] || Zap;
                  return (
                    <Link 
                      key={alert.id} 
                      to={`/sales/${alert.id}`}
                      className="alert-item block"
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <CategoryIcon className="text-[#c8f31d] mt-0.5" size={18} />
                          <div>
                            <p className="text-white font-medium">{alert.client_name}</p>
                            <p className="text-white/50 text-sm">{alert.partner_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[#c8f31d] font-mono font-bold">
                            {alert.days_until_end} dias
                          </p>
                          <p className="text-white/40 text-xs flex items-center gap-1 justify-end">
                            <Calendar size={12} />
                            {new Date(alert.loyalty_end_date).toLocaleDateString('pt-PT')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-white/50">
                <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                <p>Sem alertas de fidelização</p>
              </div>
            )}
            
            {alerts.length > 5 && (
              <Button
                variant="ghost"
                className="w-full mt-4 text-[#c8f31d] hover:bg-[#c8f31d]/10"
                onClick={() => setShowAlertsDialog(true)}
              >
                Ver todos ({alerts.length})
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Dialog */}
      <Dialog open={showAlertsDialog} onOpenChange={(open) => {
        setShowAlertsDialog(open);
        if (!open) {
          setFilterNIF("");
          setFilterPartner("");
        }
      }}>
        <DialogContent className="bg-[#082d32] border-white/10 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white font-['Manrope'] text-xl flex items-center gap-2">
              <AlertTriangle className="text-[#c8f31d]" size={24} />
              Alertas de Fidelização ({alerts.filter(alert => {
                const matchNIF = !filterNIF || alert.client_nif?.includes(filterNIF);
                const matchPartner = !filterPartner || alert.partner_name?.toLowerCase().includes(filterPartner.toLowerCase());
                return matchNIF && matchPartner;
              }).length})
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Contratos ativos com fidelização a terminar nos próximos 7 meses
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Filtrar por NIF</label>
              <Input
                type="text"
                placeholder="Digite o NIF..."
                value={filterNIF}
                onChange={(e) => setFilterNIF(e.target.value)}
                className="bg-[#0a3940] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Filtrar por Parceiro</label>
              <Input
                type="text"
                placeholder="Digite o nome do parceiro..."
                value={filterPartner}
                onChange={(e) => setFilterPartner(e.target.value)}
                className="bg-[#0a3940] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="space-y-3 mt-4 overflow-y-auto flex-1 pr-2">
            {alerts.filter(alert => {
              const matchNIF = !filterNIF || alert.client_nif?.includes(filterNIF);
              const matchPartner = !filterPartner || alert.partner_name?.toLowerCase().includes(filterPartner.toLowerCase());
              return matchNIF && matchPartner;
            }).length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum alerta encontrado com os filtros aplicados</p>
              </div>
            ) : (
              alerts.filter(alert => {
                const matchNIF = !filterNIF || alert.client_nif?.includes(filterNIF);
                const matchPartner = !filterPartner || alert.partner_name?.toLowerCase().includes(filterPartner.toLowerCase());
                return matchNIF && matchPartner;
              }).map((alert) => {
              const CategoryIcon = CATEGORY_ICONS[alert.category] || Zap;
              const endDate = new Date(alert.loyalty_end_date);
              const now = new Date();
              const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

              return (
                <Link
                  key={alert.id}
                  to={`/sales/${alert.id}`}
                  className="alert-item block"
                  onClick={() => setShowAlertsDialog(false)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <CategoryIcon className="text-[#c8f31d] mt-0.5 flex-shrink-0" size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{alert.client_name}</p>
                        <p className="text-white/70 text-sm font-mono">NIF: {alert.client_nif}</p>
                        <p className="text-white/50 text-sm truncate mt-0.5">{alert.partner_name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#c8f31d] font-mono font-bold text-lg">
                        {daysUntilEnd} dias
                      </p>
                      <p className="text-white/40 text-xs flex items-center gap-1 justify-end mt-1">
                        <Calendar size={12} />
                        {endDate.toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
