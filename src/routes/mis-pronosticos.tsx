import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMatches, useMyPredictions, useMatchPredictionStats } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { isLocked, formatKickoff, STAGE_LABELS, POINTS, LOCK_HOURS, formatCountdown } from "@/lib/scoring";
import { getCrestUrl } from "@/lib/crests";
import { getFlagUrl } from "@/lib/flags";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Minus, Plus, ChevronLeft, Lock, Calendar, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { EspecialesContent } from "@/components/EspecialesContent";

export const Route = createFileRoute("/mis-pronosticos")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab === "especiales" ? "especiales" : "partidos") as "partidos" | "especiales",
  }),
  component: MyPredictions,
  head: () => ({ meta: [{ title: "Mis pronósticos · El Mundial" }] }),
});

type PredStats = { home: number; draw: number; away: number; total: number };

function MyPredictions() {
  const { user } = useAuth();
  const { tab: initialTab } = Route.useSearch();
  if (!user) return null;
  const qc = useQueryClient();
  const { data: matches } = useMatches();
  const { data: mine } = useMyPredictions(user.id);
  const { data: predStats } = useMatchPredictionStats();

  const predMap = useMemo(() => {
    const m: Record<string, { home_score: number; away_score: number }> = {};
    (mine ?? []).forEach((p: any) => (m[p.match_id] = { home_score: p.home_score, away_score: p.away_score }));
    return m;
  }, [mine]);

  const allMatches = (matches ?? []).filter((m: any) => m.stage === "group");
  const totalMatches = allMatches.length;
  const completedPreds = allMatches.filter((m: any) => predMap[m.id] != null).length;
  const finishedMatches = allMatches.filter((m: any) => m.status === "finished").length;
  const predProgress = totalMatches ? Math.round((completedPreds / totalMatches) * 100) : 0;
  const playedProgress = totalMatches ? Math.round((finishedMatches / totalMatches) * 100) : 0;

  const [matchFilter, setMatchFilter] = useState<"upcoming" | "finished" | "all">("upcoming");

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    let source =
      matchFilter === "upcoming"
        ? allMatches.filter((m: any) => m.status !== "finished")
        : matchFilter === "finished"
        ? allMatches.filter((m: any) => m.status === "finished")
        : allMatches;
    if (matchFilter === "finished") {
      source = [...source].sort((a: any, b: any) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
    }
    source.forEach((m: any) => {
      const day = new Date(m.kickoff_at).toLocaleDateString("es-ES", {
        weekday: "long", day: "2-digit", month: "long",
      });
      (g[day] ||= []).push(m);
    });
    return g;
  }, [matches, matchFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft space-y-4">
        <div>
          <div className="display text-3xl">Mis pronósticos</div>
          <p className="text-white/70 text-sm mt-1">Puedes editar hasta 1h antes de cada partido.</p>
          <p className="text-white/50 text-xs mt-0.5">Tus pronósticos son los mismos para todas las ligas en las que participas.</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/80">
            <span>Tus pronósticos</span>
            <span className="font-bold tabular-nums">{completedPreds}/{totalMatches} · {predProgress}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gold transition-all duration-700 rounded-full" style={{ width: `${predProgress}%` }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/80">
            <span>Partidos jugados</span>
            <span className="font-bold tabular-nums">{finishedMatches}/{totalMatches} · {playedProgress}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-flame transition-all duration-700 rounded-full" style={{ width: `${playedProgress}%` }} />
          </div>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
          <TabsTrigger value="partidos" className="flex items-center gap-2 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            ⚽ Partidos
          </TabsTrigger>
          <TabsTrigger value="especiales" className="flex items-center gap-2 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            ⭐ Especiales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partidos" className="space-y-4 mt-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <span className="text-base shrink-0">🔄</span>
            <span>Recarga la página de vez en cuando para ver los últimos resultados y actualizaciones.</span>
          </div>
          <div className="flex items-center gap-2">
            {(["upcoming", "finished", "all"] as const).map((key) => {
              const label = key === "upcoming" ? "Próximos" : key === "finished" ? "Jugados" : "Todos";
              return (
                <button
                  key={key}
                  onClick={() => setMatchFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    matchFilter === key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <Link
              to="/reglas"
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors"
            >
              <BookOpen className="h-3 w-3" /> Reglas
            </Link>
          </div>
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay partidos en esta sección.</p>
          )}
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, list]) => (
              <section key={day} className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {day}
                </h2>
                <div className="grid gap-3">
                  {list.map((m) => (
                    <MatchPredictionCard
                      key={m.id}
                      match={m}
                      pred={predMap[m.id]}
                      stats={predStats?.[m.id]}
                      allMatches={allMatches}
                      onSaved={() => qc.invalidateQueries({ queryKey: ["my_predictions", user.id] })}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="especiales" className="mt-4">
          <EspecialesContent showHero={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchPredictionCard({
  match, pred, stats, allMatches, onSaved,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  stats?: PredStats;
  allMatches: any[];
  onSaved: () => void;
}) {
  const locked = isLocked(match.kickoff_at, match.predictions_locked);
  const [flipped, setFlipped] = useState(false);

  const isFinished = match.status === "finished" && match.home_score != null && match.away_score != null;

  let predResult: "exact" | "outcome" | "miss" | null = null;
  if (isFinished && pred) {
    const aOut = match.home_score > match.away_score ? "H" : match.home_score === match.away_score ? "D" : "A";
    const pOut = pred.home_score > pred.away_score ? "H" : pred.home_score === pred.away_score ? "D" : "A";
    if (pred.home_score === match.home_score && pred.away_score === match.away_score) predResult = "exact";
    else if (aOut === pOut) predResult = "outcome";
    else predResult = "miss";
  }

  const lockISO = !locked && !isFinished
    ? new Date(new Date(match.kickoff_at).getTime() - LOCK_HOURS * 3600 * 1000).toISOString()
    : null;
  const countdown = lockISO ? formatCountdown(lockISO) : null;

  return (
    <div>
    <AnimatePresence mode="wait" initial={false}>
      {!flipped ? (
        <motion.div
          key="front"
          initial={{ opacity: 0, rotateY: -15 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: 15 }}
          transition={{ duration: 0.2 }}
          onClick={() => !locked && !isFinished && setFlipped(true)}
          className={!locked && !isFinished ? "cursor-pointer" : ""}
        >
          <CardFront
            match={match}
            pred={pred}
            locked={locked}
            isFinished={isFinished}
            predResult={predResult}
            stats={stats}
            allMatches={allMatches}
          />
        </motion.div>
      ) : (
        <motion.div
          key="back"
          initial={{ opacity: 0, rotateY: 15 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: -15 }}
          transition={{ duration: 0.2 }}
        >
          <CardBack
            match={match}
            pred={pred}
            stats={stats}
            onFlipBack={() => setFlipped(false)}
            onSaved={() => { onSaved(); setFlipped(false); }}
          />
        </motion.div>
      )}
    </AnimatePresence>
    {!flipped && countdown && (() => {
      const cls = countdown.variant === "red"
        ? "text-red-400 border-red-800/60 bg-red-950/70"
        : countdown.variant === "amber"
        ? "text-amber-300 border-amber-700/60 bg-amber-950/70"
        : "text-emerald-400 border-emerald-800/60 bg-emerald-950/70";
      return (
        <div className="flex pl-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-b-md border-x border-b ${cls}`}>
            cierra en {countdown.label}
          </span>
        </div>
      );
    })()}
    </div>
  );
}

function getTeamForm(teamCode: string | null, allMatches: any[], beforeKickoff: string): ("G" | "E" | "P")[] {
  if (!teamCode) return [];
  return allMatches
    .filter((m) =>
      m.status === "finished" &&
      m.home_score != null &&
      m.away_score != null &&
      new Date(m.kickoff_at) < new Date(beforeKickoff) &&
      (m.home_code === teamCode || m.away_code === teamCode)
    )
    .sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime())
    .slice(0, 5)
    .reverse()
    .map((m) => {
      const isHome = m.home_code === teamCode;
      const scored = isHome ? m.home_score : m.away_score;
      const conceded = isHome ? m.away_score : m.home_score;
      return scored > conceded ? "G" : scored === conceded ? "E" : "P";
    });
}

function TeamFormBadges({ form }: { form: ("G" | "E" | "P")[] }) {
  if (form.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-0.5 mt-1.5">
      <span className="text-[8px] text-white/50 uppercase tracking-widest leading-none">racha</span>
      <div className="flex gap-0.5 mt-0.5">
        {form.map((r, i) => (
          <span
            key={i}
            className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-black drop-shadow ${
              r === "G" ? "bg-green-500 text-white" :
              r === "E" ? "bg-gray-400 text-white" :
                          "bg-red-500 text-white"
            }`}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

function CardFront({
  match, pred, locked, isFinished, predResult, stats, allMatches,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  locked: boolean;
  isFinished: boolean;
  predResult: "exact" | "outcome" | "miss" | null;
  stats?: PredStats;
  allMatches: any[];
}) {
  const homeName = match.home?.name ?? match.home_label ?? "?";
  const awayName = match.away?.name ?? match.away_label ?? "?";
  const homeFlag = match.home?.flag ?? "🏳️";
  const awayFlag = match.away?.flag ?? "🏳️";
  const homeFlagImage = getFlagUrl(match.home_code);
  const awayFlagImage = getFlagUrl(match.away_code);
  const isPremium = match.is_premium;
  const isMegapremium = match.is_megapremium;
  const stageLabel = match.group_letter ? `Grupo ${match.group_letter}` : (STAGE_LABELS[match.stage] ?? match.stage);
  const timeStr = new Date(match.kickoff_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const homeNameClass = homeName.length > 14 ? "text-sm md:text-base" : "text-lg";
  const awayNameClass = awayName.length > 14 ? "text-sm md:text-base" : "text-lg";
  const homeForm = getTeamForm(match.home_code, allMatches, match.kickoff_at);
  const awayForm = getTeamForm(match.away_code, allMatches, match.kickoff_at);
  const centerClass = `flex min-w-[80px] flex-col items-center gap-1 rounded-xl border-2 px-3 py-2 shadow-lg backdrop-blur-md ${
    isMegapremium
      ? "border-red-500 bg-white/90 text-pitch-deep shadow-[0_0_18px_rgba(239,68,68,0.5)]"
      : isPremium
      ? "border-gold bg-white/90 text-pitch-deep shadow-gold"
      : "border-white/60 bg-white/82 text-pitch-deep"
  }`;

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 shadow-soft ${isMegapremium ? "border-red-500/70" : isPremium ? "border-gold/60" : "border-gray-400/50"}`}>
      {/* Background: split country flags */}
      <div className="absolute inset-0 flex">
        <TeamBackdrop flag={homeFlag} flagImage={homeFlagImage} side="home" />
        <TeamBackdrop flag={awayFlag} flagImage={awayFlagImage} side="away" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/15 to-transparent" />
      <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-gradient-to-b from-transparent via-black/35 to-transparent shadow-[0_0_18px_rgba(255,255,255,0.65)]" />

      {/* Premium / Mega Premium badge */}
      {isMegapremium ? (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Star className="h-2.5 w-2.5 fill-white" /> MEGAPREMIUM
        </div>
      ) : isPremium && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-gold text-pitch-deep text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Star className="h-2.5 w-2.5 fill-pitch-deep" /> PREMIUM
        </div>
      )}

      {/* Result badge if finished */}
      {isFinished && pred && (
        <div className={`absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          predResult === "exact"   ? "bg-green-500 text-white" :
          predResult === "outcome" ? "bg-gold text-pitch-deep" :
                                     "bg-destructive text-white"
        }`}>
          {predResult === "exact"   && <><CheckCircle2 className="h-3 w-3" /> Exacto</>}
          {predResult === "outcome" && <><CheckCircle2 className="h-3 w-3" /> Correcto</>}
          {predResult === "miss"    && <><XCircle className="h-3 w-3" /> Fallaste</>}
        </div>
      )}

      {/* Votes badge */}
      {stats?.total && !isFinished && (
        <div className="absolute top-2 right-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/30 text-white/85 backdrop-blur-sm">
          {stats.total} votos
        </div>
      )}

      {/* Content */}
      <div className="relative px-3 pt-4 pb-3 text-white">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Home */}
          <div className="flex min-h-24 flex-col items-center justify-center">
            <span className={`max-w-[96px] text-center font-black uppercase leading-none tracking-wide text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] ${homeNameClass}`}>{homeName}</span>
            <TeamFormBadges form={homeForm} />
          </div>

          {/* Center */}
          <div className={centerClass}>
            {isFinished ? (
              <div className="text-center">
                <div className={`text-2xl font-black tabular-nums ${isMegapremium ? "text-red-600 dark:text-red-400" : isPremium ? "text-gold" : ""}`}>{match.home_score} – {match.away_score}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Resultado</div>
                {pred && (
                  <div className="mt-1.5 pt-1 border-t border-border/50">
                    <div className={`text-sm font-bold tabular-nums ${
                      predResult === "exact" ? "text-green-600" :
                      predResult === "outcome" ? "text-gold" :
                                                  "text-destructive"
                    }`}>{pred.home_score}–{pred.away_score}</div>
                    <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Tu pronóstico</div>
                  </div>
                )}
              </div>
            ) : pred ? (
              <div className="text-center">
                <div className={`text-2xl font-black tabular-nums ${isMegapremium ? "text-red-600 dark:text-red-400" : isPremium ? "text-gold" : ""}`}>{pred.home_score} – {pred.away_score}</div>
              </div>
            ) : (
              <div className="text-center">
                <div className={`text-lg font-black tracking-widest ${isMegapremium ? "text-red-600 dark:text-red-400" : isPremium ? "text-gold" : "text-pitch-deep/60"}`}>VS</div>
              </div>
            )}
            {locked && !isFinished && (
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-1">
                <Lock className="h-2.5 w-2.5" /> Cerrado
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex min-h-24 flex-col items-center justify-center">
            <span className={`max-w-[96px] text-center font-black uppercase leading-none tracking-wide text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] ${awayNameClass}`}>{awayName}</span>
            <TeamFormBadges form={awayForm} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="font-bold text-white text-sm">{timeStr}</span>
          <span className="font-bold text-white text-sm">{stageLabel}</span>
        </div>
      </div>
    </div>
  );
}

function TeamBackdrop({
  flag,
  flagImage,
  side,
}: {
  flag: string;
  flagImage: string | null;
  side: "home" | "away";
}) {
  const isHome = side === "home";
  return (
    <div className="relative flex-1 overflow-hidden bg-white">
      {flagImage ? (
        <img
          src={flagImage}
          alt=""
          className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-[1px] saturate-125 ${
            isHome ? "object-left" : "object-right"
          }`}
        />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center text-[7.5rem] leading-none opacity-35 blur-[1px] saturate-150 ${
            isHome ? "-translate-x-5 rotate-[-8deg]" : "translate-x-5 rotate-[8deg]"
          }`}
        >
          {flag}
        </div>
      )}
      <div
        className={`absolute inset-0 ${
          isHome
            ? "bg-gradient-to-r from-white/4 via-white/16 to-white/62"
            : "bg-gradient-to-l from-white/4 via-white/16 to-white/62"
        }`}
      />
    </div>
  );
}

function CardBack({
  match, pred, stats, onFlipBack, onSaved,
}: {
  match: any;
  pred?: { home_score: number; away_score: number };
  stats?: PredStats;
  onFlipBack: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [home, setHome] = useState(pred?.home_score?.toString() ?? "");
  const [away, setAway] = useState(pred?.away_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (pred) {
      setHome(pred.home_score.toString());
      setAway(pred.away_score.toString());
    }
  }, [pred?.home_score, pred?.away_score]);

  const isPremium = match.is_premium;
  const isMegapremium = match.is_megapremium;
  const homeName = match.home?.name ?? match.home_label ?? "?";
  const awayName = match.away?.name ?? match.away_label ?? "?";
  const homeCrest = getCrestUrl(match.home_code);
  const awayCrest = getCrestUrl(match.away_code);
  const homeFlag = match.home?.flag ?? "🏳️";
  const awayFlag = match.away?.flag ?? "🏳️";

  const pts = isMegapremium
    ? { outcome: POINTS.megapremium_outcome, exact: POINTS.megapremium_exact }
    : isPremium
    ? { outcome: POINTS.premium_outcome, exact: POINTS.premium_exact }
    : { outcome: POINTS.normal_outcome, exact: POINTS.normal_exact };

  async function save() {
    if (home === "" || away === "") return;
    setSaving(true);
    const { error } = await supabase.from("predictions").upsert({
      user_id: user!.id,
      match_id: match.id,
      home_score: Number(home),
      away_score: Number(away),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pronóstico guardado");
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved(); }, 1200);
  }

  return (
    <div className={`rounded-xl border overflow-hidden bg-card shadow-soft ${isMegapremium ? "border-red-500/60" : isPremium ? "border-gold/50" : "border-border"}`}>
      {/* Premium / Mega Premium banner */}
      {isMegapremium ? (
        <div className="bg-red-600/15 flex items-center justify-center gap-1.5 py-2 text-red-600 dark:text-red-400 text-xs font-bold border-b border-red-600/20">
          <Star className="h-3 w-3 fill-red-600 dark:fill-red-400" /> MEGAPREMIUM · Triple puntuación
        </div>
      ) : isPremium && (
        <div className="bg-gold/15 flex items-center justify-center gap-1.5 py-2 text-gold text-xs font-bold border-b border-gold/20">
          <Star className="h-3 w-3 fill-gold" /> PREMIUM · Doble puntuación
        </div>
      )}

      {/* Back button + team header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border">
        <button onClick={onFlipBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <div className="h-7 w-7 flex items-center justify-center">
            {homeCrest ? <img src={homeCrest} alt={homeName} className="h-full w-full object-contain" /> : <span>{homeFlag}</span>}
          </div>
          <span className="text-sm font-bold">{homeName}</span>
          <span className="text-muted-foreground text-xs">vs</span>
          <span className="text-sm font-bold">{awayName}</span>
          <div className="h-7 w-7 flex items-center justify-center">
            {awayCrest ? <img src={awayCrest} alt={awayName} className="h-full w-full object-contain" /> : <span>{awayFlag}</span>}
          </div>
        </div>
        <div className="w-5" />
      </div>

      {/* Score inputs */}
      <div className="flex items-center justify-center gap-6 px-4 py-5">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{homeName}</span>
          <StepInput value={home} onChange={setHome} />
        </div>
        <span className="text-muted-foreground font-bold text-3xl mb-1">–</span>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{awayName}</span>
          <StepInput value={away} onChange={setAway} />
        </div>
      </div>

      {/* Percentages */}
      {stats && stats.total > 0 && (
        <div className="flex justify-around text-xs text-muted-foreground px-4 pb-2 border-t border-border pt-2">
          <span className="font-medium">{Math.round((stats.home / stats.total) * 100)}% {homeName.split(" ")[0]}</span>
          <span>·</span>
          <span className="font-medium">{Math.round((stats.draw / stats.total) * 100)}% Empate</span>
          <span>·</span>
          <span className="font-medium">{awayName.split(" ")[0]} {Math.round((stats.away / stats.total) * 100)}%</span>
        </div>
      )}

      {/* Points info */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground px-4 py-2">
        <span>🏆 {pts.outcome} pts resultado</span>
        <span className={`font-medium ${isMegapremium ? "text-red-600 dark:text-red-400" : "text-gold"}`}>⭐ {pts.exact} pts exacto</span>
      </div>

      {/* Save button */}
      <div className="px-4 pb-4">
        <button
          onClick={save}
          disabled={saving || saved || home === "" || away === ""}
          className={`w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all duration-300 hover:opacity-90 ${
            saved
              ? "bg-emerald-500 text-white"
              : isMegapremium
              ? "bg-red-600 text-white"
              : isPremium
              ? "bg-gold text-pitch-deep"
              : "bg-pitch-deep text-white dark:bg-primary dark:text-primary-foreground"
          }`}
        >
          {saving ? "Guardando…" : saved ? "✓ ¡Guardado!" : pred ? "Actualizar pronóstico" : "Guardar pronóstico"}
        </button>
      </div>
    </div>
  );
}

function StepInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const num = parseInt(value);
  const n = isNaN(num) ? 0 : num;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-10 text-center font-black text-3xl tabular-nums select-none">
        {value === "" ? <span className="text-muted-foreground/30 text-2xl">?</span> : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(String(n + 1))}
        className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
