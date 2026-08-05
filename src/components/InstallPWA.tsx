import { useEffect, useState } from "react";
import { Download, X, ChevronDown, ChevronUp } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa_install_dismissed_v1";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;

    if (ios) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/40 shadow-soft">
      <img src="/images/logo/logo-cuadrado.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-top" />
      <div className="absolute inset-0 bg-gradient-to-r from-pitch-deep/95 via-pitch-deep/80 to-pitch-deep/40" />

      <div className="relative p-3 text-primary-foreground">
        <div className="flex items-center gap-3">
          <span className="text-xl shrink-0">🏆</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs leading-tight">¡Instala la app en tu teléfono!</div>
            <div className="text-[11px] text-white/60">Acceso directo desde la pantalla de inicio.</div>
          </div>
          {!isIOS ? (
            <button
              onClick={install}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-gold-foreground hover:bg-gold/90 active:scale-95 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Instalar
            </button>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-gold-foreground hover:bg-gold/90 transition-all"
            >
              Cómo hacerlo
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1 text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {isIOS && expanded && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2">
              <span className="text-base shrink-0">1️⃣</span>
              <div className="text-[11px] text-white/90 leading-snug">
                Toca el botón <span className="font-bold text-white">Compartir ⬆️</span> en la barra inferior de Safari
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2">
              <span className="text-base shrink-0">2️⃣</span>
              <div className="text-[11px] text-white/90 leading-snug">
                En el menú que aparece, <span className="font-bold text-white">baja un poco con el dedo</span> hasta ver <span className="font-bold text-white">"Añadir a pantalla de inicio"</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2">
              <span className="text-base shrink-0">3️⃣</span>
              <div className="text-[11px] text-white/90 leading-snug">
                Pulsa <span className="font-bold text-white">"Añadir"</span> arriba a la derecha
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-gold/15 border border-gold/30 px-3 py-1.5">
              <span className="text-xs shrink-0">⚠️</span>
              <p className="text-[10px] text-white/60 leading-snug">
                La primera vez tendrás que <span className="font-semibold text-white/80">iniciar sesión de nuevo</span> — es normal en iPhone.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
