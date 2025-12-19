import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
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
  Loader2
} from "lucide-react";

const ROLES = [
  { value: "admin", label: "Administrador", color: "bg-[#c8f31d] text-[#0d474f]" },
  { value: "backoffice", label: "Backoffice", color: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  { value: "vendedor", label: "Vendedor", color: "bg-white/10 text-white/70" }
];

export default function Users() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "vendedor"
  });

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/users`, { headers });
      setUsers(response.data);
    } catch (error) {
      toast.error("Erro ao carregar utilizadores");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "vendedor" });
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "vendedor"
    });
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

    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingUser) {
        // Update user
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        const response = await axios.put(`${API}/users/${editingUser.id}`, updateData, { headers });
        setUsers(users.map(u => u.id === editingUser.id ? response.data : u));
        toast.success("Utilizador atualizado");
      } else {
        // Create user
        const response = await axios.post(`${API}/auth/register`, formData, { headers });
        setUsers([...users, response.data]);
        toast.success("Utilizador criado");
      }
      
      setModalOpen(false);
    } catch (error) {
      const message = error.response?.data?.detail || "Erro ao guardar utilizador";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/users/${deleteId}`, { headers });
      setUsers(users.filter(u => u.id !== deleteId));
      toast.success("Utilizador eliminado");
    } catch (error) {
      const message = error.response?.data?.detail || "Erro ao eliminar utilizador";
      toast.error(message);
    } finally {
      setDeleteId(null);
    }
  };

  const toggleUserActive = async (userId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(`${API}/users/${userId}/toggle-active`, {}, { headers });
      setUsers(users.map(u => u.id === userId ? { ...u, active: response.data.active } : u));
      toast.success("Estado atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar estado");
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
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input mt-1"
                placeholder="••••••••"
                data-testid="user-password-input"
              />
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
