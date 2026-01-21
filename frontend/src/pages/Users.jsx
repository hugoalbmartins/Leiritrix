import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { usersService } from "@/services/usersService";
import { authService } from "@/services/authService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Users as UsersIcon,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { generatePassword } from "@/utils/passwordGenerator";

const ROLES = [
  { value: "admin", label: "Administrador", color: "bg-[#c8f31d] text-[#0d474f]" },
  { value: "backoffice", label: "Backoffice", color: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  { value: "vendedor", label: "Vendedor", color: "bg-white/10 text-white/70" }
];

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "vendedor",
    commission_percentage: 0,
    commission_threshold: 0
  });

  const handleGeneratePassword = () => {
    const generated = generatePassword(12);
    setFormData({ ...formData, password: generated, confirmPassword: generated });
    setShowPassword(true);
    setShowConfirmPassword(true);
    toast.success("Password sugerida (pode editar se preferir)");
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await usersService.getUsers(true);
      setUsers(usersData);
    } catch (error) {
      toast.error("Erro ao carregar utilizadores");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "vendedor",
      commission_percentage: 0,
      commission_threshold: 0
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      confirmPassword: "",
      role: user.role || "vendedor",
      commission_percentage: user.commission_percentage || 0,
      commission_threshold: user.commission_threshold || 0
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Nome e Email são obrigatórios");
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error("Password é obrigatória para novos utilizadores");
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("As passwords não coincidem");
      return;
    }

    const normalizedEmail = formData.email.toLowerCase().trim();

    setSaving(true);
    try {
      if (editingUser) {
        const updateData = {
          name: formData.name,
          email: normalizedEmail,
          role: formData.role,
          commission_percentage: formData.role === 'backoffice' ? formData.commission_percentage : 0,
          commission_threshold: formData.role === 'backoffice' ? formData.commission_threshold : 0
        };

        const updated = await usersService.updateUser(editingUser.id, updateData);
        setUsers(users.map(u => u.id === editingUser.id ? updated : u));
        toast.success("Utilizador atualizado");
      } else {
        const { user: newUser } = await authService.signUp(
          normalizedEmail,
          formData.password,
          {
            email: normalizedEmail,
            name: formData.name,
            role: formData.role,
            commission_percentage: formData.role === 'backoffice' ? formData.commission_percentage : 0,
            commission_threshold: formData.role === 'backoffice' ? formData.commission_threshold : 0
          }
        );
        setUsers([...users, newUser]);
        toast.success("Utilizador criado");
      }

      setModalOpen(false);
    } catch (error) {
      const message = error.message || "Erro ao guardar utilizador";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await usersService.deleteUser(deleteId);
      setUsers(users.filter(u => u.id !== deleteId));
      toast.success("Utilizador eliminado");
    } catch (error) {
      const message = error.message || "Erro ao eliminar utilizador";
      toast.error(message);
    } finally {
      setDeleteId(null);
    }
  };

  const toggleUserActive = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      const updated = await usersService.toggleUserActive(userId, !user.active);
      setUsers(users.map(u => u.id === userId ? updated : u));
      toast.success("Estado atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar estado");
    }
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordUser(user);
    const generated = generatePassword(12);
    setNewPassword(generated);
    setResetPasswordModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("A password deve ter no mínimo 8 caracteres");
      return;
    }

    setResettingPassword(true);
    try {
      await usersService.resetUserPassword(resetPasswordUser.id, newPassword);
      toast.success("Password alterada com sucesso");
      setResetPasswordModalOpen(false);
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (error) {
      const message = error.message || "Erro ao resetar password";
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleInfo = ROLES.find(r => r.value === role);
    return roleInfo || ROLES[2];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Manrope']">Utilizadores</h1>
          <p className="text-white/50 text-sm mt-1">Gerir utilizadores do sistema</p>
        </div>
        <Button 
          onClick={openCreateModal}
          className="btn-primary btn-primary-glow flex items-center gap-2"
          data-testid="new-user-btn"
        >
          <Plus size={18} />
          Novo Utilizador
        </Button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const roleInfo = getRoleBadge(user.role);
          const isCurrentUser = user.id === currentUser?.id;
          
          return (
            <Card key={user.id} className="card-leiritrix" data-testid={`user-card-${user.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.active ? 'bg-[#c8f31d]/20' : 'bg-white/10'}`}>
                      <UsersIcon size={20} className={user.active ? 'text-[#c8f31d]' : 'text-white/40'} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-white/50 text-sm">{user.email}</p>
                    </div>
                  </div>
                  {!user.active && (
                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                      Inativo
                    </Badge>
                  )}
                </div>

                <div className="mb-4">
                  <Badge className={`${roleInfo.color} text-xs`}>
                    {roleInfo.label}
                  </Badge>
                  {isCurrentUser && (
                    <Badge className="ml-2 bg-white/10 text-white/50 text-xs">
                      Você
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <Button
                    onClick={() => openEditModal(user)}
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-white/70 hover:text-[#c8f31d]"
                    data-testid={`edit-user-${user.id}`}
                  >
                    <Edit2 size={16} className="mr-1" />
                    Editar
                  </Button>

                  {!isCurrentUser && (
                    <>
                      <Button
                        onClick={() => openResetPasswordModal(user)}
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-blue-400"
                        title="Resetar Password"
                        data-testid={`reset-password-${user.id}`}
                      >
                        <RefreshCw size={16} />
                      </Button>
                      <Button
                        onClick={() => toggleUserActive(user.id)}
                        variant="ghost"
                        size="sm"
                        className={`${user.active ? 'text-red-400 hover:bg-red-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
                        data-testid={`toggle-user-${user.id}`}
                      >
                        {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </Button>
                      <Button
                        onClick={() => setDeleteId(user.id)}
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-red-400"
                        data-testid={`delete-user-${user.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit User Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#082d32] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-['Manrope']">
              {editingUser ? "Editar Utilizador" : "Novo Utilizador"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="form-label">Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input mt-1"
                placeholder="Nome completo"
                data-testid="user-name-input"
              />
            </div>
            <div>
              <Label className="form-label">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input mt-1"
                placeholder="email@leiritrix.pt"
                data-testid="user-email-input"
              />
            </div>
            <div>
              <Label className="form-label">
                Palavra-passe {editingUser ? "(deixe vazio para manter)" : "*"}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-input pr-24"
                  placeholder={editingUser ? "Deixe vazio para manter a atual" : "Digite ou gere uma password"}
                  data-testid="user-password-input"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[#c8f31d] hover:text-[#d4f92e] transition-colors p-1"
                    title="Gerar password automática"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/50 hover:text-white transition-colors p-1"
                    title={showPassword ? "Ocultar password" : "Mostrar password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-1">
                Min 8 caracteres: 1 maiúscula, 1 minúscula, 1 número, 1 especial
              </p>
            </div>
            <div>
              <Label className="form-label">
                Confirmar Palavra-passe {editingUser ? "(deixe vazio para manter)" : "*"}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="form-input pr-10"
                  placeholder={editingUser ? "Deixe vazio para manter a atual" : "Confirme a password"}
                  data-testid="user-confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
                  title={showConfirmPassword ? "Ocultar password" : "Mostrar password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <Label className="form-label flex items-center gap-1">
                <Shield size={14} /> Role
              </Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger className="form-input mt-1" data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#082d32] border-white/10">
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="text-white hover:bg-white/10">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'backoffice' && (
              <>
                <div>
                  <Label className="form-label">Percentagem de Comissão (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.commission_percentage || 0}
                    onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                    className="form-input mt-1"
                    placeholder="0.00"
                    data-testid="user-commission-percentage-input"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Percentagem sobre comissões de operadoras visíveis (0-100%)
                  </p>
                </div>
                <div>
                  <Label className="form-label">Limiar Mínimo de Comissões (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.commission_threshold || 0}
                    onChange={(e) => setFormData({ ...formData, commission_threshold: parseFloat(e.target.value) || 0 })}
                    className="form-input mt-1"
                    placeholder="0.00"
                    data-testid="user-commission-threshold-input"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Valor mínimo de comissões totais visíveis que precisa ser atingido para receber comissão
                  </p>
                </div>
              </>
            )}
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
              data-testid="save-user-btn"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                editingUser ? "Guardar" : "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <DialogContent className="bg-[#082d32] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-['Manrope']">
              Resetar Password de {resetPasswordUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                Uma nova password será gerada. Copie e envie ao utilizador por um canal seguro.
                O utilizador terá de alterar a password no próximo login.
              </p>
            </div>
            <div>
              <Label className="form-label">Nova Password</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input mt-1 pr-24 font-mono"
                  placeholder="Mínimo 8 caracteres"
                  data-testid="reset-password-input"
                />
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    toast.success("Password copiada!");
                  }}
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#c8f31d] hover:text-[#c8f31d]/80 text-xs"
                >
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-white/40 mt-2">
                Password gerada automaticamente. Pode editá-la antes de confirmar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setResetPasswordModalOpen(false);
                setResetPasswordUser(null);
                setNewPassword("");
              }}
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="btn-primary btn-primary-glow"
              data-testid="confirm-reset-password-btn"
            >
              {resettingPassword ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  A resetar...
                </>
              ) : (
                <>
                  <RefreshCw size={18} className="mr-2" />
                  Resetar Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#082d32] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Utilizador</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem a certeza que pretende eliminar este utilizador? Esta ação não pode ser revertida.
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
