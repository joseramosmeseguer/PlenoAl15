// Normaliza nombre de jugador: sin tildes, sin signos, Title Case.
// Ej: "  kylian m'bappé! " -> "Kylian Mbappe"
export function formatPlayerName(raw: string): string {
  if (!raw) return "";
  const noDiacritics = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = noDiacritics.replace(/[^a-zA-Z\s-]/g, " ");
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
