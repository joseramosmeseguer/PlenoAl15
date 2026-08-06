import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ClubPredictionStats = {
  home: number;
  draw: number;
  away: number;
  total: number;
};

export const getClubPredictionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const pageSize = 1000;
    let from = 0;
    let rows: Array<{ match_id: number; home_score: number; away_score: number }> = [];

    while (true) {
      // club_predictions todavía no forma parte de los tipos generados de Supabase.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("club_predictions")
        .select("match_id, home_score, away_score")
        .range(from, from + pageSize - 1);

      if (error) throw error;
      const page = (data ?? []) as typeof rows;
      rows = rows.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    const stats: Record<string, ClubPredictionStats> = {};
    for (const prediction of rows) {
      const key = String(prediction.match_id);
      stats[key] ??= { home: 0, draw: 0, away: 0, total: 0 };
      stats[key].total += 1;
      if (prediction.home_score > prediction.away_score) stats[key].home += 1;
      else if (prediction.home_score === prediction.away_score) stats[key].draw += 1;
      else stats[key].away += 1;
    }

    return stats;
  });
