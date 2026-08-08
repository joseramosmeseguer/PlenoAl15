import { createServerFn } from "@tanstack/react-start";

const API_ROOT = "https://api.football-data.org/v4";

async function footballData(path: string) {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) throw new Error("La información ampliada de LaLiga no está configurada todavía.");
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { "X-Auth-Token": token },
  });
  if (!response.ok) throw new Error(`Football Data respondió con ${response.status}`);
  return response.json();
}

export const getLaLigaStandings = createServerFn({ method: "GET" }).handler(async () => {
  const payload = await footballData("/competitions/PD/standings");
  return payload?.standings?.find((standing: any) => standing.type === "TOTAL")?.table ?? [];
});

export const getLaLigaTeam = createServerFn({ method: "GET" })
  .inputValidator((data: { teamId: number }) => ({ teamId: Number(data.teamId) }))
  .handler(async ({ data }) => footballData(`/teams/${data.teamId}`));
