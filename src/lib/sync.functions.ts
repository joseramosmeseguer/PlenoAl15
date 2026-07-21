import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Fixture = {
  fixture: { id: number; status: { short: string } };
  goals: { home: number | null; away: number | null };
};

async function fetchFixture(id: string): Promise<Fixture | null> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("Falta API_FOOTBALL_KEY");
  const res = await fetch(`https://v3.football.api-sports.io/fixtures?id=${id}`, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { response: Fixture[] };
  return json.response?.[0] ?? null;
}

export const syncResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Response("Solo admin", { status: 403 });

    const { data: matches, error } = await supabaseAdmin
      .from("matches")
      .select("id, external_id")
      .not("external_id", "is", null)
      .lte("kickoff_at", new Date().toISOString());
    if (error) throw new Error(error.message);

    let updated = 0;
    let finished = 0;
    const errors: string[] = [];

    for (const m of matches ?? []) {
      try {
        const fx = await fetchFixture(m.external_id as string);
        if (!fx) continue;
        const isFinished = ["FT", "AET", "PEN"].includes(fx.fixture.status.short);
        const status = isFinished
          ? "finished"
          : ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(fx.fixture.status.short)
          ? "live"
          : "scheduled";
        const upd = {
          status,
          ...(fx.goals.home !== null && fx.goals.away !== null
            ? { home_score: fx.goals.home, away_score: fx.goals.away }
            : {}),
        };
        const { error: uErr } = await (supabaseAdmin as any).from("matches").update(upd).eq("id", m.id);
        if (uErr) errors.push(uErr.message);
        else {
          updated++;
          if (isFinished) finished++;
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    return { updated, finished, errors };
  });

// ---------- Carga automática de fixtures del Mundial ----------

type WCFixture = {
  fixture: { id: number; date: string };
  teams: { home: { name: string }; away: { name: string } };
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Solo admin", { status: 403 });
}

export const fetchWorldCupFixtures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { league?: number; season?: number; autoMap?: boolean }) => ({
    league: d?.league ?? 1,
    season: d?.season ?? 2026,
    autoMap: d?.autoMap ?? true,
  }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) throw new Error("Falta API_FOOTBALL_KEY");

    const url = `https://v3.football.api-sports.io/fixtures?league=${data.league}&season=${data.season}`;
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!res.ok) throw new Error(`API-Football ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { response: WCFixture[]; errors: any };
    if (json.errors && Object.keys(json.errors).length > 0) {
      throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
    }
    const fixtures = json.response ?? [];

    const { data: teams } = await supabaseAdmin.from("teams").select("code,name");
    const { data: matches } = await supabaseAdmin
      .from("matches")
      .select("id,kickoff_at,external_id,home_code,away_code,home_label,away_label");

    const teamByName: Record<string, string> = {};
    (teams ?? []).forEach((t: any) => (teamByName[normalize(t.name)] = t.code));

    type Mapped = { matchId: string; fixtureId: number; home: string; away: string; date: string };
    const mapped: Mapped[] = [];
    const unmatched: { fixtureId: number; home: string; away: string; date: string }[] = [];

    for (const fx of fixtures) {
      const homeCode = teamByName[normalize(fx.teams.home.name)];
      const awayCode = teamByName[normalize(fx.teams.away.name)];
      const fxDate = new Date(fx.fixture.date).getTime();
      const candidate = (matches ?? []).find((m: any) => {
        if (homeCode && awayCode && m.home_code === homeCode && m.away_code === awayCode) return true;
        const md = new Date(m.kickoff_at).getTime();
        const close = Math.abs(md - fxDate) < 3 * 3600 * 1000;
        return (
          close &&
          ((m.home_label && normalize(m.home_label) === normalize(fx.teams.home.name)) ||
            (m.away_label && normalize(m.away_label) === normalize(fx.teams.away.name)))
        );
      });

      if (candidate) {
        mapped.push({
          matchId: candidate.id,
          fixtureId: fx.fixture.id,
          home: fx.teams.home.name,
          away: fx.teams.away.name,
          date: fx.fixture.date,
        });
      } else {
        unmatched.push({
          fixtureId: fx.fixture.id,
          home: fx.teams.home.name,
          away: fx.teams.away.name,
          date: fx.fixture.date,
        });
      }
    }

    let appliedCount = 0;
    if (data.autoMap && mapped.length) {
      for (const m of mapped) {
        const { error } = await (supabaseAdmin as any)
          .from("matches")
          .update({ external_id: String(m.fixtureId) })
          .eq("id", m.matchId);
        if (!error) appliedCount++;
      }
    }

    return {
      total: fixtures.length,
      mapped: mapped.length,
      applied: appliedCount,
      unmatched,
      mappedList: mapped,
    };
  });
