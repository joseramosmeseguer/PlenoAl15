import { useMemo, useState } from "react";
import { useRealStats } from "@/lib/queries";
import { REAL_STAT_DEFS, REAL_STAT_CATEGORIES, type RealStatCategory } from "@/lib/realStats";

export function RealStatsTab() {
  const { data: stats } = useRealStats();
  const [cat, setCat] = useState<RealStatCategory>(REAL_STAT_CATEGORIES[0]);

  const byKey = useMemo(() => {
    const map: Record<string, typeof stats> = {} as any;
    (stats ?? []).forEach((s) => ((map[s.stat_key] ||= []) as any).push(s));
    return map;
  }, [stats]);

  const defsInCat = REAL_STAT_DEFS.filter((d) => d.category === cat);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Estos datos no se generan solos: los admins los actualizan a mano porque la web no está conectada a ninguna API deportiva.
      </p>
      <div className="flex gap-2 flex-wrap">
        {REAL_STAT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {defsInCat.map((def) => {
          const rows = (byKey[def.key] ?? []) as any[];
          const max = rows[0]?.value || 1;
          return (
            <div key={def.key} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h3 className="font-bold text-sm mb-3">{def.label}</h3>
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin datos todavía.</p>
              ) : (
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <span className="w-5 text-xs font-bold text-muted-foreground text-center shrink-0">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate text-xs font-medium">{r.name}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-gradient-pitch" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
                      </div>
                      <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground shrink-0">{r.value} {def.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
