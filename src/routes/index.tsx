import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Sparkles, KeyRound, Plus, BookOpen, Pencil, ChevronRight, ChevronDown, Share2, Check } from "lucide-react";
import { useLeaderboard, useDailyWinner, useProfiles, useMyLeagues, useLeagues, useMyLeagueInviteCodes, useAllLeagueMembers, useAllSnapshots, useBonusQuestions, useMySurveyResponse, useMySurveyIdeas, useAnnouncements } from "@/lib/queries";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { isAnnouncementLive } from "@/lib/announcements";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InviteCard } from "@/components/InviteCard";
import heroImg from "@/assets/hero-trophy.jpg";
import estadioEpicoImg from "@/assets/EstadioEpico1.png";
import estadioImg from "@/assets/Estadiofutbolfondo.png";
import estadioEspanaImg from "@/assets/EstadioSpain.png";
import estadioClaroImg from "@/assets/EstadioNormalClaro.png";
import balonenporteriaImg from "@/assets/balonenporteria.webp";
import mexicoImg from "@/assets/mexico.png";
import sudafricaImg from "@/assets/sudafrica.png";
import estadioSpain1Img from "@/assets/EstadioSpain1.png";
import anuncio1Img from "@/assets/Anuncio1.png";
import { EvolutionChart } from "@/components/EvolutionChart";
import { getCrestUrl } from "@/lib/crests";
import { CreateLeagueModal, JoinLeagueModal, ManageLeagueModal } from "@/components/LeaguesSection";
import { InstallPWA } from "@/components/InstallPWA";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Clasificación · El Mundial" },
      { name: "description", content: "Clasificación general de la quiniela del Mundial entre amigos." },
    ],
  }),
});

function useLiveCountdown(targetISO?: string | null) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!targetISO) { setSecs(null); return; }
    const tick = () => {
      const ms = new Date(targetISO).getTime() - Date.now();
      setSecs(ms <= 0 ? 0 : Math.floor(ms / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);
  return secs;
}

function BonusCountdown({ bonusQuestions }: { bonusQuestions: any[] }) {
  const deadline = bonusQuestions
    .filter((q) => q.deadline_at)
    .map((q) => q.deadline_at as string)
    .sort()[0] ?? null;
  const secs = useLiveCountdown(deadline);
  if (secs === null || secs === 0) return null;

  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const urgent = secs < 3600;
  const units = [{ label: "horas", val: hh }, { label: "min", val: mm }, { label: "seg", val: ss }];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-soft">
      <img src={balonenporteriaImg} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 blur-[1px]" />
      <div className={`absolute inset-0 ${urgent ? "bg-black/80" : "bg-black/72"}`} />
      <div className="relative px-4 pt-3 pb-4 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-base">⏰</span>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${urgent ? "text-red-400" : "text-amber-400"}`}>
              Pronósticos especiales
            </p>
            <p className="text-sm font-semibold text-white">Se cierran en:</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          {units.map(({ label, val }, i) => (
            <div key={label} className="flex items-center gap-3">
              {i > 0 && (
                <span className={`font-black text-2xl leading-none pb-5 ${urgent ? "text-red-400/60" : "text-white/30"}`}>:</span>
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`rounded-2xl min-w-[58px] px-3 py-2.5 text-center shadow-lg ${
                  urgent
                    ? "bg-gradient-to-b from-red-700/70 to-red-900/80 border border-red-400/40 shadow-red-900/40"
                    : "bg-gradient-to-b from-white/20 to-white/8 border border-white/20 shadow-black/30"
                }`}>
                  <span className={`font-mono font-black text-3xl tabular-nums leading-none tracking-tight ${urgent ? "text-red-100" : "text-white"}`}>
                    {val}
                  </span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${urgent ? "text-red-400/80" : "text-amber-400/80"}`}>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal: sin liga ───────────────────────────────────────────
function NoLeagueModal({ myLeagues, myLeaguesLoading, onJoin, onCreate }: {
  myLeagues: any[] | undefined;
  myLeaguesLoading: boolean;
  onJoin: () => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(true);

  const hasNoLeague = !myLeaguesLoading && (myLeagues ?? []).length === 0;
  if (!hasNoLeague || !open) return null;

  function dismiss() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="display text-2xl">¡Hola! 👋</DialogTitle>
          <DialogDescription className="sr-only">Información sobre ligas</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-foreground">
          <p>
            Te mandamos este aviso porque <span className="font-semibold">todavía no estás en ninguna liga</span>.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Pregúntale al amigo que te invitó el código de su liga e introdúcelo para unirte. Si prefieres, también puedes crearte una liga propia desde el menú principal.
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => { dismiss(); onJoin(); }}
            className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            Tengo un código, quiero unirme
          </button>
          <button
            onClick={() => { dismiss(); onCreate(); }}
            className="w-full rounded-xl border border-border bg-card font-medium py-2.5 text-sm hover:bg-muted transition-colors"
          >
            Crear mi propia liga
          </button>
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Ahora no
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── CTA: Vota partidos normales ───────────────────────────────
function VotaPartidosCard() {
  return (
    <div className="relative rounded-xl overflow-hidden shadow-soft min-h-[80px]">
      <img src={estadioImg} alt="" className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      <div className="relative px-4 py-3 text-white flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-snug">⚽ Pronósticos de partidos</p>
          <p className="text-xs text-white/60 mt-0.5">Predice el marcador de cada partido y sube en la clasificación.</p>
        </div>
        <Link
          to="/mis-pronosticos"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gold hover:bg-gold/90 text-pitch-deep font-black text-xs px-4 py-2 transition-colors"
        >
          ¡VOTA YA! →
        </Link>
      </div>
    </div>
  );
}

// ── Nuevo plazo pronósticos especiales ───────────────────────
const BONUS_DEADLINE = "2026-06-14T21:59:00Z"; // domingo 14 Jun, 23:59 CEST

function NuevoPlazoCard() {
  const secs = useLiveCountdown(BONUS_DEADLINE);
  if (secs === null || secs === 0) return null;

  const days = Math.floor(secs / 86400);
  const hh = String(Math.floor((secs % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const units = days > 0
    ? [{ val: String(days), label: "días" }, { val: hh, label: "h" }, { val: mm, label: "min" }]
    : [{ val: hh, label: "h" }, { val: mm, label: "min" }, { val: ss, label: "seg" }];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-soft">
      <img src={balonenporteriaImg} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 blur-[1px]" />
      <div className="absolute inset-0 bg-black/72" />
      <div className="relative px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">¡Nuevo plazo!</span>
            </div>
            <p className="text-sm font-bold text-white leading-snug">Pronósticos especiales</p>
            <p className="text-xs text-white/65">Abiertos hasta el <span className="font-semibold text-white/90">domingo a las 23:59</span></p>
            <Link
              to="/mis-pronosticos"
              search={{ tab: "especiales" }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs px-4 py-1.5 transition-colors"
            >
              ¡VOTA YA! →
            </Link>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {units.map(({ val, label }, i) => (
              <div key={label} className="flex items-center gap-1.5">
                {i > 0 && <span className="font-black text-lg text-white/30 pb-4">:</span>}
                <div className="flex flex-col items-center">
                  <div className="bg-white/15 border border-white/20 rounded-lg px-2 py-1 min-w-[38px] text-center">
                    <span className="font-mono font-black text-xl tabular-nums leading-none">{val}</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-amber-400/80 mt-0.5">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Spain match card (admin only) ────────────────────────────
const SPAIN_KICKOFF = "2026-06-15T16:00:00Z"; // Lunes 15 Jun, 18:00 CEST

function SpainMatchCard() {
  const secs = useLiveCountdown(SPAIN_KICKOFF);
  if (secs === null || secs === 0) return null;

  const days = Math.floor(secs / 86400);
  const hh = String(Math.floor((secs % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const totalHours = String(Math.floor(secs / 3600)).padStart(2, "0");
  const units = [
    { val: totalHours, label: "H" },
    { val: mm, label: "MIN" },
    { val: ss, label: "SEG" },
  ];

  const espCrest = getCrestUrl("ESP");
  const cpvCrest = getCrestUrl("CPV");

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-soft">
      <img src={estadioEspanaImg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
      <div className="relative p-4 text-white text-center">

        {/* Teams */}
        <div className="flex items-center justify-center gap-5 mb-3">
          <div className="flex flex-col items-center gap-1.5">
            {espCrest
              ? <img src={espCrest} alt="España" className="w-16 h-16 object-contain drop-shadow-lg" />
              : <span className="text-5xl">🇪🇸</span>}
            <span className="text-sm font-bold tracking-wide">España</span>
          </div>

          <span className="display text-2xl font-black text-gold">VS</span>

          <div className="flex flex-col items-center gap-1.5">
            {cpvCrest
              ? <img src={cpvCrest} alt="Cabo Verde" className="w-16 h-16 object-contain drop-shadow-lg" />
              : <span className="text-5xl">🇨🇻</span>}
            <span className="text-sm font-bold tracking-wide">Cabo Verde</span>
          </div>
        </div>

        {/* Date & time */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm px-3 py-1 mb-3">
          <span className="text-xs font-semibold text-white/90">Lunes 15 · 18:00</span>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-2">
          {units.map(({ val, label }, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <span className="font-black text-xl text-white/30 pb-5">:</span>}
              <div className="flex flex-col items-center gap-1">
                <div className="bg-black/50 border border-white/20 rounded-xl min-w-[46px] px-2 py-2 text-center backdrop-blur-sm">
                  <span className="font-mono font-black text-2xl tabular-nums leading-none">{val}</span>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/45">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline épico */}
        <div className="mt-4 pt-3 border-t border-white/15">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
            <span className="text-gold text-xs">★</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
          </div>
          <p className="display text-xl font-black text-white leading-tight">La Roja debuta.</p>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold mt-0.5">El sueño comienza.</p>
        </div>
      </div>
    </div>
  );
}

// ── Anuncio: pestaña Eliminatorias abierta (solo admin por ahora) ──
function EliminatoriasAnnouncementCard() {
  const secs = useLiveCountdown(ELIMINATORIAS_DEADLINE);
  if (secs === null || secs === 0) return null;
  return (
    <Link to="/eliminatorias" search={{ reglas: true }} className="group relative block rounded-2xl overflow-hidden shadow-soft">
      <img src={estadioClaroImg} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/65 to-black/85" />
      <div className="relative px-4 py-2.5 text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 mb-1">
          <span className="text-[9px] font-black uppercase tracking-widest">¡Nuevo!</span>
        </div>
        <h2 className="display text-lg leading-tight">¿QUIERES REMONTAR?</h2>
        <p className="text-xs text-white/75 mt-0.5 leading-snug max-w-[300px]">
          La nueva pestaña de Eliminatorias ya está abierta. Pronostica tocando cada partido del Cuadro, completa tu Juego y responde los BONUS.
        </p>
        <div className="flex items-center justify-between mt-2 gap-2">
          <span className="text-[9px] text-white/45 uppercase tracking-wide">Nuevo juego abierto · reglas explicadas dentro</span>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gold text-pitch-deep font-black text-[11px] px-3 py-1.5 group-hover:bg-gold/90 transition-colors whitespace-nowrap">
            Jugar eliminatorias <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Cuenta atrás: cierre Juego + BONUS eliminatorias ──────────
const ELIMINATORIAS_DEADLINE = "2026-06-28T19:00:00Z"; // domingo 28 jun, 21:00 CEST

function EliminatoriasCountdownCard() {
  const secs = useLiveCountdown(ELIMINATORIAS_DEADLINE);
  if (secs === null || secs === 0) return null;

  const days = Math.floor(secs / 86400);
  const hh = String(Math.floor((secs % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const units = days > 0
    ? [{ val: String(days), label: "días" }, { val: hh, label: "h" }, { val: mm, label: "min" }]
    : [{ val: hh, label: "h" }, { val: mm, label: "min" }, { val: ss, label: "seg" }];

  return (
    <Link to="/eliminatorias" search={{ reglas: true }} className="relative block rounded-xl overflow-hidden shadow-soft">
      <img src={balonenporteriaImg} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 blur-[1px]" />
      <div className="absolute inset-0 bg-black/72" />
      <div className="relative px-4 py-2 text-white flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-snug">Rellena tu Cuadro y los BONUS</p>
          <p className="text-xs text-white/65">Antes de que empiece la fase final</p>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {units.map(({ val, label }, i) => (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && <span className="font-black text-base text-white/30 pb-3">:</span>}
              <div className="flex flex-col items-center">
                <div className="bg-white/15 border border-white/20 rounded-lg px-1.5 py-0.5 min-w-[32px] text-center">
                  <span className="font-mono font-black text-lg tabular-nums leading-none">{val}</span>
                </div>
                <span className="text-[7px] font-bold uppercase tracking-widest text-amber-400/80 mt-0.5">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

// ── Anuncio: puntos de Especiales de fase de grupos ya recalculados ──
const GROUP_STAGE_RESULTS = [
  { q: "Máximo goleador", a: "Lionel Messi" },
  { q: "Máximo asistente", a: "Michael Olise" },
  { q: "Equipo invicto", a: "Argentina, Francia, España…" },
  { q: "Primer 0-0", a: "España vs Cabo Verde" },
  { q: "Grupo con más goles", a: "Grupo I" },
];

function GroupStageResultsCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full text-left rounded-2xl overflow-hidden shadow-soft"
      >
        <img src={estadioSpain1Img} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black/85" />
        <div className="relative px-4 py-2.5 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-0.5 mb-1">
            <Check className="h-3 w-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Puntos recalculados</span>
          </div>
          <h2 className="display text-lg leading-tight">ESPECIALES · FASE DE GRUPOS</h2>
          <p className="text-xs text-white/75 mt-0.5 leading-snug max-w-[320px]">
            Ya están sumados los puntos de las 5 preguntas especiales de la fase de grupos. Toca para ver las respuestas correctas.
          </p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" /> Respuestas · Fase de grupos
            </DialogTitle>
            <DialogDescription>Así se han puntuado las 5 preguntas especiales de la fase de grupos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {GROUP_STAGE_RESULTS.map(({ q, a }) => (
              <div key={q} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{q}</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0" /> {a}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Anuncio: encuesta sobre llevar el juego a LaLiga/Champions/Premier ──
const LEAGUE_OPTIONS = [
  { key: "laliga", label: "LaLiga" },
  { key: "champions", label: "Champions" },
  { key: "premier", label: "Premier" },
];

function SurveyAnnouncementCard() {
  const { user, isAdmin } = useAuth();
  const secs = useLiveCountdown(ELIMINATORIAS_DEADLINE);
  const visible = isAdmin || secs === null || secs === 0;
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full text-left rounded-2xl overflow-hidden shadow-soft"
      >
        <img
          src={anuncio1Img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover scale-125"
          style={{ objectPosition: "8% 35%", transformOrigin: "left center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/70 to-black/90" />
        <div className="relative flex flex-col items-center px-4 py-3 text-white">
          <div className="self-end text-right max-w-[82%] sm:max-w-[65%]">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gold px-2 py-0.5 mb-1 text-pitch-deep">
              <span className="text-[9px] font-black uppercase tracking-widest">Tu opinión cuenta</span>
            </div>
            <h2 className="display text-lg leading-tight">¿TE ESTÁ GUSTANDO?</h2>
            <p className="text-xs text-white/80 mt-0.5 leading-snug">
              Queremos hacer algo parecido para LaLiga, Champions o Premier. Queremos tus ideas.
            </p>
          </div>
          <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-4 py-1.5 text-sm font-bold">
            ¡Clica! →
          </span>
        </div>
      </button>
      <SurveyDialog open={open} onClose={() => setOpen(false)} userId={user?.id} />
    </>
  );
}

function SurveyDialog({ open, onClose, userId }: { open: boolean; onClose: () => void; userId?: string }) {
  const qc = useQueryClient();
  const { data: response } = useMySurveyResponse(userId);
  const { data: ideas } = useMySurveyIdeas(userId);
  const [wouldPlay, setWouldPlay] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [ideaText, setIdeaText] = useState("");
  const [sendingIdea, setSendingIdea] = useState(false);

  useEffect(() => {
    setWouldPlay(response?.would_play ?? null);
    setLeagues(response?.leagues ?? []);
  }, [response]);

  async function saveResponse(next: { would_play?: string | null; leagues?: string[] }) {
    if (!userId) return;
    const payload = {
      user_id: userId,
      would_play: next.would_play !== undefined ? next.would_play : wouldPlay,
      leagues: next.leagues !== undefined ? next.leagues : leagues,
    };
    const { error } = await (supabase as any).from("survey_responses").upsert(payload, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["survey_response", userId] });
    qc.invalidateQueries({ queryKey: ["all_survey_responses"] });
  }

  function pickWouldPlay(v: string) {
    setWouldPlay(v);
    saveResponse({ would_play: v });
  }

  function toggleLeague(key: string) {
    const next = leagues.includes(key) ? leagues.filter((l) => l !== key) : [...leagues, key];
    setLeagues(next);
    saveResponse({ leagues: next });
  }

  async function sendIdea() {
    if (!userId || !ideaText.trim()) return;
    setSendingIdea(true);
    const { error } = await (supabase as any).from("survey_ideas").insert({ user_id: userId, idea_text: ideaText.trim() });
    setSendingIdea(false);
    if (error) { toast.error(error.message); return; }
    setIdeaText("");
    toast.success("¡Idea enviada! Gracias 🙌");
    qc.invalidateQueries({ queryKey: ["survey_ideas", userId] });
    qc.invalidateQueries({ queryKey: ["all_survey_ideas"] });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg leading-snug">¿Te gustaría algo parecido para LaLiga, Champions o Premier?</DialogTitle>
          <DialogDescription>
            Estamos valorando hacerlo en septiembre. Responde lo que quieras ahora y vuelve más tarde si te falta algo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Q1 + Q2 */}
          <div className="space-y-4 rounded-xl border border-border p-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold">1. ¿Jugarías a algo parecido para LaLiga, Champions o Premier?</p>
              <div className="flex gap-2">
                {["yes", "no"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => pickWouldPlay(v)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-colors ${
                      wouldPlay === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {v === "yes" ? "Sí" : "No"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">2. ¿Cuáles jugarías de todas estas?</p>
              <p className="text-xs text-muted-foreground">Puedes marcar una, varias o las tres.</p>
              <div className="flex gap-2 flex-wrap">
                {LEAGUE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleLeague(opt.key)}
                    className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
                      leagues.includes(opt.key) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => toast.success("¡Guardado!")}
              className="w-full py-2 rounded-lg border border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors"
            >
              Guardar
            </button>
          </div>

          {/* Q3 — aparte, para que no se confunda con lo de arriba */}
          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">3. ¿Qué ideas tienes? ¿Qué te gustaría añadir o mejorar?</p>
            <Textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Escribe tu idea…"
              className="text-sm"
            />
            <button
              type="button"
              onClick={sendIdea}
              disabled={sendingIdea || !ideaText.trim()}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {sendingIdea ? "Enviando…" : "Enviar idea"}
            </button>
            <p className="text-[11px] text-muted-foreground">Puedes enviar más de una idea, cuando quieras.</p>
            {(ideas?.length ?? 0) > 0 && (
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground">Tus ideas enviadas ({ideas!.length}):</p>
                {ideas!.map((i) => (
                  <div key={i.id} className="text-xs rounded-md bg-muted/50 px-2 py-1.5">{i.idea_text}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Anuncios creados desde admin ──────────────────────────────
function CustomAnnouncements() {
  const { isAdmin } = useAuth();
  const { data: announcements } = useAnnouncements();
  const visible = (announcements ?? []).filter(
    (a: any) => isAnnouncementLive(a) && (a.visibility === "all" || isAdmin)
  );
  if (visible.length === 0) return null;
  return (
    <>
      {visible.map((a: any) => (
        <AnnouncementCard key={a.id} announcement={a} />
      ))}
    </>
  );
}

// ── Anuncio: reapertura del Juego hasta el lunes 29 jun 19:00 ──
const JUEGO_REOPEN_DEADLINE = "2026-06-29T17:00:00Z"; // lunes 29 jun, 19:00 CEST

function JuegoReopenCard() {
  const secs = useLiveCountdown(JUEGO_REOPEN_DEADLINE);
  if (secs === null || secs === 0) return null;

  const days = Math.floor(secs / 86400);
  const hh = String(Math.floor((secs % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const units = days > 0
    ? [{ val: String(days), label: "días" }, { val: hh, label: "h" }, { val: mm, label: "min" }]
    : [{ val: hh, label: "h" }, { val: mm, label: "min" }, { val: ss, label: "seg" }];

  return (
    <Link to="/eliminatorias" search={{ tab: "juego" }} className="relative block rounded-2xl overflow-hidden shadow-soft">
      <img src={estadioClaroImg} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black/85" />
      <div className="relative flex flex-col items-center px-4 py-3 text-white">
        <h2 className="display text-lg leading-tight">RELLENA TU JUEGO</h2>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5">
          {units.map(({ val, label }, i) => (
            <div key={label} className="flex items-center gap-1.5">
              {i > 0 && <span className="font-black text-base text-white/30 pb-3">:</span>}
              <div className="flex flex-col items-center">
                <span className="font-mono font-black text-lg tabular-nums leading-none">{val}</span>
                <span className="text-[7px] font-bold uppercase tracking-widest text-amber-400/80 mt-0.5">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

// ── Inaugural match card ──────────────────────────────────────
const INAUGURAL_KICKOFF_UTC = "2026-06-11T19:00:00Z"; // 21:00 CEST

function InauguralCard() {
  if (new Date() >= new Date(INAUGURAL_KICKOFF_UTC)) return null;
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-soft min-h-[160px]">
      <img src={estadioImg} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/75 to-black/40" />
      <div className="relative p-4 text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest">Noticia destacada</span>
        </div>
        <div className="flex items-start gap-3">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <h2 className="display leading-tight">
              <span className="text-xl text-white">¡HOY EMPIEZA</span><br />
              <span className="text-3xl text-gold">EL MUNDIAL!</span>
            </h2>
            <p className="text-[11px] text-white/65 mt-2 leading-relaxed max-w-[180px]">
              Vuelve la felicidad de todo hombre. Haz tus pronósticos y demuestra que eres el mejor.
            </p>
          </div>
          {/* Right: VS */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col items-center gap-1">
                <img src={mexicoImg} alt="México" className="w-11 h-11 rounded-full object-cover border-2 border-white/25 shadow-lg" />
                <span className="text-[9px] font-bold uppercase text-white/80 tracking-wide">México</span>
              </div>
              <span className="display text-base font-black text-gold">VS</span>
              <div className="flex flex-col items-center gap-1">
                <img src={sudafricaImg} alt="Sudáfrica" className="w-11 h-11 rounded-full object-cover border-2 border-white/25 shadow-lg" />
                <span className="text-[9px] font-bold uppercase text-white/80 tracking-wide">Sudáfrica</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1 text-[10px] text-white/75">
              🕐 Hoy, 21:00
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-gold">Partido inaugural</span>
            <Link
              to="/pronosticos"
              className="rounded-full bg-gold text-pitch-deep font-black text-[11px] px-4 py-1.5 hover:bg-gold/90 transition-colors"
            >
              Ver partido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const { user, isAdmin } = useAuth();
  const { data: rows, isLoading } = useLeaderboard();
  const { data: dailyWinner } = useDailyWinner();
  const { data: profiles } = useProfiles();
  const { data: myLeagues, isLoading: myLeaguesLoading } = useMyLeagues(user?.id);
  const { data: allLeagues } = useLeagues();
  const { data: myLeagueCodes } = useMyLeagueInviteCodes(user?.id);
  const { data: allMembers } = useAllLeagueMembers();
  const { data: allSnaps } = useAllSnapshots();
  const { data: bonusQuestions } = useBonusQuestions();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const classificationRef = useRef<HTMLElement>(null);

  function selectLeague(id: string | null) {
    setSelectedLeagueId(id);
    setTimeout(() => {
      classificationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [manageLeague, setManageLeague] = useState<{ id: string; name: string } | null>(null);
  const [changeNameOpen, setChangeNameOpen] = useState(false);
  const [leaguesExpanded, setLeaguesExpanded] = useState(false);
  const LEAGUES_VISIBLE = 2;
  const nameAlreadyChanged = !!user && !!localStorage.getItem(`name_changed_${user.id}`);

  const usersWithLeagues = useMemo(() => new Set((allMembers ?? []).map((m) => m.user_id)), [allMembers]);
  const list = rows ?? [];

  const membersByLeague = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    (allMembers ?? []).forEach(({ league_id, user_id }) => {
      (map[league_id] ||= new Set()).add(user_id);
    });
    return map;
  }, [allMembers]);

  const filteredList = useMemo(() => {
    if (!selectedLeagueId) return list;
    const ids = membersByLeague[selectedLeagueId];
    if (!ids) return list;
    return list.filter((r) => ids.has(r.user_id));
  }, [list, selectedLeagueId, membersByLeague]);

  const selectedMemberIds = selectedLeagueId ? (membersByLeague[selectedLeagueId] ?? null) : null;

  const leagueDailyWinner = useMemo(() => {
    if (!selectedLeagueId || !allSnaps?.length) return null;
    const ids = membersByLeague[selectedLeagueId];
    if (!ids) return null;
    const latestDate = [...new Set(allSnaps.map((s) => s.snapshot_date))].sort().at(-1);
    if (!latestDate) return null;
    return allSnaps
      .filter((s) => s.snapshot_date === latestDate && ids.has(s.user_id))
      .sort((a, b) => b.total_points - a.total_points)[0] ?? null;
  }, [allSnaps, selectedLeagueId, membersByLeague]);

  const effectiveWinner = selectedLeagueId ? leagueDailyWinner : dailyWinner;
  const dailyProfile = effectiveWinner
    ? (profiles ?? []).find((p: any) => p.id === effectiveWinner.user_id)
    : null;

  const myProfile = useMemo(() => (profiles ?? []).find((p: any) => p.id === user?.id), [profiles, user]);
  const displayName = myProfile?.display_name ?? myProfile?.avatar_emoji ?? "campeón";

  const myLeagueList = (myLeagues ?? []).map((m) => m.league).filter(Boolean) as any[];
  const filterLeagueList = isAdmin ? (allLeagues ?? []) : myLeagueList;

  useEffect(() => {
    if (!hasAutoSelected && filterLeagueList.length > 0) {
      setSelectedLeagueId(filterLeagueList[0].id);
      setHasAutoSelected(true);
    }
  }, [filterLeagueList, hasAutoSelected]);

  const selectedLeague = filterLeagueList.find((l: any) => l.id === selectedLeagueId) ?? null;

  // Posiciones del día anterior para mostrar flechas de cambio
  const yesterdayPositions = useMemo(() => {
    if (!allSnaps?.length) return {} as Record<string, number>;
    const dates = [...new Set(allSnaps.map((s) => s.snapshot_date))].sort();
    if (dates.length < 2) return {} as Record<string, number>;
    const prevDate = dates[dates.length - 2];
    const prevSnaps = allSnaps.filter((s) => {
      if (s.snapshot_date !== prevDate) return false;
      if (selectedLeagueId) return membersByLeague[selectedLeagueId]?.has(s.user_id) ?? false;
      return usersWithLeagues.has(s.user_id);
    });
    const sorted = [...prevSnaps].sort((a, b) => b.total_points - a.total_points);
    const pos: Record<string, number> = {};
    sorted.forEach((s, i) => { pos[s.user_id] = i + 1; });
    return pos;
  }, [allSnaps, selectedLeagueId, membersByLeague, usersWithLeagues]);

  function handleInvite() {
    const url = window.location.origin;
    const message = `🏆 Únete a El Mundial conmigo. Pronostica los partidos y compite por el trofeo: ${url}`;
    if (navigator.share) {
      navigator.share({ title: "El Mundial", text: message, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message).then(() => toast.success("Enlace copiado")).catch(() => {});
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-5">

      {/* Perfil */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="display text-3xl">¡Hola, {displayName}!</h1>
        </div>
        <button
          onClick={() => !nameAlreadyChanged && setChangeNameOpen(true)}
          disabled={nameAlreadyChanged}
          title={nameAlreadyChanged ? "Solo puedes cambiar el nombre una vez" : "Cambiar tu nombre visible"}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors shadow-soft ${
            nameAlreadyChanged
              ? "border-border text-muted-foreground/40 cursor-not-allowed"
              : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          {nameAlreadyChanged ? "Nombre fijado" : "Editar nombre"}
        </button>
      </div>

      {/* Mis puntos */}
      {(() => {
        const myPos = list.findIndex((r) => r.user_id === user.id);
        const myRow = myPos >= 0 ? list[myPos] : null;
        if (!myRow) return null;
        return (
          <div className="relative rounded-2xl overflow-hidden shadow-soft">
            <img src={estadioEpicoImg} alt="" className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[1px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/65 to-black/40" />
            <div className="relative px-5 py-4 text-white flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gold/80 mb-1">Tus puntos</p>
                <div className="flex items-end gap-1.5 leading-none">
                  <span className="display font-black text-white" style={{ fontSize: "3.25rem", lineHeight: 1 }}>{myRow.total_points}</span>
                  <span className="text-xl font-bold text-gold mb-1">pts</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Posición</p>
                <span className="display font-black text-gold" style={{ fontSize: "2.75rem", lineHeight: 1 }}>#{myPos + 1}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Instalar como app */}
      <InstallPWA />

      {/* Partido España */}
      <SpainMatchCard />

      {/* Noticia destacada: Partido inaugural */}
      <InauguralCard />

      {/* Anuncio nuevo plazo especiales */}
      <NuevoPlazoCard />

      {/* Anuncio: pestaña Eliminatorias — visible para todos */}
      <EliminatoriasAnnouncementCard />
      <EliminatoriasCountdownCard />
      <SurveyAnnouncementCard />
      <JuegoReopenCard />

      {/* Anuncios creados desde admin */}
      <CustomAnnouncements />

      {/* Card global — discreta */}
      <button
        onClick={() => selectLeague(null)}
        className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all border ${
          !selectedLeagueId
            ? "bg-muted border-border text-foreground"
            : "bg-transparent border-border/50 text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <span className="text-base">🌍</span>
        <span className="text-xs font-medium flex-1">Clasificación Global · {list.length} participantes</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {/* Aviso recarga */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
        <span>🔄</span>
        <span>Recarga la página de vez en cuando para ver las últimas actualizaciones.</span>
      </div>

      {/* Mis ligas */}
      <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mis ligas</span>
        </div>

        {(leaguesExpanded ? filterLeagueList : filterLeagueList.slice(0, LEAGUES_VISIBLE)).map((league: any) => {
          const isSelected = selectedLeagueId === league.id;
          const memberCount = membersByLeague[league.id]?.size ?? 0;
          const isCreator = league.creator_id === user.id;
          const membership = (myLeagues ?? []).find((m) => m.league_id === league.id);
          const isLeagueAdmin = isAdmin || membership?.is_league_admin;
          const inviteCode = isCreator ? (myLeagueCodes ?? []).find((c) => c.league_id === league.id)?.invite_code ?? null : null;

          return (
            <div
              key={league.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 transition-colors ${
                isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/50"
              }`}
            >
              <button
                onClick={() => selectLeague(league.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <span className="text-xl shrink-0">👥</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold text-sm truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {league.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{memberCount} participantes</div>
                  {inviteCode && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                      Código: {inviteCode}
                    </div>
                  )}
                </div>
              </button>
              {isLeagueAdmin ? (
                <button
                  onClick={() => setManageLeague({ id: league.id, name: league.name })}
                  className="shrink-0 text-[11px] font-medium text-muted-foreground border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors"
                >
                  Gestionar
                </button>
              ) : null}
            </div>
          );
        })}

        {filterLeagueList.length > LEAGUES_VISIBLE && (
          <button
            onClick={() => setLeaguesExpanded(!leaguesExpanded)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors border-t border-border"
          >
            {leaguesExpanded ? (
              <><ChevronDown className="h-3.5 w-3.5 rotate-180" /> Ver menos</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> {filterLeagueList.length - LEAGUES_VISIBLE} liga{filterLeagueList.length - LEAGUES_VISIBLE > 1 ? "s" : ""} más</>
            )}
          </button>
        )}
      </section>

      {/* Acciones rápidas */}
      <section>
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Acciones rápidas</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors shadow-soft"
          >
            <Plus className="h-4 w-4" /> Crear liga
          </button>
          <button
            onClick={() => setJoinOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium hover:bg-muted transition-colors shadow-soft"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" /> Unirse a liga
          </button>
          <Link
            to="/reglas"
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium hover:bg-muted transition-colors shadow-soft"
          >
            <BookOpen className="h-4 w-4 text-muted-foreground" /> Ver reglas
          </Link>
        </div>
        <button
          onClick={handleInvite}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" /> Invita a tus amigos
        </button>
      </section>

      {/* Clasificación */}
      <section ref={classificationRef} className="relative overflow-hidden rounded-3xl shadow-soft scroll-mt-4">
        <img src={heroImg} alt="Trofeo" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-t from-pitch-deep via-pitch-deep/80 to-pitch-deep/30" />
        <div className="relative p-5 md:p-8 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-gold/90">
                {selectedLeague ? "Tu liga" : "Ranking mundial"}
              </div>
              <motion.h2
                key={selectedLeagueId ?? "global"}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="display text-4xl leading-none"
              >
                <span className="text-gold flex items-center gap-2">
                  <Trophy className="h-7 w-7" />
                  {selectedLeague ? selectedLeague.name : "Global"}
                </span>
              </motion.h2>
            </div>
            <div className="text-xs text-white/50 text-right">
              {filteredList.length} participantes<br />
              <span className="text-[10px]">
                Actualizado {new Date().toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-white/70">Cargando…</div>
          ) : filteredList.length === 0 ? (
            <div className="py-8 text-white/70">Aún no hay participantes en esta liga.</div>
          ) : (
            <motion.div
              key={selectedLeagueId ?? "global"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={`space-y-1 ${filteredList.length > 10 ? "max-h-[30rem] overflow-y-auto pr-1" : ""}`}
            >
              {filteredList.map((r, i) => {
                const prevPos = yesterdayPositions[r.user_id];
                const diff = prevPos != null ? prevPos - (i + 1) : null;
                return (
                  <motion.div
                    key={r.user_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                      i === 0 ? "bg-gold/20 border border-gold/30" : "bg-white/5 border border-white/10"
                    }`}
                  >
                    <span className="w-7 text-center font-bold text-base shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-white/60 text-sm">{i + 1}</span>}
                    </span>
                    <span className="flex-1 font-semibold truncate text-sm">{r.display_name}</span>
                    {diff !== null && diff !== 0 && (
                      <span className={`text-[10px] font-bold tabular-nums shrink-0 ${diff > 0 ? "text-green-400" : "text-red-400"}`}>
                        {diff > 0 ? "▲" : "▼"}{Math.abs(diff)}
                      </span>
                    )}
                    {diff === 0 && <span className="text-[10px] text-white/30 shrink-0">—</span>}
                    {i === 0 && <Crown className="h-4 w-4 text-gold shrink-0" />}
                    <span className={`font-bold tabular-nums text-lg shrink-0 ${i === 0 ? "text-gold" : "text-white/90"}`}>
                      {r.total_points}
                      <span className="text-[10px] font-normal text-white/50 ml-0.5">pts</span>
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Evolución diaria */}
      {isAdmin ? (
        <EvolutionChart memberIds={selectedMemberIds ?? undefined} />
      ) : (
        <section className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <span className="display text-2xl">📈</span>
            <span className="display text-2xl">Evolución diaria</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted-foreground">
            <span className="text-3xl">🚧</span>
            <p className="text-sm font-medium">Próximamente</p>
            <p className="text-xs opacity-70">El gráfico de evolución estará disponible en breve.</p>
          </div>
        </section>
      )}


      {/* Invita */}
      <InviteCard />

      {/* Solo admin: usuarios con/sin liga */}
      {isAdmin && (() => {
        const withLeague = (profiles ?? []).filter((p: any) => usersWithLeagues.has(p.id));
        const noLeague = (profiles ?? []).filter((p: any) => !usersWithLeagues.has(p.id));
        return (
          <details className="rounded-xl border border-border bg-card/50 text-xs overflow-hidden">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors list-none">
              <span className="font-medium">🔒 Solo admin · ligas</span>
              <span className="flex gap-2">
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">{withLeague.length} con liga</span>
                <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 font-semibold">{noLeague.length} sin liga</span>
              </span>
            </summary>
            <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
              {noLeague.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-destructive/70 mb-1">Sin liga</p>
                  <div className="flex flex-wrap gap-1">
                    {noLeague.map((p: any) => (
                      <span key={p.id} className="rounded-full bg-destructive/8 border border-destructive/20 px-2 py-0.5 text-[11px] text-destructive/80">
                        {p.avatar_emoji} {p.display_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Con liga ({withLeague.length})</p>
                <div className="flex flex-wrap gap-1">
                  {withLeague.map((p: any) => (
                    <span key={p.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {p.avatar_emoji} {p.display_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </details>
        );
      })()}

      <NoLeagueModal
        myLeagues={myLeagues}
        myLeaguesLoading={myLeaguesLoading}
        onJoin={() => setJoinOpen(true)}
        onCreate={() => setCreateOpen(true)}
      />
      <CreateLeagueModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinLeagueModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      {manageLeague && (
        <ManageLeagueModal
          leagueId={manageLeague.id}
          leagueName={manageLeague.name}
          open={!!manageLeague}
          onClose={() => setManageLeague(null)}
        />
      )}
      <ChangeNameModal
        open={changeNameOpen}
        currentName={myProfile?.display_name ?? ""}
        userId={user.id}
        onClose={() => setChangeNameOpen(false)}
      />
    </div>
  );
}

function ChangeNameModal({ open, currentName, userId, onClose }: {
  open: boolean; currentName: string; userId: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("display_name", trimmed)
      .neq("id", userId)
      .limit(1);
    if (existing && existing.length > 0) {
      toast.error("Ese nombre ya está en uso. Elige otro.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar. Inténtalo de nuevo."); return; }
    localStorage.setItem(`name_changed_${userId}`, "1");
    qc.invalidateQueries({ queryKey: ["profiles"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
    toast.success(`¡Listo! Ahora te llamas ${trimmed}.`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Cambiar nombre
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Este nombre aparecerá en la clasificación y en todas tus ligas.</p>
              <p className="font-semibold text-amber-500">⚠️ Solo puedes cambiarlo una vez.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre o apodo"
            maxLength={30}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button
            onClick={save}
            disabled={saving || !name.trim() || name.trim() === currentName}
            className="w-full rounded-xl bg-pitch-deep text-white py-2.5 font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Guardando…" : "Confirmar nombre"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
