import { formatPlayerName } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/scoring";

export type TallyRow = { label: string; count: number; pct: number };

function teamLabel(code: string, teams: any[]): string {
  const t = (teams ?? []).find((x: any) => x.code === code);
  return t ? `${t.flag} ${t.name}` : code;
}

function matchLabel(id: string, matches: any[], teams: any[]): string {
  const m = (matches ?? []).find((x: any) => x.id === id);
  if (!m) return id;
  const home = m.home_code ? teamLabel(m.home_code, teams) : (m.home_label ?? "?");
  const away = m.away_code ? teamLabel(m.away_code, teams) : (m.away_label ?? "?");
  return `${home} – ${away}`;
}

export function resolveLabel(kind: string, raw: string, teams: any[], matches: any[]): string {
  if (!raw) return "";
  switch (kind) {
    case "team":
    case "two_teams":
      return teamLabel(raw, teams);
    case "match":
    case "multi_match":
      return matchLabel(raw, matches, teams);
    case "yes_no":
      return raw === "yes" ? "Sí" : "No";
    case "bracket_side":
      return raw === "left" ? "Izquierdo" : "Derecho";
    case "group":
      return `Grupo ${raw}`;
    case "stage":
      return raw === "champion" ? "Campeona" : (STAGE_LABELS[raw] ?? raw);
    case "player":
    case "top5_players":
    case "text":
    case "multi_text":
    default:
      return formatPlayerName(raw) || raw;
  }
}

// Cuenta cada respuesta elegida (incluyendo cada elemento de listas como top5)
// y devuelve un ranking con porcentaje sobre el total de elecciones.
export function tallyBonusAnswers(question: any, predictions: any[], teams: any[], matches: any[]): TallyRow[] {
  const counts: Record<string, number> = {};
  let totalVotes = 0;
  (predictions ?? []).forEach((p: any) => {
    const ans = p.answer;
    let raw: string[] = [];
    if (Array.isArray(ans?.values)) raw = ans.values;
    else if (ans?.value != null && ans.value !== "") raw = [ans.value];
    else if (ans?.text) raw = [ans.text];
    raw.filter(Boolean).forEach((v: string) => {
      const label = resolveLabel(question.kind, v, teams, matches);
      if (!label) return;
      counts[label] = (counts[label] ?? 0) + 1;
      totalVotes++;
    });
  });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, pct: totalVotes ? Math.round((count / totalVotes) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

// Nº de personas que han respondido algo (no vacío) a esta pregunta.
export function respondentsCount(predictions: any[]): number {
  return (predictions ?? []).filter((p: any) => {
    const ans = p.answer;
    if (Array.isArray(ans?.values)) return ans.values.some((v: any) => String(v ?? "").trim());
    return !!String(ans?.value ?? ans?.text ?? "").trim();
  }).length;
}
