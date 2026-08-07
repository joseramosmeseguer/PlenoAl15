import alavesStadium from "@/assets/estadios/deportivo-alaves.webp";
import athleticStadium from "@/assets/estadios/athletic-club.webp";
import atleticoStadium from "@/assets/estadios/atletico-madrid.webp";
import barcelonaStadium from "@/assets/estadios/barcelona.webp";
import betisStadium from "@/assets/estadios/real-betis.webp";
import celtaStadium from "@/assets/estadios/celta-vigo.webp";
import deportivoStadium from "@/assets/estadios/deportivo-coruna.webp";
import elcheStadium from "@/assets/estadios/elche.webp";
import espanyolStadium from "@/assets/estadios/espanyol.webp";
import getafeStadium from "@/assets/estadios/getafe.webp";
import levanteStadium from "@/assets/estadios/levante.webp";
import malagaStadium from "@/assets/estadios/malaga.webp";
import osasunaStadium from "@/assets/estadios/osasuna.webp";
import racingStadium from "@/assets/estadios/racing-santander.webp";
import rayoStadium from "@/assets/estadios/rayo-vallecano.webp";
import realMadridStadium from "@/assets/estadios/real-madrid.webp";
import realSociedadStadium from "@/assets/estadios/real-sociedad.webp";
import sevillaStadium from "@/assets/estadios/sevilla.webp";
import valenciaStadium from "@/assets/estadios/valencia.webp";
import villarrealStadium from "@/assets/estadios/villarreal.webp";

export type LaLigaTeamStadium = {
  stadium: string;
  stadiumName: string;
  backgroundPosition: string;
};

const STADIUMS: Record<string, LaLigaTeamStadium> = {};

const TEAM_DISPLAY_NAMES: Record<string, string> = {};

function normalizeTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function register(
  stadium: string,
  stadiumName: string,
  teamNames: string[],
  backgroundPosition = "center 55%",
) {
  const value = { stadium, stadiumName, backgroundPosition };
  teamNames.forEach((name) => {
    STADIUMS[normalizeTeamName(name)] = value;
  });
}

register(
  alavesStadium,
  "Mendizorroza",
  ["Deportivo Alavés", "Deportivo Alaves", "Alavés", "Alaves"],
  "center 58%",
);
register(
  athleticStadium,
  "San Mamés",
  ["Athletic Club", "Athletic Club de Bilbao", "Athletic Bilbao"],
  "center 62%",
);
register(
  atleticoStadium,
  "Riyadh Air Metropolitano",
  ["Club Atlético de Madrid", "Atlético de Madrid", "Atletico Madrid"],
  "center 56%",
);
register(barcelonaStadium, "Camp Nou", ["FC Barcelona", "Barcelona"], "center 58%");
register(
  betisStadium,
  "Estadio de La Cartuja",
  ["Real Betis Balompié", "Real Betis", "Betis"],
  "center center",
);
register(celtaStadium, "Abanca Balaídos", [
  "RC Celta de Vigo",
  "Celta de Vigo",
  "Celta Vigo",
  "Celta",
]);
register(deportivoStadium, "Riazor", [
  "RC Deportivo",
  "RC Deportivo La Coruña",
  "Deportivo de La Coruña",
  "Deportivo La Coruña",
  "Deportivo",
]);
register(elcheStadium, "Martínez Valero", ["Elche CF", "Elche"], "center 28%");
register(
  espanyolStadium,
  "RCDE Stadium",
  ["RCD Espanyol de Barcelona", "RCD Espanyol", "Espanyol"],
  "center 28%",
);
register(getafeStadium, "Coliseum", ["Getafe CF", "Getafe"]);
register(levanteStadium, "Ciutat de València", ["Levante UD", "Levante"]);
register(
  malagaStadium,
  "La Rosaleda",
  ["Málaga CF", "Malaga CF", "Málaga", "Malaga"],
  "center center",
);
register(osasunaStadium, "El Sadar", ["Club Atlético Osasuna", "CA Osasuna", "Osasuna"]);
register(racingStadium, "El Sardinero", [
  "Real Racing Club de Santander",
  "Racing Santander",
  "Racing de Santander",
]);
register(
  rayoStadium,
  "Vallecas",
  ["Rayo Vallecano de Madrid", "Rayo Vallecano", "Rayo"],
  "center 28%",
);
register(realMadridStadium, "Santiago Bernabéu", ["Real Madrid CF", "Real Madrid"]);
register(realSociedadStadium, "Reale Arena", ["Real Sociedad de Fútbol", "Real Sociedad"]);
register(sevillaStadium, "Ramón Sánchez-Pizjuán", ["Sevilla FC", "Sevilla"], "center 28%");
register(valenciaStadium, "Mestalla", ["Valencia CF", "Valencia"], "center 68%");
register(villarrealStadium, "La Cerámica", ["Villarreal CF", "Villarreal"]);

export function getLaLigaTeamStadium(teamName?: string | null): LaLigaTeamStadium | null {
  if (!teamName) return null;
  return STADIUMS[normalizeTeamName(teamName)] ?? null;
}

function registerDisplayName(displayName: string, ...teamNames: string[]) {
  teamNames.forEach((name) => {
    TEAM_DISPLAY_NAMES[normalizeTeamName(name)] = displayName;
  });
}

registerDisplayName("Rayo Vallecano", "Rayo Vallecano de Madrid", "Rayo Vallecano", "Rayo");
registerDisplayName(
  "Racing de Santander",
  "Real Racing Club de Santander",
  "Racing Santander",
  "Racing de Santander",
);
registerDisplayName("RCD Espanyol", "RCD Espanyol de Barcelona", "RCD Espanyol", "Espanyol");
registerDisplayName("RC Celta", "RC Celta de Vigo", "Celta de Vigo", "Celta Vigo", "Celta");

export function getLaLigaTeamDisplayName(teamName?: string | null): string {
  if (!teamName) return "?";
  return TEAM_DISPLAY_NAMES[normalizeTeamName(teamName)] ?? teamName;
}
