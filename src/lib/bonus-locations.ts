// Catálogo de ubicaciones para preguntas bonus
export const LOCATIONS: Record<string, string> = {
  minijuego_pregunta_diaria: "Pregunta diaria",
  minijuego_quiniela: "Quiniela",
  minijuego_vs: "VS",
  mis_especiales_generales: "Generales",
  mis_especiales_tops: "Tops del torneo",
  mis_especiales_grupos: "Fase de grupos",
  mis_especiales_eliminatorias: "Eliminatorias",
};

export const LOCATION_GROUPS: { label: string; items: { key: string; label: string }[] }[] = [
  {
    label: "Minijuegos",
    items: [
      { key: "minijuego_pregunta_diaria", label: "Pregunta diaria" },
      { key: "minijuego_quiniela", label: "Quiniela" },
      { key: "minijuego_vs", label: "VS" },
    ],
  },
  {
    label: "Mis pronósticos · Especiales",
    items: [
      { key: "mis_especiales_generales", label: "Generales" },
      { key: "mis_especiales_tops", label: "Tops del torneo" },
      { key: "mis_especiales_grupos", label: "Fase de grupos" },
      { key: "mis_especiales_eliminatorias", label: "Eliminatorias" },
    ],
  },
];

export const MINIJUEGO_KEYS = [
  "minijuego_pregunta_diaria",
  "minijuego_quiniela",
  "minijuego_vs",
];
export const ESPECIALES_KEYS = [
  "mis_especiales_generales",
  "mis_especiales_tops",
  "mis_especiales_grupos",
  "mis_especiales_eliminatorias",
];

export function locationLabel(q: { location?: string; location_label?: string | null }): string {
  if (q.location_label) return q.location_label;
  return LOCATIONS[q.location ?? ""] ?? q.location ?? "Otros";
}

export function isMinijuegoLocation(loc?: string): boolean {
  return !!loc && loc.startsWith("minijuego_");
}

export function isEspecialesLocation(loc?: string): boolean {
  if (!loc) return true; // legacy fallback
  return !loc.startsWith("minijuego_");
}
