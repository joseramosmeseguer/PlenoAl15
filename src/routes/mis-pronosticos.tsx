import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useClubMatches, useMyClubPredictions } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronDown, RotateCw } from "lucide-react";
import estadioOscuro from "@/assets/EstadioNormalOscuro.png";
import estadioClaro from "@/assets/EstadioNormalClaro.png";
import estadioEpico1 from "@/assets/EstadioEpico1.png";
import estadioEpico2 from "@/assets/EstadioEpico2.png";
import estadioFondo from "@/assets/Estadiofutbolfondo.png";

const STADIUM_BACKGROUNDS = [estadioOscuro, estadioEpico1, estadioFondo, estadioEpico2, estadioClaro];

export const Route = createFileRoute("/mis-pronosticos")({
  component: MyPredictions,
  head: () => ({ meta: [{ title: "Pronósticos · Pleno al 15" }] }),
});

function crestUrl(teamId?: number) {
  return teamId ? `/images/crests/${teamId}.png` : null;
}

function MyPredictions() {
  const { user } = useAuth();
  const { data: matches } = useClubMatches();
  const { data: myPreds } = useMyClubPredictions(user?.id);
  const [matchday, setMatchday] = useState<number | null>(null);

  const predMap = useMemo(() => {
    const m: Record<number, { home_score: number; away_score: number }> = {};
    (myPreds ?? []).forEach((p: any) => (m[p.match_id] = { home_score: p.home_score, away_score: p.away_score }));
    return m;
  }, [myPreds]);

  const matchdays = useMemo(
    () => [...new Set((matches ?? []).map((m: any) => m.matchday))].sort((a, b) => a - b),
    [matches]
  );

  useEffect(() => {
    if (matchday === null && matchdays.length > 0) {
      const now = Date.now();
      const upcoming = (matches ?? []).find((m: any) => new Date(m.utc_date).getTime() > now);
      setMatchday(upcoming ? upcoming.matchday : matchdays[0]);
    }
  }, [matchdays, matches, matchday]);

  const currentIndex = matchday !== null ? matchdays.indexOf(matchday) : -1;
  const list = useMemo(
    () => (matches ?? []).filter((m: any) => m.matchday === matchday).sort((a: any, b: any) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()),
    [matches, matchday]
  );
  const firstDate = list[0] ? new Date(list[0].utc_date) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Liga Pleno · Jornada {String(matchday ?? "").padStart(2, "0")}
        </div>
        <h1 className="display text-3xl mt-0.5">Todos los pronósticos</h1>
      </div>

      {!user && (
        <div className="rounded-xl border border-dashed border-gold/40 bg-card px-4 py-2.5 text-xs text-muted-foreground text-center">
          Estás viendo los partidos como invitado. Crea una cuenta para poder pronosticar.
        </div>
      )}

      {/* Selector de jornada */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => matchday !== null && currentIndex > 0 && setMatchday(matchdays[currentIndex - 1])}
          disabled={currentIndex <= 0}
          className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="relative flex-1 rounded-xl border border-border bg-card px-4 py-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Calendario 2026/27</div>
            <div className="font-bold text-sm">
              Jornada {matchday ?? "…"}{firstDate ? ` · ${firstDate.toLocaleDateString("es-ES")}` : ""}
            </div>
          </div>
          <select
            value={matchday ?? ""}
            onChange={(e) => setMatchday(Number(e.target.value))}
            className="appearance-none bg-transparent text-transparent absolute inset-0 w-full cursor-pointer"
          >
            {matchdays.map((jd) => (
              <option key={jd} value={jd}>Jornada {jd}</option>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <button
          onClick={() => matchday !== null && currentIndex < matchdays.length - 1 && setMatchday(matchdays[currentIndex + 1])}
          disabled={currentIndex < 0 || currentIndex >= matchdays.length - 1}
          className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No hay partidos en esta jornada.</p>
      )}

      <div className="space-y-4">
        {list.map((m: any, i: number) => (
          <ClubMatchCard
            key={m.id}
            match={m}
            pred={predMap[m.id]}
            bg={STADIUM_BACKGROUNDS[i % STADIUM_BACKGROUNDS.length]}
          />
        ))}
      </div>
    </div>
  );
}

function ClubMatchCard({ match, pred, bg }: { match: any; pred?: { home_score: number; away_score: number }; bg: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const homeName = match.home?.name ?? "?";
  const awayName = match.away?.name ?? "?";
  const homeCrest = crestUrl(match.home?.id);
  const awayCrest = crestUrl(match.away?.id);
  const isFinished = match.status === "FINISHED";
  const kickoff = new Date(match.utc_date);
  const timeStr = kickoff.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const dateStr = kickoff.toLocaleDateString("es-ES");

  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState(pred?.home_score?.toString() ?? "0");
  const [away, setAway] = useState(pred?.away_score?.toString() ?? "0");
  const [saving, setSaving] = useState(false);

  const displayHome = isFinished ? match.home_score : (pred?.home_score ?? 0);
  const displayAway = isFinished ? match.away_score : (pred?.away_score ?? 0);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("club_predictions").upsert({
      user_id: user.id,
      match_id: match.id,
      home_score: Number(home),
      away_score: Number(away),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pronóstico guardado");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["club_predictions", user.id] });
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-soft border-t-2 border-b-2 ${
      isFinished ? "border-emerald-500" : match.is_megapremium ? "border-red-500" : match.is_premium ? "border-gold" : "border-flame"
    }`}>
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/85" />

      <div className="relative px-4 pt-3 pb-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center rounded-full bg-gold text-gold-foreground text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
            Jornada {match.matchday}
          </span>
          <span className="text-xs font-semibold text-white/70">{dateStr}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-14 w-14 rounded-full bg-white/95 flex items-center justify-center p-2 shadow-lg">
              {homeCrest && <img src={homeCrest} alt={homeName} className="h-full w-full object-contain" />}
            </div>
            <span className="text-sm font-bold leading-tight">{homeName}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Local</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            {editing ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-gold bg-black/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ScoreStepper value={home} onChange={setHome} />
                  <span className="font-black text-white/40">–</span>
                  <ScoreStepper value={away} onChange={setAway} />
                </div>
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full rounded-lg bg-gold text-gold-foreground text-[11px] font-black uppercase tracking-wide py-1.5 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isFinished) return;
                  if (!user) { navigate({ to: "/login" }); return; }
                  setEditing(true);
                }}
                disabled={isFinished}
                className="flex flex-col items-center gap-1 rounded-2xl border-2 border-gold bg-black/60 px-4 py-2 min-w-[84px] disabled:opacity-90"
              >
                <span className="text-2xl font-black tabular-nums leading-none">{displayHome} - {displayAway}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-gold">
                  {isFinished ? "Resultado" : "Pronóstico"}
                </span>
                {!isFinished && (
                  <span className="flex items-center gap-1 text-[9px] text-white/50">
                    <RotateCw className="h-2.5 w-2.5" /> {user ? "Pulsa para editar" : "Inicia sesión para pronosticar"}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-14 w-14 rounded-full bg-white/95 flex items-center justify-center p-2 shadow-lg">
              {awayCrest && <img src={awayCrest} alt={awayName} className="h-full w-full object-contain" />}
            </div>
            <span className="text-sm font-bold leading-tight">{awayName}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Visitante</span>
          </div>
        </div>

        <div className="mt-3 text-left">
          <span className="text-sm font-bold">{timeStr}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0;
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        className="h-6 w-6 rounded-full bg-white/15 text-white flex items-center justify-center text-sm font-bold hover:bg-white/25"
      >
        −
      </button>
      <span className="w-6 text-center font-black text-xl tabular-nums">{n}</span>
      <button
        type="button"
        onClick={() => onChange(String(n + 1))}
        className="h-6 w-6 rounded-full bg-white/15 text-white flex items-center justify-center text-sm font-bold hover:bg-white/25"
      >
        +
      </button>
    </div>
  );
}
