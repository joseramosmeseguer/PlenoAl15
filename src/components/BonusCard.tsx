import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { formatKickoff } from "@/lib/scoring";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, EyeOff, Clock } from "lucide-react";
import { formatPlayerName } from "@/lib/format";
import {
  CONFED,
  TOP7_HISTORIC,
  AMERICA_CONFEDS,
  ASIA_OCEANIA_CONFEDS,
} from "@/lib/confederations";

// Favoritas excluidas de la pregunta "Sorpresa del Mundial"
const FAVORITE_CODES = ["GER", "NED", "ARG", "BRA", "MAR", "ESP", "ENG", "POR", "FRA"];

export function BonusCard({ bonus, mine, pointsAwarded, teams, matches, onSaved, accent }: any) {
  const { user, isAdmin } = useAuth();
  const now = Date.now();
  const notStarted = bonus.start_at && new Date(bonus.start_at).getTime() > now;
  const expired = new Date(bonus.deadline_at).getTime() < now;
  const inactive = bonus.is_active === false;
  const hidden = bonus.is_visible === false;
  const closed = inactive || expired || notStarted || hidden;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isPlayerAnswer = bonus.kind === "player" || bonus.kind === "top5_players";
  const isAnsweredSaved = mine && (
    (Array.isArray(mine.values) && mine.values.some((v: any) => String(v ?? "").trim())) ||
    !!String(mine.value ?? mine.text ?? "").trim()
  );

  const multiCount = Math.min(Math.max(Number(bonus.multi_text_count ?? 1), 1), 10);

  const [val, setVal] = useState<string>(mine?.value ?? mine?.text ?? "");
  const [list5, setList5] = useState<string[]>(() => {
    const arr = Array.isArray(mine?.values) ? mine.values : [];
    return [0, 1, 2, 3, 4].map((i) => arr[i] ?? "");
  });
  const [list3, setList3] = useState<string[]>(() => {
    const arr = Array.isArray(mine?.values) ? mine.values : [];
    return [0, 1, 2].map((i) => arr[i] ?? "");
  });
  const [multiVals, setMultiVals] = useState<string[]>(() => {
    const arr = Array.isArray(mine?.values) ? mine.values : [];
    return Array.from({ length: multiCount }, (_, i) => arr[i] ?? "");
  });

  const teamPool = useMemo(() => {
    if (!teams) return [];
    let pool = teams;
    if (bonus.key === "best_africa") pool = teams.filter((t: any) => CONFED[t.code] === "CAF");
    else if (bonus.key === "best_asia_oceania") pool = teams.filter((t: any) => ASIA_OCEANIA_CONFEDS.includes(CONFED[t.code]));
    else if (bonus.key === "best_america") pool = teams.filter((t: any) => AMERICA_CONFEDS.includes(CONFED[t.code]));
    else if (bonus.key === "best_europe") pool = teams.filter((t: any) => CONFED[t.code] === "UEFA");
    else if (bonus.key === "top7_out_first") pool = teams.filter((t: any) => TOP7_HISTORIC.includes(t.code));
    else if (bonus.key === "sorpresa_mundial") pool = teams.filter((t: any) => !FAVORITE_CODES.includes(t.code));
    const result = pool.length ? pool : teams;
    return [...result].sort((a: any, b: any) => a.name.localeCompare(b.name, "es"));
  }, [teams, bonus.key]);

  const groupLetters = useMemo(() => {
    const set = new Set<string>();
    (teams ?? []).forEach((t: any) => t.group_letter && set.add(t.group_letter));
    const arr = Array.from(set).sort();
    return arr.length ? arr : ["A","B","C","D","E","F","G","H","I","J","K","L"];
  }, [teams]);

  const matchPool = useMemo(() => {
    if (!matches) return [];
    const pool = bonus.key === "ko_top_match"
      ? matches.filter((m: any) => m.stage !== "group")
      : bonus.key === "r32_top_cards"
      ? matches.filter((m: any) => m.stage === "round_of_32")
      : matches;
    return [...pool].sort((a: any, b: any) => {
      const la = matchLabel(a);
      const lb = matchLabel(b);
      return la.localeCompare(lb, "es");
    });
  }, [matches, bonus.key, teams]);

  async function save() {
    setSaving(true);
    let answer: any;
    switch (bonus.kind) {
      case "top5_players":
        answer = { values: list5.map(formatPlayerName).filter(Boolean) };
        break;
      case "multi_match":
        answer = { values: list3.filter(Boolean) };
        break;
      case "multi_text":
        answer = { values: multiVals.map((v) => v.trim()).filter(Boolean) };
        break;
      case "player":
        answer = { value: formatPlayerName(val) };
        break;
      case "team":
      case "match":
      case "yes_no":
      case "bracket_side":
      case "group":
      case "stage":
        answer = { value: val };
        break;
      default:
        answer = { text: val };
    }
    const { error } = await supabase.from("bonus_predictions").upsert({
      user_id: user!.id,
      bonus_id: bonus.id,
      answer,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  }

  function teamLabel(code: string) {
    const t = (teams ?? []).find((x: any) => x.code === code);
    return t ? `${t.flag} ${t.name}` : code;
  }
  function matchLabel(m: any) {
    const home = m.home_code ? teamLabel(m.home_code) : (m.home_label ?? "TBD");
    const away = m.away_code ? teamLabel(m.away_code) : (m.away_label ?? "TBD");
    return `${home} - ${away}`;
  }

  return (
    <div
      className={`relative min-w-0 rounded-lg border-l-[3px] border border-white/20 bg-white/14 shadow-soft p-3 ${hidden ? "opacity-60" : ""}`}
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      {inactive && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-[1px]">
          <div className="rotate-[-18deg] border-[3px] border-red-500 rounded-lg px-5 py-2 shadow-lg">
            <span className="text-red-400 font-black text-2xl tracking-[0.25em] uppercase drop-shadow">SUSPENDIDO</span>
          </div>
        </div>
      )}
      {pointsAwarded > 0 && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-black shadow-md ring-2 ring-card">
          ✓ Acertado
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="display text-sm leading-tight truncate text-white">{bonus.label}</div>
          {isPlayerAnswer && (
            <div className="mt-0.5 text-[11px] leading-snug text-white/50">
              Nombre y apellido, sin tildes ni signos. Ej: Kylian Mbappe.
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="text-[11px] px-1.5 py-0.5 rounded bg-gold/20 text-gold whitespace-nowrap font-bold">
            +{bonus.points} pts
          </div>
          {isAnsweredSaved && (
            <div className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold whitespace-nowrap">
              ✓ guardado
            </div>
          )}
          {hidden && isAdmin && (
            <span className="text-[9px] flex items-center gap-0.5 text-flame font-semibold uppercase">
              <EyeOff className="h-2.5 w-2.5" /> Oculta
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {bonus.kind === "team" && (
          <select value={val} onChange={(e) => setVal(e.target.value)} disabled={closed} className="w-full text-sm border border-white/15 rounded-md px-2 py-1 bg-white/8 text-white">
            <option value="">— elegir equipo —</option>
            {teamPool.map((t: any) => <option key={t.code} value={t.code}>{t.flag} {t.name}</option>)}
          </select>
        )}

        {bonus.kind === "player" && (
          <Input
            value={val}
            disabled={closed}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => setVal(formatPlayerName(val))}
            placeholder="Nombre Apellido"
            className="h-8 text-sm bg-white/8 border-white/15 text-white placeholder:text-white/30"
          />
        )}

        {bonus.kind === "yes_no" && (
          <div className="flex gap-2">
            {["yes", "no"].map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={closed}
                onClick={() => setVal(opt)}
                className={`flex-1 text-sm py-1.5 rounded-md border transition ${val === opt ? "bg-white/25 text-white border-white/40" : "bg-white/8 border-white/15 text-white/70 hover:bg-white/15"} disabled:opacity-50`}
              >
                {opt === "yes" ? "Sí" : "No"}
              </button>
            ))}
          </div>
        )}

        {bonus.kind === "bracket_side" && (
          <div className="flex gap-2">
            {[["left", "Izquierdo"], ["right", "Derecho"]].map(([opt, label]) => (
              <button
                key={opt}
                type="button"
                disabled={closed}
                onClick={() => setVal(opt)}
                className={`flex-1 text-sm py-1.5 rounded-md border transition ${val === opt ? "bg-white/25 text-white border-white/40" : "bg-white/8 border-white/15 text-white/70 hover:bg-white/15"} disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {bonus.kind === "group" && (
          <select value={val} onChange={(e) => setVal(e.target.value)} disabled={closed} className="w-full text-sm border border-white/15 rounded-md px-2 py-1 bg-white/8 text-white">
            <option value="">— elegir grupo —</option>
            {groupLetters.map((g) => <option key={g} value={g}>Grupo {g}</option>)}
          </select>
        )}

        {bonus.kind === "match" && (
          <select value={val} onChange={(e) => setVal(e.target.value)} disabled={closed} className="w-full text-sm border border-white/15 rounded-md px-2 py-1 bg-white/8 text-white">
            <option value="">— elegir partido —</option>
            {matchPool.map((m: any) => (
              <option key={m.id} value={m.id}>{matchLabel(m)}</option>
            ))}
          </select>
        )}

        {bonus.kind === "stage" && (
          <Input value={val} disabled={closed} onChange={(e) => setVal(e.target.value)} placeholder="Fase" className="h-8 text-sm bg-white/8 border-white/15 text-white placeholder:text-white/30" />
        )}

        {bonus.kind === "top5_players" && (
          <div className="space-y-1">
            {list5.map((v, i) => (
              <Input
                key={i}
                value={v}
                disabled={closed}
                onChange={(e) => {
                  const next = [...list5]; next[i] = e.target.value; setList5(next);
                }}
                onBlur={() => {
                  const next = [...list5]; next[i] = formatPlayerName(next[i]); setList5(next);
                }}
                placeholder={`Jugador ${i + 1}`}
                className="h-7 text-sm bg-white/8 border-white/15 text-white placeholder:text-white/30"
              />
            ))}
          </div>
        )}

        {bonus.kind === "multi_match" && (
          <div className="space-y-1">
            {[0, 1, 2].map((i) => (
              <select
                key={i}
                value={list3[i]}
                onChange={(e) => {
                  const next = [...list3]; next[i] = e.target.value; setList3(next);
                }}
                disabled={closed}
                className="w-full text-sm border border-white/15 rounded-md px-2 py-1 bg-white/8 text-white"
              >
                <option value="">— partido {i + 1} —</option>
                {matchPool.map((m: any) => (
                  <option key={m.id} value={m.id}>{matchLabel(m)}</option>
                ))}
              </select>
            ))}
          </div>
        )}

        {bonus.kind === "multi_text" && (
          <div className="space-y-1">
            {Array.from({ length: multiCount }, (_, i) => (
              <Input
                key={i}
                value={multiVals[i] ?? ""}
                disabled={closed}
                onChange={(e) => {
                  const next = [...multiVals];
                  while (next.length < multiCount) next.push("");
                  next[i] = e.target.value;
                  setMultiVals(next);
                }}
                placeholder={`Respuesta ${i + 1}`}
                className="h-7 text-sm bg-white/8 border-white/15 text-white placeholder:text-white/30"
              />
            ))}
          </div>
        )}

        {bonus.kind === "text" && (
          <Input value={val} disabled={closed} onChange={(e) => setVal(e.target.value)} placeholder="Tu respuesta" className="h-8 text-sm bg-white/8 border-white/15 text-white placeholder:text-white/30" />
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap border-t border-white/10 pt-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-white/60 font-medium">
            {notStarted ? <>Abre: {formatKickoff(bonus.start_at)}</> : <>Cierra: {formatKickoff(bonus.deadline_at)}</>}
          </span>
        </div>
        {inactive ? (
          <span className="text-[11px] flex items-center gap-1 text-flame font-semibold"><Lock className="h-3 w-3" /> Bloqueado</span>
        ) : notStarted ? (
          <span className="text-[11px] flex items-center gap-1 text-white/40"><Clock className="h-3 w-3" /> Aún no disponible</span>
        ) : expired ? (
          <span className="text-[11px] flex items-center gap-1 text-white/40"><Lock className="h-3 w-3" /> Cerrado</span>
        ) : (
          <button
            onClick={save}
            disabled={saving || saved}
            className={`h-7 text-xs px-3 rounded-md font-semibold transition-all duration-300 disabled:opacity-40 ${
              saved ? "bg-emerald-500 text-white" : "text-black hover:opacity-90"
            }`}
            style={!saved ? (accent ? { backgroundColor: accent } : { backgroundColor: "#fbbf24" }) : undefined}
          >
            {saving ? "…" : saved ? "✓" : "Guardar"}
          </button>
        )}
      </div>
    </div>
  );
}
