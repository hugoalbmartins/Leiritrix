import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Building2,
  Radio,
  Settings,
  Target,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import NotificationSettings from "@/components/NotificationSettings";

const LOGO_URL = "/leiritrix.png";

export const Layout = () => {
  const { user, logout, isAdmin, isAdminOrBackoffice } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { name: "Leads", href: "/leads", icon: Target, show: true },
    { name: "Vendas", href: "/sales", icon: ShoppingCart, show: true },
    { name: "Nova Venda", href: "/sales/new", icon: PlusCircle, show: true },
    { name: "Parceiros", href: "/partners", icon: Building2, show: isAdminOrBackoffice },
    { name: "Operadoras", href: "/operators", icon: Radio, show: isAdminOrBackoffice },
    { name: "Relatórios", href: "/reports", icon: FileText, show: isAdminOrBackoffice },
    { name: "Utilizadores", href: "/users", icon: Users, show: isAdmin },
    { name: "Comissões", href: "/settings/commissions", icon: Settings, show: isAdmin },
  ];

  const isActive = (href) => {
    if (href === "/sales") {
      return location.pathname === "/sales";
    }
    return location.pathname.startsWith(href);
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: "Admin", class: "bg-[#c8f31d] text-[#0d474f]" },
      backoffice: { text: "Backoffice", class: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
      vendedor: { text: "Vendedor", class: "bg-white/10 text-white/70" }
    };
    return badges[role] || badges.vendedor;
  };

  const badge = getRoleBadge(user?.role);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Erro no logout:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d474f]">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-[#082d32] text-white"
        data-testid="mobile-menu-btn"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[#c8f31d]/10">
            <img 
              src={LOGO_URL} 
              alt="CRM Leiritrix" 
              className="h-10 w-auto"
              data-testid="logo"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" data-testid="sidebar-nav">
            {navigation.filter(item => item.show).map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-item flex items-center gap-3 px-4 py-3 ${active ? 'active' : ''}`}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-[#c8f31d]/10">
            <div className="mb-4">
              <p className="text-white font-medium truncate">{user?.name}</p>
              <p className="text-white/50 text-sm truncate">{user?.email}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
                {badge.text}
              </span>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
              data-testid="logout-btn"
              disabled={isLoggingOut}
            >
              <LogOut size={18} className="mr-2" />
              {isLoggingOut ? "A terminar..." : "Terminar Sessão"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Top bar */}
        <div className="top-bar px-6 py-4 flex items-center justify-between">
          <div className="lg:hidden w-8"></div>
          <h1 className="text-xl font-bold text-white font-['Manrope']">
            {navigation.find(item => isActive(item.href))?.name || "CRM Leiritrix"}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifSettings(true)}
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              <Settings size={20} />
            </Button>
            <NotificationBell userId={user?.id} />
          </div>
        </div>

        {/* Page content */}
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <NotificationSettings
        open={showNotifSettings}
        onOpenChange={setShowNotifSettings}
        userId={user?.id}
      />
    </div>
  );
};

export default Layout;
