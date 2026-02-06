import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { pushManager } from "@/lib/pushManager";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showOpenApp, setShowOpenApp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (pushManager.isStandalone()) {
      localStorage.setItem("leiritrix_pwa_installed", "true");
      return;
    }

    const wasInstalled = localStorage.getItem("leiritrix_pwa_installed");
    if (wasInstalled) {
      setShowOpenApp(true);
      return;
    }

    const dismissed = sessionStorage.getItem("install_dismissed");
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (ios && !pushManager.isStandalone()) {
      const iosDismissed = localStorage.getItem("ios_install_dismissed");
      if (!iosDismissed) {
        setTimeout(() => setShowBanner(true), 2000);
      }
    }

    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.setItem("leiritrix_pwa_installed", "true");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        localStorage.setItem("leiritrix_pwa_installed", "true");
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowOpenApp(false);
    sessionStorage.setItem("install_dismissed", "true");
    if (isIOS) {
      localStorage.setItem("ios_install_dismissed", "true");
    }
  };

  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4">
        <div className="bg-[#082d32] border border-white/10 rounded-xl p-6 w-full max-w-sm animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-['Manrope'] font-bold text-lg">
              Instalar no iPhone/iPad
            </h3>
            <button onClick={() => setShowIOSGuide(false)} className="text-white/50">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4 text-white/70 text-sm">
            <div className="flex items-start gap-3">
              <span className="bg-[#c8f31d] text-[#031819] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </span>
              <p>
                Toque no botao de partilha{" "}
                <span className="inline-block w-5 h-5 bg-white/20 rounded text-center text-xs leading-5">
                  &#x2191;
                </span>{" "}
                na barra do Safari
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-[#c8f31d] text-[#031819] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </span>
              <p>Selecione "Adicionar ao ecra principal"</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-[#c8f31d] text-[#031819] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </span>
              <p>Confirme tocando em "Adicionar"</p>
            </div>
          </div>
          <Button
            onClick={() => setShowIOSGuide(false)}
            className="w-full mt-6 bg-[#c8f31d] hover:bg-[#b5db1a] text-[#031819] font-semibold"
          >
            Entendi
          </Button>
        </div>
      </div>
    );
  }

  if (showOpenApp) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <div className="bg-[#082d32] border border-[#c8f31d]/30 rounded-xl p-4 shadow-lg flex items-center gap-3">
          <Smartphone className="text-[#c8f31d] flex-shrink-0" size={24} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">App instalada</p>
            <p className="text-white/50 text-xs">
              Abra a Leiritrix no ecra principal para melhor experiencia
            </p>
          </div>
          <button onClick={handleDismiss} className="text-white/40 hover:text-white/70">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-[#082d32] border border-[#c8f31d]/30 rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="bg-[#c8f31d]/10 rounded-lg p-2 flex-shrink-0">
            <Download className="text-[#c8f31d]" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Instalar Leiritrix CRM</p>
            <p className="text-white/50 text-xs mt-0.5">
              Acesso rapido no ecra principal com notificacoes
            </p>
          </div>
          <button onClick={handleDismiss} className="text-white/40 hover:text-white/70 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleInstall}
            size="sm"
            className="flex-1 bg-[#c8f31d] hover:bg-[#b5db1a] text-[#031819] font-semibold text-xs"
          >
            <Download size={14} className="mr-1" />
            Instalar
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-white/50 hover:text-white hover:bg-white/5 text-xs"
          >
            Agora nao
          </Button>
        </div>
      </div>
    </div>
  );
}
