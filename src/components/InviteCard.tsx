import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function InviteCard() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const message = `🏆 Únete a El Mundial conmigo. Pronostica los partidos y compite por el trofeo: ${url}`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: "El Mundial", text: message, url }); } catch { /* cancel */ }
    } else {
      copy();
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
      <span className="text-xl shrink-0">👥</span>
      <span className="flex-1 text-sm font-medium text-muted-foreground">Invita a tus amigos</span>
      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe58] text-white px-3 py-1.5 text-xs font-semibold transition-colors"
      >
        📲 WhatsApp
      </a>
      <button
        onClick={nativeShare}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
