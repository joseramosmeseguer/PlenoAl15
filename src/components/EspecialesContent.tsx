import { useMemo, useState } from "react";
import { useBonusQuestions, useBonusPredictions, useTeams, useMatches } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { formatCountdown } from "@/lib/scoring";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Sparkles, Trophy, Flag, Star } from "lucide-react";
import { BonusCard } from "@/components/BonusCard";
import { isMinijuegoLocation, locationLabel } from "@/lib/bonus-locations";

const SECTION_META: Record<string, {
  title: string;
  icon: any;
  bg: string;
  border: string;
  text: string;
  bar: string;
  accent: string;
}> = {
  mis_especiales_generales: {
    title: "Generales", icon: Trophy,
    bg: "bg-emerald-900", border: "border-emerald-600/50", text: "text-emerald-50", bar: "bg-emerald-400",
    accent: "#34d399",
  },
  mis_especiales_tops: {
    title: "Tops del torneo", icon: Star,
    bg: "bg-amber-900", border: "border-amber-600/50", text: "text-amber-50", bar: "bg-amber-400",
    accent: "#fbbf24",
  },
  mis_especiales_grupos: {
    title: "Fase de grupos", icon: Flag,
    bg: "bg-teal-900", border: "border-teal-600/50", text: "text-teal-50", bar: "bg-teal-400",
    accent: "#2dd4bf",
  },
};

const SECTION_ORDER = [
  "mis_especiales_generales",
  "mis_especiales_tops",
  "mis_especiales_grupos",
];

export function EspecialesContent({ showHero = true }: { showHero?: boolean }) {
  const { user, isAdmin } = useAuth();
  if (!user) return null;
  const qc = useQueryClient();
  const { data: bonus } = useBonusQuestions();
  const { data: myBonus } = useBonusPredictions(user.id);
  const { data: teams } = useTeams();
  const { data: matches } = useMatches();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const byLoc = useMemo(() => {
    const map: Record<string, any[]> = {};
    (bonus ?? []).forEach((q: any) => {
      if (isMinijuegoLocation(q.location)) return;
      if (q.location === "mis_especiales_eliminatorias") return;
      if (!isAdmin && q.is_visible === false) return;
      const k = q.location ?? "mis_especiales_generales";
      (map[k] ||= []).push(q);
    });
    return map;
  }, [bonus, isAdmin]);

  const orderedKeys = useMemo(() => {
    const keys = Object.keys(byLoc);
    const ordered = SECTION_ORDER.filter((k) => keys.includes(k));
    const custom = keys.filter((k) => !SECTION_ORDER.includes(k)).sort();
    return [...ordered, ...custom];
  }, [byLoc]);

  const answerMap = useMemo(() => {
    const map: Record<string, any> = {};
    (myBonus ?? []).forEach((p: any) => (map[p.bonus_id] = p.answer));
    return map;
  }, [myBonus]);

  const pointsMap = useMemo(() => {
    const map: Record<string, number> = {};
    (myBonus ?? []).forEach((p: any) => (map[p.bonus_id] = p.points_awarded ?? 0));
    return map;
  }, [myBonus]);

  return (
    <div className="space-y-3">
      {showHero && (
        <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
          <div className="display text-3xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" /> Pronósticos especiales
          </div>
          <p className="text-white/80 text-sm">Apuestas extra que dan puntos al final del torneo.</p>
        </div>
      )}

      {orderedKeys.map((k) => {
        const items = byLoc[k];
        if (!items?.length) return null;
        const meta = SECTION_META[k];
        const Icon = meta?.icon ?? Sparkles;
        const bg = meta?.bg ?? "bg-slate-950";
        const border = meta?.border ?? "border-slate-700/50";
        const text = meta?.text ?? "text-slate-50";
        const bar = meta?.bar ?? "bg-slate-400";
        const title = meta?.title ?? locationLabel(items[0]);
        const completed = items.filter((b: any) => isAnswered(answerMap[b.id])).length;
        const pct = Math.round((completed / items.length) * 100);
        const open = openKey === k;

        return (
          <section key={k} className={`overflow-hidden rounded-xl border shadow-soft ${bg} ${border}`}>
            {/* Header */}
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : k)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 ${text}`}
            >
              <Icon className="h-5 w-5 text-gold shrink-0" />
              <span className="font-display text-xl uppercase tracking-wide">{title}</span>
              <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-bold tabular-nums">
                {completed}/{items.length}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/10">
              <div
                className={`h-full ${bar} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Section countdown */}
            {(() => {
              const firstDeadline = [...items]
                .map((b: any) => b.deadline_at)
                .filter(Boolean)
                .sort()[0];
              const cd = firstDeadline ? formatCountdown(firstDeadline) : null;
              if (!cd) return null;
              const cdCls = cd.variant === "red"
                ? "text-red-400 border-red-800/50 bg-red-950/40"
                : cd.variant === "amber"
                ? "text-amber-300 border-amber-700/50 bg-amber-950/40"
                : "text-emerald-400 border-emerald-800/50 bg-emerald-950/40";
              return (
                <div className={`flex items-center gap-2 px-4 py-1.5 text-xs ${text}`}>
                  <span className="opacity-50">Cierra en</span>
                  <span className={`font-semibold px-1.5 py-0.5 rounded border text-[10px] ${cdCls}`}>
                    {cd.label}
                  </span>
                </div>
              );
            })()}

            {/* Collapsed summary */}
            {!open && (
              <div className={`flex items-center justify-between px-4 py-2 text-xs ${text} opacity-60`}>
                <span>{items.length} pronósticos</span>
                <span className="font-bold">{pct}%</span>
              </div>
            )}

            {/* Expanded stats */}
            {open && (
              <div className={`flex items-center gap-5 px-4 pt-3 pb-1 text-xs ${text} opacity-70`}>
                <span><span className="font-bold text-sm mr-1">{items.length}</span>Pronósticos</span>
                <span><span className="font-bold text-sm mr-1">{completed}</span>Completado</span>
                <span className="ml-auto font-bold">{pct}%</span>
              </div>
            )}

            {/* Cards */}
            {open && (
              <div className="grid gap-2 p-2.5 md:grid-cols-2 bg-black/10">
                {items.map((b: any) => (
                  <BonusCard
                    key={b.id}
                    bonus={b}
                    mine={answerMap[b.id]}
                    pointsAwarded={pointsMap[b.id] ?? 0}
                    teams={teams ?? []}
                    matches={matches ?? []}
                    accent={meta?.accent}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["bonus_predictions", user.id] })}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function isAnswered(answer: any) {
  if (!answer) return false;
  if (Array.isArray(answer.values)) return answer.values.some((v: string) => String(v ?? "").trim());
  return !!String(answer.value ?? answer.text ?? "").trim();
}
