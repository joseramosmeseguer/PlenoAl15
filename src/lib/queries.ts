import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeaderRow = {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
  match_points: number;
  bonus_points: number;
  juego_points: number;
  total_points: number;
  exact_count: number;
  outcome_count: number;
};

// IDs de participantes ocultos — se excluyen de toda vista pública.
async function fetchHiddenIds(): Promise<Set<string>> {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("is_hidden", true);
  if (error) return new Set();
  return new Set((data ?? []).map((r: any) => r.id));
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<LeaderRow[]> => {
      // La vista v_leaderboard ya excluye perfiles ocultos.
      const { data, error } = await (supabase as any)
        .from("v_leaderboard")
        .select("*");
      if (error) throw error;
      const rows = (data ?? []) as LeaderRow[];
      return rows.sort((a, b) => b.total_points - a.total_points);
    },
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, home:teams!matches_home_code_fkey(*), away:teams!matches_away_code_fkey(*)")
        .order("kickoff_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useClubMatches() {
  return useQuery({
    queryKey: ["club_matches"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("club_matches")
        .select("*, home:club_teams!club_matches_home_team_id_fkey(*), away:club_teams!club_matches_away_team_id_fkey(*)")
        .order("utc_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useMyClubPredictions(userId?: string) {
  return useQuery({
    queryKey: ["club_predictions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("club_predictions")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").order("group_letter").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useMyProfile(userId?: string) {
  return useQuery({
    queryKey: ["my_profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, avatar_emoji, avatar_url, plays_individually")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, avatar_emoji, avatar_url, created_at, updated_at, is_hidden, plays_individually")
        .eq("is_hidden", false)
        .order("display_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useAllPredictions() {
  return useQuery({
    queryKey: ["all_predictions"],
    queryFn: async () => {
      const hidden = await fetchHiddenIds();
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("predictions")
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data ?? []);
        if ((data ?? []).length < PAGE) break;
        from += PAGE;
      }
      return all.filter((p: any) => !hidden.has(p.user_id));
    },
  });
}

export function useMyPredictions(userId?: string) {
  return useQuery({
    queryKey: ["my_predictions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useJuegoPicks(userId?: string) {
  return useQuery({
    queryKey: ["juego_picks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("juego_picks")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw error;
      return data as { stage: string; bracket_position: number; team_code: string; points_awarded: number }[];
    },
  });
}

export function useAllJuegoPicks() {
  return useQuery({
    queryKey: ["all_juego_picks"],
    queryFn: async () => {
      const PAGE = 1000;
      let all: { user_id: string }[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("juego_picks")
          .select("user_id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data ?? []);
        if ((data ?? []).length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });
}

// No selecciona correct_answer: esa columna no es legible para usuarios normales
// (se reservaría para el admin a través de una vía segura aparte).
export function useBonusQuestions() {
  return useQuery({
    queryKey: ["bonus_questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bonus_questions")
        .select("id, key, label, description, kind, points, deadline_at, is_active, is_fun, position, created_at, updated_at, category, start_at, is_visible, location, location_label, multi_text_count")
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useBonusPredictions(userId?: string) {
  return useQuery({
    queryKey: ["bonus_predictions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bonus_predictions").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useAllBonusPredictions() {
  return useQuery({
    queryKey: ["all_bonus_predictions"],
    queryFn: async () => {
      const hidden = await fetchHiddenIds();
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("bonus_predictions")
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data ?? []);
        if ((data ?? []).length < PAGE) break;
        from += PAGE;
      }
      return all.filter((p: any) => !hidden.has(p.user_id));
    },
  });
}

export function useMatchPredictionStats() {
  return useQuery({
    queryKey: ["match_prediction_stats"],
    queryFn: async () => {
      // Paginar para superar el límite de 1000 filas de Supabase/PostgREST
      const PAGE = 1000;
      let all: { match_id: string; home_score: number | null; away_score: number | null }[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("predictions")
          .select("match_id, home_score, away_score")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data ?? []);
        if ((data ?? []).length < PAGE) break;
        from += PAGE;
      }
      const stats: Record<string, { home: number; draw: number; away: number; total: number }> = {};
      for (const p of all) {
        if (p.home_score == null || p.away_score == null) continue;
        if (!stats[p.match_id]) stats[p.match_id] = { home: 0, draw: 0, away: 0, total: 0 };
        stats[p.match_id].total++;
        if (p.home_score > p.away_score) stats[p.match_id].home++;
        else if (p.home_score === p.away_score) stats[p.match_id].draw++;
        else stats[p.match_id].away++;
      }
      return stats;
    },
  });
}

export type RealStatEntry = { id: string; stat_key: string; rank: number; name: string; value: number };

export function useRealStats() {
  return useQuery({
    queryKey: ["real_stats"],
    queryFn: async (): Promise<RealStatEntry[]> => {
      const { data, error } = await (supabase as any)
        .from("real_stat_entries")
        .select("*")
        .order("stat_key")
        .order("rank");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((s: any) => (map[s.key] = s.value));
      return map;
    },
  });
}

// ── Ligas ────────────────────────────────────────────────────

export type League = {
  id: string;
  name: string;
  invite_code?: string | null; // only visible to creator/admin (server-side restricted)
  creator_id: string | null;
  is_default: boolean;
  created_at: string;
};

export type LeagueMembership = {
  league_id: string;
  user_id: string;
  is_league_admin: boolean;
  joined_at: string;
  league?: League;
};

export function useLeagues() {
  return useQuery({
    queryKey: ["leagues"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leagues")
        .select("id, name, creator_id, is_default, created_at")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as League[];
    },
  });
}

export function useMyLeagues(userId?: string) {
  return useQuery({
    queryKey: ["my_leagues", userId],
    enabled: !!userId,
    queryFn: async () => {
      // invite_code no se incluye aquí: no es legible salvo para el creador,
      // que lo obtiene aparte con useMyLeagueInviteCodes()
      const { data, error } = await (supabase as any)
        .from("league_memberships")
        .select("*, league:leagues(id, name, creator_id, is_default, created_at)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data as LeagueMembership[];
    },
  });
}

// Códigos de invitación de las ligas que ha creado el usuario actual (vía RPC segura;
// nadie más puede leer invite_code directamente de la tabla leagues).
export function useMyLeagueInviteCodes(userId?: string) {
  return useQuery({
    queryKey: ["my_league_invite_codes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_league_invite_codes");
      if (error) throw error;
      return data as { league_id: string; invite_code: string }[];
    },
  });
}

export function useLeagueMembers(leagueId?: string) {
  return useQuery({
    queryKey: ["league_members", leagueId],
    enabled: !!leagueId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("league_memberships")
        .select("*, profile:profiles(id, display_name, avatar_emoji)")
        .eq("league_id", leagueId!);
      if (error) throw error;
      return data as (LeagueMembership & { profile: { id: string; display_name: string; avatar_emoji: string } | null })[];
    },
  });
}

export function useAllLeagueMembers() {
  return useQuery({
    queryKey: ["all_league_members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("league_memberships")
        .select("league_id, user_id");
      if (error) throw error;
      return data as { league_id: string; user_id: string }[];
    },
  });
}

// ── Encuesta: ¿les interesaría algo parecido para LaLiga/Champions/Premier? ──

export type SurveyResponse = { user_id: string; would_play: string | null; leagues: string[] | null };

export function useMySurveyResponse(userId?: string) {
  return useQuery({
    queryKey: ["survey_response", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("survey_responses")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as SurveyResponse | null;
    },
  });
}

export function useMySurveyIdeas(userId?: string) {
  return useQuery({
    queryKey: ["survey_ideas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("survey_ideas")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; idea_text: string; created_at: string }[];
    },
  });
}

export function useAllSurveyResponses() {
  return useQuery({
    queryKey: ["all_survey_responses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("survey_responses").select("*");
      if (error) throw error;
      return data as (SurveyResponse & { created_at: string })[];
    },
  });
}

export function useAllSurveyIdeas() {
  return useQuery({
    queryKey: ["all_survey_ideas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("survey_ideas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; user_id: string; idea_text: string; created_at: string }[];
    },
  });
}

// ── Anuncios editables desde admin ────────────────────────────
export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export type DailySnap = { snapshot_date: string; user_id: string; total_points: number; position: number };

export function useAllSnapshots() {
  return useQuery({
    queryKey: ["all_snapshots"],
    queryFn: async (): Promise<DailySnap[]> => {
      const { data, error } = await supabase
        .from("daily_snapshots")
        .select("snapshot_date,user_id,total_points,position")
        .order("snapshot_date");
      if (error) throw error;
      return (data ?? []) as DailySnap[];
    },
  });
}

export function useDailyWinner() {
  return useQuery({
    queryKey: ["daily_winner"],
    queryFn: async () => {
      const hidden = await fetchHiddenIds();
      const { data, error } = await supabase
        .from("daily_snapshots")
        .select("snapshot_date,user_id,total_points,position")
        .eq("position", 1)
        .order("snapshot_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      const visible = (data ?? []).find((r: any) => !hidden.has(r.user_id));
      return visible ?? null;
    },
  });
}
