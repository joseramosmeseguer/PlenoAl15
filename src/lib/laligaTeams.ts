import alavesStadium from "@/assets/estadios/deportivo-alaves.jpg";
import athleticStadium from "@/assets/estadios/athletic-club.jpg";
import atleticoStadium from "@/assets/estadios/atletico-madrid.jpg";
import barcelonaStadium from "@/assets/estadios/barcelona.jpg";
import betisStadium from "@/assets/estadios/real-betis.jpg";
import celtaStadium from "@/assets/estadios/celta-vigo.jpg";
import deportivoStadium from "@/assets/estadios/deportivo-coruna.png";
import elcheStadium from "@/assets/estadios/elche.jpg";
import espanyolStadium from "@/assets/estadios/espanyol.jpg";
import getafeStadium from "@/assets/estadios/getafe.jpg";
import levanteStadium from "@/assets/estadios/levante.jpg";
import malagaStadium from "@/assets/estadios/malaga.jpg";
import osasunaStadium from "@/assets/estadios/osasuna.webp";
import racingStadium from "@/assets/estadios/racing-santander.jpg";
import rayoStadium from "@/assets/estadios/rayo-vallecano.webp";
import realMadridStadium from "@/assets/estadios/real-madrid.webp";
import realSociedadStadium from "@/assets/estadios/real-sociedad.webp";
import sevillaStadium from "@/assets/estadios/sevilla.jpg";
import valenciaStadium from "@/assets/estadios/valencia.jpg";
import villarrealStadium from "@/assets/estadios/villarreal.webp";

export type LaLigaTeamStadium = {
  stadium: string;
  stadiumName: string;
  backgroundPosition: string;
};

const STADIUMS: Record<string, LaLigaTeamStadium> = {};

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
register(elcheStadium, "Martínez Valero", ["Elche CF", "Elche"]);
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
register(sevillaStadium, "Ramón Sánchez-Pizjuán", ["Sevilla FC", "Sevilla"], "center center");
register(valenciaStadium, "Mestalla", ["Valencia CF", "Valencia"], "center 68%");
register(villarrealStadium, "La Cerámica", ["Villarreal CF", "Villarreal"]);

export function getLaLigaTeamStadium(teamName?: string | null): LaLigaTeamStadium | null {
  if (!teamName) return null;
  return STADIUMS[normalizeTeamName(teamName)] ?? null;
}
