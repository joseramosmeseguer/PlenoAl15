import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useClubMatches, useMyClubPredictions } from "@/lib/queries";
import { getClubPredictionStats, type ClubPredictionStats } from "@/lib/club-predictions.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, CheckCircle2, XCircle, Star, Trophy, Info, Lock } from "lucide-react";
import estadioFondo from "@/assets/Estadiofutbolfondo.png";
import { getLaLigaTeamDisplayName, getLaLigaTeamStadium } from "@/lib/laligaTeams";
import { SectionHero } from "@/components/SectionHero";
import { isLocked } from "@/lib/scoring";

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
  const { data: predictionStats } = useQuery({
    queryKey: ["club_prediction_stats"],
    queryFn: () => getClubPredictionStats(),
    enabled: !!user,
  });
  const [matchday, setMatchday] = useState<number | null>(null);
  const activeMatchdayRef = useRef<HTMLButtonElement | null>(null);

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

  const matchdayDates = useMemo(() => {
    const dates: Record<number, Date> = {};
    for (const match of matches ?? []) {
      const date = new Date((match as any).utc_date);
      const day = (match as any).matchday;
      if (!dates[day] || date < dates[day]) dates[day] = date;
    }
    return dates;
  }, [matches]);

  useEffect(() => {
    if (matchday === null && matchdays.length > 0) {
      const now = Date.now();
      const upcoming = (matches ?? []).find((m: any) => new Date(m.utc_date).getTime() > now);
      setMatchday(upcoming ? upcoming.matchday : matchdays[0]);
    }
  }, [matchdays, matches, matchday]);

  useEffect(() => {
    activeMatchdayRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [matchday]);

  const list = useMemo(
    () =>
      (matches ?? [])
        .filter((m: any) => m.matchday === matchday)
        .sort((a: any, b: any) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()),
    [matches, matchday],
  );
  const firstDate = list[0] ? new Date(list[0].utc_date) : null;
  const predictedCount = list.filter((match: any) => predMap[match.id]).length;
  const progress = list.length > 0 ? Math.round((predictedCount / list.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <SectionHero title="PRONÓSTICOS" eyebrow="Pleno al 15" subtitle="Elige una jornada y demuestra cuánto sabes de fútbol." icon={Trophy} />

      {!user && (
        <div className="rounded-xl border border-dashed border-gold/40 bg-card px-4 py-2.5 text-xs text-muted-foreground text-center">
          Estás viendo los partidos como invitado. Crea una cuenta para poder pronosticar.
        </div>
      )}

      <div className="space-y-3">
        <div
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Seleccionar jornada"
        >
          {matchdays.map((journey) => {
            const active = journey === matchday;
            const date = matchdayDates[journey];
            return (
              <button
                key={journey}
                ref={active ? activeMatchdayRef : null}
                type="button"
                onClick={() => setMatchday(journey)}
                className={`min-w-[104px] shrink-0 snap-center rounded-xl border px-3 py-2 text-left transition-all ${
                  active
                    ? "border-gold bg-gold text-slate-950 shadow-sm"
                    : "border-border bg-card text-foreground hover:border-gold/50 hover:bg-muted"
                }`}
              >
                <span className="block text-[10px] font-black uppercase tracking-wide">
                  Jornada {journey}
                </span>
                <span
                  className={`mt-0.5 block text-[9px] ${active ? "text-slate-700" : "text-muted-foreground"}`}
                >
                  {date
                    ? date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                    : "Fecha pendiente"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold">
              Jornada {matchday ?? "…"}
              {firstDate ? ` · ${firstDate.toLocaleDateString("es-ES")}` : ""}
            </span>
            <span className="shrink-0 font-semibold text-muted-foreground">
              {user ? `${predictedCount}/${list.length} listos` : `${list.length} partidos`}
            </span>
          </div>
          {user && list.length > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No hay partidos en esta jornada.
        </p>
      )}

      <div className="space-y-4">
        {list.map((m: any) => (
          <ClubMatchCard
            key={m.id}
            match={m}
            pred={predMap[m.id]}
            stats={predictionStats?.[String(m.id)]}
          />
        ))}
      </div>
    </div>
  );
}

function ClubMatchCard({
  match,
  pred,
  stats,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  stats?: ClubPredictionStats;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isFinished = match.status === "FINISHED";
  const locked = isLocked(match.utc_date, match.predictions_locked);
  const homeStadium = getLaLigaTeamStadium(match.home?.name);
  const bg = homeStadium?.stadium ?? estadioFondo;

  const [flipped, setFlipped] = useState(false);

  function openEdit() {
    if (isFinished || locked) return;
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
              locked={locked}
              bg={bg}
              stadiumName={homeStadium?.stadiumName}
              backgroundPosition={homeStadium?.backgroundPosition}
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
              stats={stats}
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
  locked,
  bg,
  stadiumName,
  backgroundPosition,
  onEdit,
  hasUser,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  isFinished: boolean;
  locked: boolean;
  bg: string;
  stadiumName?: string;
  backgroundPosition?: string;
  onEdit: () => void;
  hasUser: boolean;
}) {
  const homeName = getLaLigaTeamDisplayName(match.home?.name);
  const awayName = getLaLigaTeamDisplayName(match.away?.name);
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
        isFinished || locked ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <img
        src={bg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: backgroundPosition ?? "center 55%" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/70" />

      {(match.is_premium || match.is_megapremium) && (
        <div
          className={`relative flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest [text-shadow:none] ${
            match.is_megapremium ? "bg-red-600 text-white" : "bg-gold text-gold-foreground"
          }`}
        >
          <Star className="h-3 w-3 fill-current" /> {match.is_megapremium ? "Mega Premium · Triple puntuación" : "Premium · Doble puntuación"}
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
            <div className="flex h-12 w-12 items-center justify-center drop-shadow-lg">
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
                <div className="flex min-h-[50px] min-w-[54px] flex-col items-center justify-center rounded-lg border-2 border-gold bg-white px-1.5 py-1 text-black shadow-lg [text-shadow:none]">
                  <span className="text-base font-black tabular-nums leading-none">
                    {match.home_score} - {match.away_score}
                  </span>
                  <span className="mt-1 text-[7px] font-bold uppercase tracking-widest text-slate-500">
                    Resultado
                  </span>
                </div>
                {pred ? (
                  <span
                    className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums [text-shadow:none] ${
                      predResult === "exact"
                        ? "bg-gold/20 text-gold"
                        : predResult === "outcome"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    Tú: {pred.home_score}-{pred.away_score}
                  </span>
                ) : (
                  <span className="mt-1.5 pt-1.5 border-t border-white/15 text-[10px] text-white/40">
                    Sin pronóstico
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="flex min-h-[50px] min-w-[54px] flex-col items-center justify-center rounded-lg border-2 border-gold bg-white px-1.5 py-1 text-black shadow-lg [text-shadow:none]">
                  <span className="text-base font-black tabular-nums leading-none text-black">
                    {pred ? `${pred.home_score} - ${pred.away_score}` : "VS"}
                  </span>
                  <span className="mt-1 text-[7px] font-bold uppercase tracking-widest text-slate-500">
                    {locked ? "Cerrado" : "Pronóstico"}
                  </span>
                </div>
                {locked && (
                  <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-semibold text-white/70">
                    <Lock className="h-2.5 w-2.5" /> Bloqueado
                  </span>
                )}
                <Link
                  to="/calendario"
                  search={{ match: match.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 rounded-full border border-white/25 bg-black/30 px-2 py-0.5 text-[9px] font-semibold text-slate-100 hover:bg-black/50 transition-colors"
                >
                  <Info className="h-2.5 w-2.5" /> +Info
                </Link>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center drop-shadow-lg">
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

        {isFinished && pred && (
          <div className="mt-3 flex justify-center">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full [text-shadow:none] ${
                predResult === "exact"
                  ? "bg-gold text-gold-foreground"
                  : predResult === "outcome"
                    ? "bg-emerald-500 text-white"
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
            </span>
          </div>
        )}

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
  stats,
  onSaved,
  onCancel,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  stats?: ClubPredictionStats;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const homeName = getLaLigaTeamDisplayName(match.home?.name);
  const awayName = getLaLigaTeamDisplayName(match.away?.name);
  const homeLabel = match.home?.short_name ?? homeName;
  const awayLabel = match.away?.short_name ?? awayName;
  const [home, setHome] = useState(pred?.home_score?.toString() ?? "0");
  const [away, setAway] = useState(pred?.away_score?.toString() ?? "0");
  const [saving, setSaving] = useState(false);
  const pointsOutcome = match.is_megapremium ? 15 : match.is_premium ? 10 : 5;
  const pointsExact = match.is_megapremium ? 45 : match.is_premium ? 30 : 15;

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
    qc.invalidateQueries({ queryKey: ["club_prediction_stats"] });
    onSaved();
  }

  const [homePct, drawPct, awayPct] = outcomePercentages(stats);
  const homeCrest = crestUrl(match.home?.id);
  const awayCrest = crestUrl(match.away?.id);
  const premium = match.is_megapremium || match.is_premium;

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/70 bg-[#fffef9] text-slate-900 shadow-soft">
      {premium && (
        <div className="flex items-center justify-center gap-1.5 border-b border-gold/35 bg-gold/15 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-600 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs">
          <Star className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
          {match.is_megapremium ? "Mega Premium · Triple puntuación" : "Premium · Doble puntuación"}
        </div>
      )}

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_28px] items-center border-b border-slate-200 pb-3 sm:grid-cols-[32px_minmax(0,1fr)_32px] sm:pb-4">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Volver al partido"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="flex min-w-0 items-center justify-center gap-1.5 text-center sm:gap-3">
            {homeCrest && (
              <img
                src={homeCrest}
                alt=""
                className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9"
              />
            )}
            <span className="min-w-0 truncate text-[10px] font-black sm:text-sm">{homeLabel}</span>
            <span className="shrink-0 text-[9px] font-bold text-slate-400 sm:text-xs">VS</span>
            <span className="min-w-0 truncate text-[10px] font-black sm:text-sm">{awayLabel}</span>
            {awayCrest && (
              <img
                src={awayCrest}
                alt=""
                className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9"
              />
            )}
          </div>
          <span className="text-right text-[8px] font-bold uppercase text-slate-400 sm:text-[10px]">
            J{match.matchday}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 py-4 sm:gap-4 sm:py-5">
          <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-3">
            <span className="max-w-full truncate text-center text-[11px] font-semibold text-slate-600 sm:max-w-[120px] sm:text-sm">
              {homeLabel}
            </span>
            <ScoreStepper value={home} onChange={setHome} />
          </div>
          <span className="pb-1.5 text-2xl font-light text-slate-400 sm:pb-2 sm:text-3xl">−</span>
          <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-3">
            <span className="max-w-full truncate text-center text-[11px] font-semibold text-slate-600 sm:max-w-[120px] sm:text-sm">
              {awayLabel}
            </span>
            <ScoreStepper value={away} onChange={setAway} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 border-y border-slate-200 py-2.5 text-center text-[9px] font-semibold leading-tight text-slate-600 sm:py-3 sm:text-xs">
          <span>
            {homePct}% {homeLabel}
          </span>
          <span>{drawPct}% Empate</span>
          <span>
            {awayLabel} {awayPct}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 py-2.5 text-center text-[10px] font-semibold text-slate-600 sm:flex sm:items-center sm:justify-center sm:gap-6 sm:py-3 sm:text-xs">
          <span className="flex items-center justify-center gap-1 sm:gap-1.5">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" /> {pointsOutcome} pts resultado
          </span>
          <span className="flex items-center justify-center gap-1 text-amber-600 sm:gap-1.5">
            <Star className="h-3.5 w-3.5 shrink-0 fill-current sm:h-4 sm:w-4" /> {pointsExact} pts exacto
          </span>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl bg-gold py-3 text-sm font-black text-slate-950 shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-50 sm:py-3.5 sm:text-base"
        >
          {saving ? "Guardando…" : "Guardar pronóstico"}
        </button>
      </div>
    </div>
  );
}

function outcomePercentages(stats?: ClubPredictionStats): [number, number, number] {
  if (!stats?.total) return [0, 0, 0];
  const values = [stats.home, stats.draw, stats.away].map((count) => (count / stats.total) * 100);
  const rounded = values.map(Math.floor);
  const remainder = 100 - rounded.reduce((sum, value) => sum + value, 0);
  const order = values
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < remainder; index += 1) rounded[order[index].index] += 1;
  return rounded as [number, number, number];
}

function ScoreStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0;
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:h-11 sm:w-11 sm:text-xl"
      >
        −
      </button>
      <span className="w-7 text-center text-3xl font-black tabular-nums text-slate-950 sm:w-8 sm:text-4xl">
        {n}
      </span>
      <button
        type="button"
        onClick={() => onChange(String(n + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:h-11 sm:w-11 sm:text-xl"
      >
        +
      </button>
    </div>
  );
}
