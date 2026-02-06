import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail } from "lucide-react";
import { authService } from "@/services/authService";

const LOGO_URL = "/favicon.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setUser(user);
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    checkAuth();
  }, [navigate, setUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { user } = await authService.signIn(email, password);
      setUser(user);
      toast.success("Login efetuado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={LOGO_URL} 
            alt="CRM Leiritrix" 
            className="h-12"
            data-testid="login-logo"
          />
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2 font-['Manrope']">
          Bem-vindo
        </h2>
        <p className="text-white/50 text-center mb-8 text-sm">
          Aceda à sua conta para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
          <div>
            <Label htmlFor="email" className="form-label flex items-center gap-2">
              <Mail size={16} className="text-[#c8f31d]" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.pt"
              className="form-input mt-1"
              data-testid="email-input"
            />
          </div>

          <div>
            <Label htmlFor="password" className="form-label flex items-center gap-2">
              <Lock size={16} className="text-[#c8f31d]" />
              Palavra-passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input mt-1"
              data-testid="password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full btn-primary btn-primary-glow"
            data-testid="login-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                A entrar...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
