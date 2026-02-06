import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Loader2, ShoppingCart, Clock, Target } from "lucide-react";
import { pushManager } from "@/lib/pushManager";
import { notificationPreferencesService } from "@/services/notificationPreferencesService";
import { toast } from "sonner";

export default function NotificationSettings({ open, onOpenChange, userId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState({
    sales_alerts: true,
    loyalty_alerts: true,
    lead_alerts: true,
  });

  useEffect(() => {
    if (open && userId) {
      loadState();
    }
  }, [open, userId]);

  const loadState = async () => {
    setLoading(true);
    try {
      setPermission(pushManager.getPermission());
      const isSub = await pushManager.isSubscribed();
      setSubscribed(isSub);

      const savedPrefs = await notificationPreferencesService.getPreferences(userId);
      if (savedPrefs) {
        setPrefs({
          sales_alerts: savedPrefs.sales_alerts,
          loyalty_alerts: savedPrefs.loyalty_alerts,
          lead_alerts: savedPrefs.lead_alerts,
        });
      }
    } catch (e) {
      console.error("Error loading notification state:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    setSaving(true);
    try {
      if (subscribed) {
        await pushManager.unsubscribe(userId);
        setSubscribed(false);
        toast.success("Notificacoes desativadas");
      } else {
        const perm = await pushManager.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          toast.error("Permissao de notificacoes negada. Ative nas definicoes do browser.");
          return;
        }
        const sub = await pushManager.subscribe(userId);
        if (sub) {
          setSubscribed(true);
          toast.success("Notificacoes ativadas");
        } else {
          toast.error("Erro ao ativar notificacoes");
        }
      }
    } catch (e) {
      console.error("Error toggling notifications:", e);
      toast.error("Erro ao alterar notificacoes");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      await notificationPreferencesService.upsertPreferences(userId, prefs);
      toast.success("Preferencias guardadas");
      onOpenChange(false);
    } catch (e) {
      console.error("Error saving preferences:", e);
      toast.error("Erro ao guardar preferencias");
    } finally {
      setSaving(false);
    }
  };

  const handlePrefChange = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const permissionBlocked = permission === "denied";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#082d32] border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white font-['Manrope'] text-xl flex items-center gap-2">
            <Bell size={20} className="text-[#c8f31d]" />
            Notificacoes
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Escolha que notificacoes deseja receber
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-white/50" size={24} />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Push notification toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                {subscribed ? (
                  <Bell className="text-[#c8f31d]" size={20} />
                ) : (
                  <BellOff className="text-white/40" size={20} />
                )}
                <div>
                  <p className="text-white font-medium text-sm">
                    Notificacoes push
                  </p>
                  <p className="text-white/40 text-xs">
                    {permissionBlocked
                      ? "Bloqueado - ative nas definicoes do browser"
                      : subscribed
                      ? "Ativadas"
                      : "Desativadas"}
                  </p>
                </div>
              </div>
              {!permissionBlocked && (
                <Switch
                  checked={subscribed}
                  onCheckedChange={handleToggleNotifications}
                  disabled={saving}
                />
              )}
              {permissionBlocked && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                  Bloqueado
                </Badge>
              )}
            </div>

            {/* Notification types */}
            <div className="space-y-1">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">
                Tipos de notificacao
              </p>

              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-blue-400" size={18} />
                  <div>
                    <Label className="text-white text-sm cursor-pointer">Alertas de Vendas</Label>
                    <p className="text-white/40 text-xs">Novas vendas e alteracoes de estado</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.sales_alerts}
                  onCheckedChange={() => handlePrefChange("sales_alerts")}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Clock className="text-orange-400" size={18} />
                  <div>
                    <Label className="text-white text-sm cursor-pointer">
                      Fim de Fidelizacao
                    </Label>
                    <p className="text-white/40 text-xs">
                      Alertas diarios nos 4 ultimos dias
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.loyalty_alerts}
                  onCheckedChange={() => handlePrefChange("loyalty_alerts")}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Target className="text-green-400" size={18} />
                  <div>
                    <Label className="text-white text-sm cursor-pointer">Alertas de Leads</Label>
                    <p className="text-white/40 text-xs">Follow-ups pendentes e novas leads</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.lead_alerts}
                  onCheckedChange={() => handlePrefChange("lead_alerts")}
                  disabled={saving}
                />
              </div>
            </div>

            <Button
              onClick={handleSavePrefs}
              disabled={saving}
              className="w-full btn-primary btn-primary-glow"
            >
              {saving ? (
                <><Loader2 size={16} className="mr-2 animate-spin" />A guardar...</>
              ) : (
                "Guardar Preferencias"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
