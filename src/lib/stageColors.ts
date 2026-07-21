// Color distinto por ronda de eliminatoria, para diferenciarlas de un vistazo.
// Compartido entre "Todos", Calendario y Estadísticas.
export const STAGE_BADGE_COLORS: Record<string, { badge: string; border: string }> = {
  round_of_32: { badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30", border: "border-l-slate-500" },
  round_of_16: { badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30", border: "border-l-sky-500" },
  quarter_final: { badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30", border: "border-l-purple-500" },
  semi_final: { badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", border: "border-l-amber-500" },
  third_place: { badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", border: "border-l-rose-500" },
  final: { badge: "bg-gold/15 text-gold border-gold/30", border: "border-l-gold" },
};
