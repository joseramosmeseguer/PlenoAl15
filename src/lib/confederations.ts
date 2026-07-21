// Mapa código ISO -> confederación. Cubre todos los participantes esperados del Mundial 2026.
export type Confederation = "CAF" | "AFC" | "OFC" | "CONMEBOL" | "CONCACAF" | "UEFA";

export const CONFED: Record<string, Confederation> = {
  // CAF (África)
  MAR: "CAF", SEN: "CAF", TUN: "CAF", EGY: "CAF", ALG: "CAF", DZA: "CAF",
  NGA: "CAF", CIV: "CAF", CMR: "CAF", GHA: "CAF", RSA: "CAF", MLI: "CAF",
  ZAM: "CAF", BFA: "CAF",
  // AFC + OFC (Asia-Oceanía)
  JPN: "AFC", KOR: "AFC", AUS: "AFC", IRN: "AFC", KSA: "AFC", QAT: "AFC",
  UAE: "AFC", UZB: "AFC", IRQ: "AFC", JOR: "AFC", CHN: "AFC",
  NZL: "OFC",
  // CONMEBOL + CONCACAF (América)
  ARG: "CONMEBOL", BRA: "CONMEBOL", URU: "CONMEBOL", COL: "CONMEBOL",
  CHI: "CONMEBOL", PAR: "CONMEBOL", PER: "CONMEBOL", ECU: "CONMEBOL",
  BOL: "CONMEBOL", VEN: "CONMEBOL",
  USA: "CONCACAF", MEX: "CONCACAF", CAN: "CONCACAF", CRC: "CONCACAF",
  PAN: "CONCACAF", HON: "CONCACAF", JAM: "CONCACAF", SLV: "CONCACAF",
  GUA: "CONCACAF", HAI: "CONCACAF",
  // UEFA
  ESP: "UEFA", FRA: "UEFA", GER: "UEFA", ITA: "UEFA", ENG: "UEFA", POR: "UEFA",
  NED: "UEFA", BEL: "UEFA", CRO: "UEFA", SUI: "UEFA", DEN: "UEFA", AUT: "UEFA",
  POL: "UEFA", SRB: "UEFA", SWE: "UEFA", NOR: "UEFA", UKR: "UEFA", TUR: "UEFA",
  SCO: "UEFA", WAL: "UEFA", CZE: "UEFA", HUN: "UEFA", GRE: "UEFA", IRL: "UEFA",
  ROU: "UEFA", SVK: "UEFA", SVN: "UEFA", ALB: "UEFA", FIN: "UEFA",
};

// "Top 7" históricos: ESP, FRA, POR, ARG, ENG, BRA, GER
export const TOP7_HISTORIC = ["ESP", "FRA", "POR", "ARG", "ENG", "BRA", "GER"];

export const AMERICA_CONFEDS: Confederation[] = ["CONMEBOL", "CONCACAF"];
export const ASIA_OCEANIA_CONFEDS: Confederation[] = ["AFC", "OFC"];
