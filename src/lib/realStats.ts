export type RealStatCategory = "Jugadores" | "Porteros" | "Equipos";

export type RealStatDef = {
  key: string;
  label: string;
  category: RealStatCategory;
  unit: string;
};

export const REAL_STAT_DEFS: RealStatDef[] = [
  { key: "top_scorers", label: "Máximos goleadores", category: "Jugadores", unit: "goles" },
  { key: "top_assists", label: "Máximos asistentes", category: "Jugadores", unit: "asist." },
  { key: "most_mvp", label: "Más MVP", category: "Jugadores", unit: "MVP" },
  { key: "most_minutes", label: "Más minutos jugados", category: "Jugadores", unit: "min" },
  { key: "most_cards_player", label: "Más tarjetas", category: "Jugadores", unit: "tarj." },
  { key: "most_penalty_goals", label: "Más goles de penalti", category: "Jugadores", unit: "goles" },
  { key: "most_free_kick_goals", label: "Más goles de falta", category: "Jugadores", unit: "goles" },

  { key: "most_clean_sheets", label: "Más porterías a cero", category: "Porteros", unit: "PaC" },
  { key: "most_saves", label: "Más paradas", category: "Porteros", unit: "paradas" },
  { key: "fewest_conceded_gk", label: "Menos goles encajados", category: "Porteros", unit: "goles" },

  { key: "most_goals_team", label: "Más goles", category: "Equipos", unit: "goles" },
  { key: "fewest_conceded_team", label: "Menos goles recibidos", category: "Equipos", unit: "goles" },
  { key: "most_possession", label: "Más posesión", category: "Equipos", unit: "%" },
  { key: "most_shots", label: "Más tiros", category: "Equipos", unit: "tiros" },
  { key: "most_corners", label: "Más córners", category: "Equipos", unit: "córners" },
  { key: "most_fouls", label: "Más faltas", category: "Equipos", unit: "faltas" },
  { key: "most_cards_team", label: "Más tarjetas", category: "Equipos", unit: "tarj." },
  { key: "most_penalties_for", label: "Más penaltis a favor", category: "Equipos", unit: "pen." },
  { key: "most_penalties_against", label: "Más penaltis en contra", category: "Equipos", unit: "pen." },
];

export const REAL_STAT_CATEGORIES: RealStatCategory[] = ["Jugadores", "Porteros", "Equipos"];
