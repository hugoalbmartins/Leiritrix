import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import InstallPrompt from "@/components/InstallPrompt";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import SaleForm from "@/pages/SaleForm";
import SaleDetail from "@/pages/SaleDetail";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Partners from "@/pages/Partners";
import Operators from "@/pages/Operators";
import CommissionSettings from "@/pages/CommissionSettings";
import CommissionWizard from "@/pages/CommissionWizard";
import Leads from "@/pages/Leads";
import Layout from "@/components/Layout";

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        if (currentUser?.must_change_password) {
          setShowPasswordChange(true);
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = authService.onAuthStateChange((event, session, userProfile) => {
      if (event === 'SIGNED_IN') {
        setUser(userProfile);
        if (userProfile?.must_change_password) {
          setShowPasswordChange(true);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setShowPasswordChange(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      console.log('[Logout] Iniciando logout...');

      // Fazer logout no Supabase
      await authService.signOut();
      console.log('[Logout] Supabase signOut concluído');

      // Limpar estado local
      setUser(null);
      setShowPasswordChange(false);
      console.log('[Logout] Estado local limpo');

      // Limpar localStorage (se houver dados cached)
      try {
        localStorage.removeItem('supabase.auth.token');
      } catch (e) {
        console.warn('[Logout] Erro ao limpar localStorage:', e);
      }

      toast.success("Logout efetuado com sucesso");
      console.log('[Logout] Redirecionando para /login...');

      // Usar replace para forçar recarregamento completo
      window.location.replace('/login');
    } catch (error) {
      console.error('[Logout] Erro durante logout:', error);
      toast.error("Erro ao fazer logout: " + error.message);

      // Mesmo com erro, tentar limpar e redirecionar
      setUser(null);
      setShowPasswordChange(false);
      window.location.replace('/login');
    }
  };

  const handleIdleTimeout = async () => {
    try {
      console.log('[Idle Timeout] Sessão expirada por inatividade');
      await authService.signOut();
      setUser(null);
      setShowPasswordChange(false);

      // Limpar localStorage
      try {
        localStorage.removeItem('supabase.auth.token');
      } catch (e) {
        console.warn('[Idle Timeout] Erro ao limpar localStorage:', e);
      }

      toast.warning("Sessão expirada por inatividade");
      window.location.replace('/login');
    } catch (error) {
      console.error("[Idle Timeout] Erro durante logout:", error);
      setUser(null);
      setShowPasswordChange(false);
      window.location.replace('/login');
    }
  };

  useIdleTimeout(user ? handleIdleTimeout : null, 1800000);

  const handlePasswordChanged = async (currentPassword, newPassword) => {
    await authService.changePassword(currentPassword, newPassword);
    setShowPasswordChange(false);
    const updatedUser = await authService.getCurrentUser();
    setUser(updatedUser);
  };

  const value = {
    user,
    setUser,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isAdminOrBackoffice: user?.role === "admin" || user?.role === "backoffice"
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PasswordChangeModal
        open={showPasswordChange}
        onPasswordChanged={handlePasswordChanged}
      />
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, requireAdmin = false, requireAdminOrBO = false }) => {
  const { isAuthenticated, loading, isAdmin, isAdminOrBackoffice } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d474f]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    toast.error("Acesso restrito a administradores");
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdminOrBO && !isAdminOrBackoffice) {
    toast.error("Acesso restrito");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/new" element={<SaleForm />} />
        <Route path="sales/:id" element={<SaleDetail />} />
        <Route path="sales/:id/edit" element={<SaleDetail editMode={true} />} />
        <Route path="partners" element={
          <ProtectedRoute requireAdminOrBO>
            <Partners />
          </ProtectedRoute>
        } />
        <Route path="operators" element={
          <ProtectedRoute requireAdminOrBO>
            <Operators />
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute requireAdminOrBO>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute requireAdmin>
            <Users />
          </ProtectedRoute>
        } />
        <Route path="settings/commissions" element={
          <ProtectedRoute requireAdmin>
            <CommissionSettings />
          </ProtectedRoute>
        } />
        <Route path="settings/commissions/new" element={
          <ProtectedRoute requireAdmin>
            <CommissionWizard />
          </ProtectedRoute>
        } />
        <Route path="settings/commissions/:id" element={
          <ProtectedRoute requireAdmin>
            <CommissionWizard />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: '#082d32',
              border: '1px solid rgba(200, 243, 29, 0.2)',
              color: 'white'
            }
          }}
        />
        <AppRoutes />
        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
