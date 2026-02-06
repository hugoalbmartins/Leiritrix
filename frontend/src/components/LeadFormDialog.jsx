import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateSelect } from "@/components/ui/date-select";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, ArrowUpRight, Target } from "lucide-react";

const CATEGORIES = [
  { value: "energia", label: "Energia" },
  { value: "telecomunicacoes", label: "Telecomunicacoes" },
  { value: "paineis_solares", label: "Paineis Solares" },
];

const SOURCES = [
  { value: "telefone", label: "Telefone" },
  { value: "email", label: "Email" },
  { value: "presencial", label: "Presencial" },
  { value: "website", label: "Website" },
  { value: "referencia", label: "Referencia" },
  { value: "outro", label: "Outro" },
];

const STATUSES = [
  { value: "nova", label: "Nova" },
  { value: "em_contacto", label: "Em Contacto" },
  { value: "qualificada", label: "Qualificada" },
  { value: "convertida", label: "Convertida" },
  { value: "perdida", label: "Perdida" },
];

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const STATUS_COLORS = {
  nova: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  em_contacto: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  qualificada: "bg-green-500/20 text-green-400 border-green-500/30",
  convertida: "bg-[#c8f31d]/20 text-[#c8f31d] border-[#c8f31d]/30",
  perdida: "bg-red-500/20 text-red-400 border-red-500/30",
};

const defaultForm = {
  client_name: "",
  client_email: "",
  client_phone: "",
  client_nif: "",
  street_address: "",
  postal_code: "",
  city: "",
  category: "energia",
  source: "outro",
  status: "nova",
  priority: "media",
  notes: "",
  next_contact_date: null,
  assigned_to: "",
  partner_id: "",
  operator_id: "",
};

export default function LeadFormDialog({ open, onOpenChange, lead, onSave, onConvert, partners, operators, users }) {
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        client_name: lead.client_name || "",
        client_email: lead.client_email || "",
        client_phone: lead.client_phone || "",
        client_nif: lead.client_nif || "",
        street_address: lead.street_address || "",
        postal_code: lead.postal_code || "",
        city: lead.city || "",
        category: lead.category || "energia",
        source: lead.source || "outro",
        status: lead.status || "nova",
        priority: lead.priority || "media",
        notes: lead.notes || "",
        next_contact_date: lead.next_contact_date ? new Date(lead.next_contact_date) : null,
        assigned_to: lead.assigned_to || "",
        partner_id: lead.partner_id || "",
        operator_id: lead.operator_id || "",
      });
    } else {
      setFormData(defaultForm);
    }
  }, [lead, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDateForDB = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_name || !formData.category) return;

    setSaving(true);
    try {
      const payload = {
        client_name: formData.client_name,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        client_nif: formData.client_nif || null,
        street_address: formData.street_address || null,
        postal_code: formData.postal_code || null,
        city: formData.city || null,
        category: formData.category,
        source: formData.source,
        status: formData.status,
        priority: formData.priority,
        notes: formData.notes || null,
        next_contact_date: formatDateForDB(formData.next_contact_date),
        assigned_to: formData.assigned_to || null,
        partner_id: formData.partner_id || null,
        operator_id: formData.operator_id || null,
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const isConverted = lead?.status === "convertida";
  const isLost = lead?.status === "perdida";
  const canConvert = lead && !isConverted && !isLost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#082d32] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-['Manrope'] text-xl flex items-center gap-2">
            <Target size={20} className="text-[#c8f31d]" />
            {lead ? "Editar Lead" : "Nova Lead"}
            {lead && (
              <Badge className={`${STATUS_COLORS[lead.status]} border ml-2`}>
                {STATUSES.find(s => s.value === lead.status)?.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {lead ? "Atualize os dados da lead" : "Preencha os dados do potencial cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="form-label">Nome do Cliente *</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => handleChange("client_name", e.target.value)}
                className="form-input"
                placeholder="Nome completo"
                required
              />
            </div>

            <div>
              <Label className="form-label">Telefone</Label>
              <Input
                value={formData.client_phone}
                onChange={(e) => handleChange("client_phone", e.target.value)}
                className="form-input"
                placeholder="912 345 678"
              />
            </div>

            <div>
              <Label className="form-label">Email</Label>
              <Input
                type="email"
                value={formData.client_email}
                onChange={(e) => handleChange("client_email", e.target.value)}
                className="form-input"
                placeholder="cliente@email.pt"
              />
            </div>

            <div>
              <Label className="form-label">NIF</Label>
              <Input
                value={formData.client_nif}
                onChange={(e) => handleChange("client_nif", e.target.value)}
                className="form-input"
                placeholder="123456789"
                maxLength={9}
              />
            </div>

            <div>
              <Label className="form-label">Localidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="form-input"
                placeholder="Lisboa"
              />
            </div>

            <div>
              <Label className="form-label">Morada</Label>
              <Input
                value={formData.street_address}
                onChange={(e) => handleChange("street_address", e.target.value)}
                className="form-input"
                placeholder="Rua das Flores, 123"
              />
            </div>

            <div>
              <Label className="form-label">Codigo Postal</Label>
              <Input
                value={formData.postal_code}
                onChange={(e) => handleChange("postal_code", e.target.value)}
                className="form-input"
                placeholder="1000-100"
                maxLength={8}
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="form-label">Categoria *</Label>
                <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
                  <SelectTrigger className="form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-white/10">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="form-label">Origem</Label>
                <Select value={formData.source} onValueChange={(v) => handleChange("source", v)}>
                  <SelectTrigger className="form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {SOURCES.map((src) => (
                      <SelectItem key={src.value} value={src.value} className="text-white hover:bg-white/10">
                        {src.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="form-label">Prioridade</Label>
                <Select value={formData.priority} onValueChange={(v) => handleChange("priority", v)}>
                  <SelectTrigger className="form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-white hover:bg-white/10">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {lead && (
                <div>
                  <Label className="form-label">Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                    <SelectTrigger className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082d32] border-white/10">
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-white hover:bg-white/10">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="form-label">Operadora</Label>
                <Select value={formData.operator_id || "none"} onValueChange={(v) => handleChange("operator_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    <SelectItem value="none" className="text-white hover:bg-white/10">Nenhuma</SelectItem>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id} className="text-white hover:bg-white/10">
                        {op.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="form-label">Parceiro</Label>
                <Select value={formData.partner_id || "none"} onValueChange={(v) => handleChange("partner_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    <SelectItem value="none" className="text-white hover:bg-white/10">Nenhum</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white hover:bg-white/10">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="form-label">Atribuida a</Label>
                <Select value={formData.assigned_to || "none"} onValueChange={(v) => handleChange("assigned_to", v === "none" ? "" : v)}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10">
                    <SelectItem value="none" className="text-white hover:bg-white/10">Ninguem</SelectItem>
                    {users.filter(u => u.active).map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-white hover:bg-white/10">
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="form-label">Proximo Contacto</Label>
                <DateSelect
                  value={formData.next_contact_date}
                  onChange={(date) => handleChange("next_contact_date", date)}
                  placeholder="Selecionar data"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="form-label">Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="form-input min-h-20"
              placeholder="Observacoes sobre a lead..."
            />
          </div>

          <div className="flex justify-between items-center gap-3 pt-2 border-t border-white/5">
            <div>
              {canConvert && (
                <Button
                  type="button"
                  onClick={() => { onOpenChange(false); onConvert(lead); }}
                  className="bg-[#c8f31d] hover:bg-[#b5db1a] text-[#031819]"
                >
                  <ArrowUpRight size={16} className="mr-2" />
                  Converter em Venda
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="btn-secondary">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="btn-primary btn-primary-glow">
                {saving ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />A guardar...</>
                ) : (
                  <><Save size={16} className="mr-2" />Guardar</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
