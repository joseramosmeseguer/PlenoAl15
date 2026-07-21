import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { tallyBonusAnswers, respondentsCount } from "@/lib/bonusTally";

export function BonusStatsSection({
  questions,
  predsByQuestion,
  teams,
  matches,
}: {
  questions: any[];
  predsByQuestion: Record<string, any[]>;
  teams: any[];
  matches: any[];
}) {
  if (!questions.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">Aún no hay preguntas en esta sección.</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {questions.map((q) => (
        <BonusStatCard key={q.id} question={q} preds={predsByQuestion[q.id] ?? []} teams={teams} matches={matches} />
      ))}
    </div>
  );
}

function BonusStatCard({ question, preds, teams, matches }: { question: any; preds: any[]; teams: any[]; matches: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => tallyBonusAnswers(question, preds, teams, matches), [question, preds, teams, matches]);
  const respondents = respondentsCount(preds);
  const visible = expanded ? rows : rows.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-bold text-sm leading-tight">{question.label}</h3>
        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
          {respondents} {respondents === 1 ? "voto" : "votos"}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin respuestas todavía.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((r, i) => (
            <div key={r.label} className="flex items-center gap-2">
              <span className="w-5 text-xs font-bold text-muted-foreground text-center shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate text-xs font-medium">{r.label}</span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-gradient-pitch" style={{ width: `${r.pct}%` }} />
              </div>
              <span className="w-14 text-right text-[11px] tabular-nums text-muted-foreground shrink-0">{r.count} · {r.pct}%</span>
            </div>
          ))}
        </div>
      )}
      {rows.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Ver menos" : `Ver las ${rows.length}`}
        </button>
      )}
    </div>
  );
}
