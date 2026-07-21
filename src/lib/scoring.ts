// Helpers de puntuación / reglas (para mostrar en UI; el cálculo real está en la BBDD)

export const POINTS = {
  normal_outcome: 1,
  normal_exact: 3,
  premium_outcome: 2,
  premium_exact: 6,
  megapremium_outcome: 3,
  megapremium_exact: 9,
};

export const STAGE_LABELS: Record<string, string> = {
  group: "Fase de grupos",
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinal",
  third_place: "3er puesto",
  final: "Final",
};

export const LOCK_HOURS = 1;

export function isLocked(kickoffISO: string, manualLock = false) {
  if (manualLock) return true;
  const kickoff = new Date(kickoffISO).getTime();
  return Date.now() > kickoff - LOCK_HOURS * 3600 * 1000;
}

export function outcome(h: number, a: number) {
  if (h > a) return "H";
  if (h < a) return "A";
  return "D";
}

export function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCountdown(targetISO: string): { label: string; variant: "red" | "amber" | "green" } | null {
  const ms = new Date(targetISO).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let label: string;
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    label = `${days}d${remH > 0 ? ` ${remH}h` : ""}`;
  } else if (hours >= 1) {
    label = hours < 24 && minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    label = `${Math.max(1, minutes)}m`;
  }
  const variant: "red" | "amber" | "green" = hours < 24 ? "red" : hours < 48 ? "amber" : "green";
  return { label, variant };
}
