import { useEffect, useState } from "react";
import { Minus, Plus, Star, Lock, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isLocked } from "@/lib/scoring";
import { getFlagUrl } from "@/lib/flags";
import { toast } from "sonner";

type Match = {
  id: string;
  kickoff_at: string;
  home_code: string | null;
  away_code: string | null;
  home_label: string | null;
  away_label: string | null;
  is_premium: boolean;
  is_megapremium?: boolean;
  predictions_locked: boolean;
  home?: { name: string; flag: string } | null;
  away?: { name: string; flag: string } | null;
};

type Stats = { home: number; draw: number; away: number; total: number };

function FlagCircle({ code }: { code?: string | null }) {
  const url = getFlagUrl(code);
  if (url) {
    return <img src={url} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-black/10" />;
  }
  return <span className="h-14 w-14 rounded-full bg-muted ring-2 ring-black/10" />;
}

function Stepper({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const n = isNaN(parseInt(value)) ? 0 : parseInt(value);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-9 text-center text-3xl font-black tabular-nums select-none">
        {value === "" ? <span className="text-muted-foreground/30 text-2xl">?</span> : value}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(String(n + 1))}
        className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function KnockoutMatchModal({
  match,
  roundLabel,
  matchNumber,
  pred,
  stats,
  demo = false,
  onClose,
  onSaved,
}: {
  match: Match;
  roundLabel: string;
  matchNumber: number;
  pred?: { home_score: number; away_score: number };
  stats?: Stats;
  demo?: boolean;
  onClose: () => void;
  onSaved: (score?: { home_score: number; away_score: number }) => void;
}) {
  const { user } = useAuth();
  const [home, setHome] = useState(pred?.home_score?.toString() ?? "");
  const [away, setAway] = useState(pred?.away_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHome(pred?.home_score?.toString() ?? "");
    setAway(pred?.away_score?.toString() ?? "");
  }, [pred?.home_score, pred?.away_score]);

  const locked = !demo && isLocked(match.kickoff_at, match.predictions_locked);
  const hasTeams = !!(match.home_code || match.home_label) && !!(match.away_code || match.away_label);
  const canPredict = !locked && hasTeams;

  const homeName = match.home?.name ?? match.home_label ?? "Por definir";
  const awayName = match.away?.name ?? match.away_label ?? "Por definir";
  const isPremium = match.is_premium;
  const isMegapremium = match.is_megapremium;

  async function save() {
    if (home === "" || away === "") return;
    if (demo) {
      toast.success("Ejemplo actualizado (no se guarda)");
      onSaved({ home_score: Number(home), away_score: Number(away) });
      onClose();
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("predictions").upsert({
      user_id: user.id,
      match_id: match.id,
      home_score: Number(home),
      away_score: Number(away),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pronóstico guardado");
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {roundLabel} · Partido {matchNumber}
          </DialogTitle>
          <DialogDescription className="sr-only">Pronóstico de eliminatoria</DialogDescription>
        </DialogHeader>

        {isMegapremium ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600/15 border border-red-600/30 py-1.5 text-red-600 dark:text-red-400 text-xs font-bold">
            <Star className="h-3 w-3 fill-red-600 dark:fill-red-400" /> MEGAPREMIUM · triple puntuación
          </div>
        ) : isPremium && (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-gold/15 border border-gold/30 py-1.5 text-gold text-xs font-bold">
            <Star className="h-3 w-3 fill-gold" /> PREMIUM · doble puntuación
          </div>
        )}

        {/* Teams + steppers */}
        <div className="flex items-start justify-between gap-2 pt-2">
          <div className="flex flex-1 flex-col items-center gap-2">
            <FlagCircle code={match.home_code} />
            <span className="text-center text-sm font-bold leading-tight">{homeName}</span>
            <Stepper value={home} onChange={setHome} disabled={!canPredict} />
          </div>
          <span className="mt-4 text-lg font-black text-muted-foreground">VS</span>
          <div className="flex flex-1 flex-col items-center gap-2">
            <FlagCircle code={match.away_code} />
            <span className="text-center text-sm font-bold leading-tight">{awayName}</span>
            <Stepper value={away} onChange={setAway} disabled={!canPredict} />
          </div>
        </div>

        {/* Porcentajes de la gente */}
        {stats && stats.total > 0 && (
          <div className="flex justify-around text-xs text-muted-foreground border-t border-border pt-2">
            <span className="font-medium">{Math.round((stats.home / stats.total) * 100)}% {homeName.split(" ")[0]}</span>
            <span>·</span>
            <span className="font-medium">{Math.round((stats.draw / stats.total) * 100)}% Empate</span>
            <span>·</span>
            <span className="font-medium">{awayName.split(" ")[0]} {Math.round((stats.away / stats.total) * 100)}%</span>
          </div>
        )}

        {/* Action */}
        {canPredict ? (
          <button
            onClick={save}
            disabled={saving || home === "" || away === ""}
            className={`w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-opacity hover:opacity-90 ${
              isMegapremium ? "bg-red-600 text-white" : isPremium ? "bg-gold text-pitch-deep" : "bg-pitch-deep text-white dark:bg-primary dark:text-primary-foreground"
            }`}
          >
            {saving ? "Guardando…" : pred ? "Actualizar pronóstico" : "Guardar pronóstico"}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-3 text-sm text-muted-foreground">
            {!hasTeams ? (
              <><Clock className="h-4 w-4" /> Aún no se conocen los equipos</>
            ) : (
              <><Lock className="h-4 w-4" /> Pronóstico cerrado</>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
