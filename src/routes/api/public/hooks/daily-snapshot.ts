import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/daily-snapshot")({
  server: {
    handlers: {
      POST: async () => {
        const { data: rows, error } = await supabaseAdmin
          .from("v_leaderboard" as never)
          .select("user_id,total_points");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        const list = ((rows ?? []) as { user_id: string; total_points: number }[]).slice().sort(
          (a, b) => b.total_points - a.total_points,
        );
        const today = new Date().toISOString().slice(0, 10);
        const payload = list.map((r, i) => ({
          user_id: r.user_id,
          snapshot_date: today,
          total_points: r.total_points,
          position: i + 1,
        }));
        if (payload.length) {
          await supabaseAdmin.from("daily_snapshots").delete().eq("snapshot_date", today);
          const { error: insErr } = await supabaseAdmin.from("daily_snapshots").insert(payload);
          if (insErr) {
            return new Response(JSON.stringify({ error: insErr.message }), { status: 500 });
          }
        }
        return Response.json({ ok: true, count: payload.length, date: today });
      },
    },
  },
});
