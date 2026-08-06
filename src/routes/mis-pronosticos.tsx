import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useClubMatches, useMyClubPredictions } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import estadioFondo from "@/assets/Estadiofutbolfondo.png";
import { getLaLigaTeamStadium } from "@/lib/laligaTeams";

export const Route = createFileRoute("/mis-pronosticos")({
  component: MyPredictions,
  head: () => ({ meta: [{ title: "Pronósticos · PlenoAl15" }] }),
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
    (myPreds ?? []).forEach(
      (p: any) => (m[p.match_id] = { home_score: p.home_score, away_score: p.away_score }),
    );
    return m;
  }, [myPreds]);

  const matchdays = useMemo(
    () => [...new Set((matches ?? []).map((m: any) => m.matchday))].sort((a, b) => a - b),
    [matches],
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
    () =>
      (matches ?? [])
        .filter((m: any) => m.matchday === matchday)
        .sort((a: any, b: any) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()),
    [matches, matchday],
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
          onClick={() =>
            matchday !== null && currentIndex > 0 && setMatchday(matchdays[currentIndex - 1])
          }
          disabled={currentIndex <= 0}
          className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="relative flex-1 rounded-xl border border-border bg-card px-4 py-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Calendario 2026/27
            </div>
            <div className="font-bold text-sm">
              Jornada {matchday ?? "…"}
              {firstDate ? ` · ${firstDate.toLocaleDateString("es-ES")}` : ""}
            </div>
          </div>
          <select
            value={matchday ?? ""}
            onChange={(e) => setMatchday(Number(e.target.value))}
            className="appearance-none bg-transparent text-transparent absolute inset-0 w-full cursor-pointer"
          >
            {matchdays.map((jd) => (
              <option key={jd} value={jd}>
                Jornada {jd}
              </option>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <button
          onClick={() =>
            matchday !== null &&
            currentIndex < matchdays.length - 1 &&
            setMatchday(matchdays[currentIndex + 1])
          }
          disabled={currentIndex < 0 || currentIndex >= matchdays.length - 1}
          className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No hay partidos en esta jornada.
        </p>
      )}

      <div className="space-y-4">
        {list.map((m: any) => (
          <ClubMatchCard key={m.id} match={m} pred={predMap[m.id]} />
        ))}
      </div>
    </div>
  );
}

function ClubMatchCard({
  match,
  pred,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isFinished = match.status === "FINISHED";
  const homeStadium = getLaLigaTeamStadium(match.home?.name);
  const bg = homeStadium?.stadium ?? estadioFondo;

  const [flipped, setFlipped] = useState(false);

  function openEdit() {
    if (isFinished) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setFlipped(true);
  }

  return (
    <div style={{ perspective: 1200 }}>
      <AnimatePresence mode="wait" initial={false}>
        {!flipped ? (
          <motion.div
            key="front"
            initial={{ opacity: 0, rotateY: -12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 12 }}
            transition={{ duration: 0.25 }}
          >
            <CardFront
              match={match}
              pred={pred}
              isFinished={isFinished}
              bg={bg}
              stadiumName={homeStadium?.stadiumName}
              onEdit={openEdit}
              hasUser={!!user}
            />
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ opacity: 0, rotateY: 12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -12 }}
            transition={{ duration: 0.25 }}
          >
            <CardBack
              match={match}
              pred={pred}
              bg={bg}
              onSaved={() => setFlipped(false)}
              onCancel={() => setFlipped(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardFront({
  match,
  pred,
  isFinished,
  bg,
  stadiumName,
  onEdit,
  hasUser,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  isFinished: boolean;
  bg: string;
  stadiumName?: string;
  onEdit: () => void;
  hasUser: boolean;
}) {
  const homeName = match.home?.name ?? "?";
  const awayName = match.away?.name ?? "?";
  const homeCrest = crestUrl(match.home?.id);
  const awayCrest = crestUrl(match.away?.id);
  const kickoff = new Date(match.utc_date);
  const timeStr = kickoff.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const dateStr = kickoff.toLocaleDateString("es-ES");

  let predResult: "exact" | "outcome" | "miss" | null = null;
  if (isFinished && pred) {
    const realOut =
      match.home_score > match.away_score ? "H" : match.home_score === match.away_score ? "D" : "A";
    const predOut =
      pred.home_score > pred.away_score ? "H" : pred.home_score === pred.away_score ? "D" : "A";
    if (pred.home_score === match.home_score && pred.away_score === match.away_score)
      predResult = "exact";
    else if (realOut === predOut) predResult = "outcome";
    else predResult = "miss";
  }

  return (
    <div
      onClick={onEdit}
      className={`relative overflow-hidden rounded-2xl border border-white/80 shadow-soft ${
        isFinished ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/70" />

      {isFinished && pred && (
        <div
          className={`absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            predResult === "exact"
              ? "bg-emerald-500 text-white"
              : predResult === "outcome"
                ? "bg-gold text-gold-foreground"
                : "bg-destructive text-white"
          }`}
        >
          {predResult === "exact" && (
            <>
              <CheckCircle2 className="h-3 w-3" /> Exacto
            </>
          )}
          {predResult === "outcome" && (
            <>
              <CheckCircle2 className="h-3 w-3" /> Acierto
            </>
          )}
          {predResult === "miss" && (
            <>
              <XCircle className="h-3 w-3" /> Fallo
            </>
          )}
        </div>
      )}

      <div className="relative px-4 pt-3 pb-4 text-white [text-shadow:0_2px_5px_rgba(0,0,0,.95)]">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-800 [text-shadow:none]">
            Jornada {match.matchday}
          </span>
          <span className="text-xs font-semibold text-slate-200">{dateStr}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center drop-shadow-lg">
              {homeCrest && (
                <img src={homeCrest} alt={homeName} className="h-full w-full object-contain" />
              )}
            </div>
            <span className="text-sm font-bold leading-tight">{homeName}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">
              Local
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[84px]">
            {isFinished ? (
              <>
                <div className="flex min-h-[74px] min-w-[84px] flex-col items-center justify-center rounded-xl border-2 border-gold bg-white px-2 py-2 text-black shadow-lg [text-shadow:none]">
                  <span className="text-2xl font-black tabular-nums leading-none">
                    {match.home_score} - {match.away_score}
                  </span>
                  <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                    Resultado
                  </span>
                </div>
                {pred ? (
                  <span
                    className={`mt-1.5 pt-1.5 border-t border-white/15 text-sm font-bold tabular-nums ${
                      predResult === "exact"
                        ? "text-emerald-400"
                        : predResult === "outcome"
                          ? "text-gold"
                          : "text-red-400"
                    }`}
                  >
                    Tu pronóstico: {pred.home_score}-{pred.away_score}
                  </span>
                ) : (
                  <span className="mt-1.5 pt-1.5 border-t border-white/15 text-[10px] text-white/40">
                    Sin pronóstico
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="flex min-h-[74px] min-w-[84px] flex-col items-center justify-center rounded-xl border-2 border-gold bg-white px-2 py-2 text-black shadow-lg [text-shadow:none]">
                  <span className="text-2xl font-black tabular-nums leading-none text-black">
                    {pred ? `${pred.home_score} - ${pred.away_score}` : "VS"}
                  </span>
                  <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                    Pronóstico
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[9px] text-slate-200">
                  <RotateCw className="h-2.5 w-2.5" />{" "}
                  {hasUser ? "Pulsa para editar" : "Inicia sesión para pronosticar"}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center drop-shadow-lg">
              {awayCrest && (
                <img src={awayCrest} alt={awayName} className="h-full w-full object-contain" />
              )}
            </div>
            <span className="text-sm font-bold leading-tight">{awayName}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">
              Visitante
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-slate-200">{timeStr}</span>
          {stadiumName && (
            <span className="truncate text-right text-[10px] font-semibold text-slate-200">
              {stadiumName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CardBack({
  match,
  pred,
  bg,
  onSaved,
  onCancel,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  bg: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const homeName = match.home?.name ?? "?";
  const awayName = match.away?.name ?? "?";
  const [home, setHome] = useState(pred?.home_score?.toString() ?? "0");
  const [away, setAway] = useState(pred?.away_score?.toString() ?? "0");
  const [saving, setSaving] = useState(false);

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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pronóstico guardado");
    qc.invalidateQueries({ queryKey: ["club_predictions", user.id] });
    onSaved();
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-soft border-2 border-gold">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/85" />

      <div className="relative px-4 py-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-gold">
            Jornada {match.matchday}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-white/50 hover:text-white"
          >
            Cancelar
          </button>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-white/70 max-w-[80px] text-center leading-tight">
              {homeName}
            </span>
            <ScoreStepper value={home} onChange={setHome} />
          </div>
          <span className="font-black text-white/30 text-2xl">–</span>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-white/70 max-w-[80px] text-center leading-tight">
              {awayName}
            </span>
            <ScoreStepper value={away} onChange={setAway} />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-gold text-gold-foreground text-sm font-black uppercase tracking-wide py-2.5 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar y volver"}
        </button>
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
