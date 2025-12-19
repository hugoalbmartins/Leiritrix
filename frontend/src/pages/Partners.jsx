import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building2, 
  Plus, 
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Mail,
  Phone,
  User
} from "lucide-react";

export default function Partners() {
  const { token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact_person: "",
    phone: ""
  });

  useEffect(() => {
    fetchPartners();
  }, [token]);

  const fetchPartners = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/partners/all`, { headers });
      setPartners(response.data);
    } catch (error) {
      toast.error("Erro ao carregar parceiros");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPartner(null);
    setFormData({ name: "", email: "", contact_person: "", phone: "" });
    setModalOpen(true);
  };

  const openEditModal = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || "",
      email: partner.email || "",
      contact_person: partner.contact_person || "",
      phone: partner.phone || ""
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingPartner) {
        const response = await axios.put(`${API}/partners/${editingPartner.id}`, formData, { headers });
        setPartners(partners.map(p => p.id === editingPartner.id ? response.data : p));
        toast.success("Parceiro atualizado");
      } else {
        const response = await axios.post(`${API}/partners`, formData, { headers });
        setPartners([...partners, response.data]);
        toast.success("Parceiro criado");
      }
      
      setModalOpen(false);
    } catch (error) {
      toast.error("Erro ao guardar parceiro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.delete(`${API}/partners/${deleteId}`, { headers });
      
      if (response.data.message.includes("desativado")) {
        // Partner was deactivated, not deleted
        setPartners(partners.map(p => p.id === deleteId ? { ...p, active: false } : p));
        toast.success("Parceiro desativado (tem vendas associadas)");
      } else {
        setPartners(partners.filter(p => p.id !== deleteId));
        toast.success("Parceiro eliminado");
      }
    } catch (error) {
      toast.error("Erro ao eliminar parceiro");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (partnerId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(`${API}/partners/${partnerId}/toggle-active`, {}, { headers });
      setPartners(partners.map(p => p.id === partnerId ? { ...p, active: response.data.active } : p));
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
    <div className="space-y-6" data-testid="partners-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Manrope']">Parceiros</h1>
          <p className="text-white/50 text-sm mt-1">Gerir parceiros de negócio</p>
        </div>
        <Button 
          onClick={openCreateModal}
          className="btn-primary btn-primary-glow flex items-center gap-2"
          data-testid="new-partner-btn"
        >
          <Plus size={18} />
          Novo Parceiro
        </Button>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.length > 0 ? (
          partners.map((partner) => (
            <Card key={partner.id} className="card-leiritrix" data-testid={`partner-card-${partner.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${partner.active ? 'bg-[#c8f31d]/20' : 'bg-white/10'}`}>
                      <Building2 size={20} className={partner.active ? 'text-[#c8f31d]' : 'text-white/40'} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{partner.name}</p>
                      {!partner.active && (
                        <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs mt-1">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {partner.contact_person && (
                    <div className="flex items-center gap-2 text-white/70">
                      <User size={14} />
                      <span>{partner.contact_person}</span>
                    </div>
                  )}
                  {partner.email && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Mail size={14} />
                      <span>{partner.email}</span>
                    </div>
                  )}
                  {partner.phone && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Phone size={14} />
                      <span>{partner.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                  <Button
                    onClick={() => openEditModal(partner)}
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-white/70 hover:text-[#c8f31d]"
                    data-testid={`edit-partner-${partner.id}`}
                  >
                    <Edit2 size={16} className="mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => toggleActive(partner.id)}
                    variant="ghost"
                    size="sm"
                    className={`${partner.active ? 'text-red-400 hover:bg-red-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
                    data-testid={`toggle-partner-${partner.id}`}
                  >
                    {partner.active ? <PowerOff size={16} /> : <Power size={16} />}
                  </Button>
                  <Button
                    onClick={() => setDeleteId(partner.id)}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-red-400"
                    data-testid={`delete-partner-${partner.id}`}
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
              <Building2 size={48} className="mx-auto text-white/20 mb-4" />
              <p className="text-white/50">Nenhum parceiro registado</p>
              <Button 
                onClick={openCreateModal}
                className="btn-primary btn-primary-glow mt-4"
              >
                Criar Primeiro Parceiro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#082d32] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-['Manrope']">
              {editingPartner ? "Editar Parceiro" : "Novo Parceiro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="form-label">Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input mt-1"
                placeholder="Nome da empresa"
                data-testid="partner-name-input"
              />
            </div>
            <div>
              <Label className="form-label">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input mt-1"
                placeholder="email@parceiro.pt"
                data-testid="partner-email-input"
              />
            </div>
            <div>
              <Label className="form-label">Pessoa de Contacto</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="form-input mt-1"
                placeholder="Nome do contacto"
                data-testid="partner-contact-input"
              />
            </div>
            <div>
              <Label className="form-label">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-input mt-1"
                placeholder="912 345 678"
                data-testid="partner-phone-input"
              />
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
              data-testid="save-partner-btn"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                editingPartner ? "Guardar" : "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#082d32] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Parceiro</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem a certeza que pretende eliminar este parceiro? Se tiver vendas associadas, será apenas desativado.
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
