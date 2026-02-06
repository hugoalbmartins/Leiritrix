import { useState, useEffect } from 'react';
import { useAuth } from '@/App';
import { backupsService } from '@/services/backupsService';
import { notificationsService } from '@/services/notificationsService';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function BackupAlert() {
  const { user } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const checkBackup = async () => {
      try {
        const needed = await backupsService.checkBackupNeeded();
        if (!needed) return;

        const dismissedKey = `backup_alert_dismissed_${new Date().toISOString().slice(0, 10)}`;
        if (sessionStorage.getItem(dismissedKey)) return;

        setShowAlert(true);

        const notifKey = `backup_notif_sent_${new Date().toISOString().slice(0, 10)}`;
        if (!sessionStorage.getItem(notifKey)) {
          try {
            await notificationsService.createNotification(
              user.id,
              'Alerta de Backup',
              'Nao foi efetuado nenhum backup de vendas nos ultimos 3 dias. Recomendamos que efetue um backup para seguranca dos dados.',
              'backup_alert'
            );
            sessionStorage.setItem(notifKey, 'true');
          } catch (notifErr) {
            console.error('Error creating backup notification:', notifErr);
          }
        }
      } catch (err) {
        console.error('Error checking backup status:', err);
      }
    };

    const timer = setTimeout(checkBackup, 2000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleBackup = async () => {
    setExporting(true);
    try {
      const result = await backupsService.exportSalesToExcel(user.id, user.name);
      toast.success(`Backup concluido: ${result.totalSales} vendas exportadas`);
      setShowAlert(false);
    } catch (err) {
      console.error('Error exporting backup:', err);
      toast.error('Erro ao exportar backup');
    } finally {
      setExporting(false);
    }
  };

  const handleDismiss = () => {
    const dismissedKey = `backup_alert_dismissed_${new Date().toISOString().slice(0, 10)}`;
    sessionStorage.setItem(dismissedKey, 'true');
    setShowAlert(false);
  };

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="bg-[#082d32] border-white/10 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/20">
              <ShieldAlert size={24} className="text-amber-400" />
            </div>
            <AlertDialogTitle className="text-white text-lg">
              Alerta de Backup
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-white/60 leading-relaxed">
            Nao foi efetuado nenhum backup de vendas nos ultimos dias.
            Para garantir a seguranca dos dados, recomendamos que efetue
            um backup agora. O ficheiro Excel sera descarregado com todas
            as vendas registadas no sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="btn-secondary"
          >
            Mais Tarde
          </Button>
          <Button
            onClick={handleBackup}
            disabled={exporting}
            className="btn-primary btn-primary-glow flex items-center gap-2"
          >
            <Download size={16} />
            {exporting ? 'A exportar...' : 'Fazer Backup Agora'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
