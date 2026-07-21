ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT
  pr.id AS user_id,
  pr.display_name,
  pr.avatar_emoji,
  COALESCE(pm.match_points,0) AS match_points,
  COALESCE(pb.bonus_points,0) AS bonus_points,
  COALESCE(pm.match_points,0) + COALESCE(pb.bonus_points,0) AS total_points,
  COALESCE(pm.exact_count,0) AS exact_count,
  COALESCE(pm.outcome_count,0) AS outcome_count
FROM public.profiles pr
LEFT JOIN (
  SELECT p.user_id,
         SUM(p.points_awarded) AS match_points,
         SUM(CASE WHEN m.home_score IS NOT NULL
                   AND p.home_score = m.home_score
                   AND p.away_score = m.away_score THEN 1 ELSE 0 END) AS exact_count,
         SUM(CASE WHEN m.status='finished'
                   AND public.outcome(p.home_score,p.away_score) = public.outcome(m.home_score,m.away_score)
                   AND NOT (p.home_score = m.home_score AND p.away_score = m.away_score)
              THEN 1 ELSE 0 END) AS outcome_count
  FROM public.predictions p JOIN public.matches m ON m.id = p.match_id
  GROUP BY p.user_id
) pm ON pm.user_id = pr.id
LEFT JOIN (
  SELECT bp.user_id, SUM(bp.points_awarded) AS bonus_points
  FROM public.bonus_predictions bp
  GROUP BY bp.user_id
) pb ON pb.user_id = pr.id
WHERE pr.is_hidden = false;

ALTER VIEW public.v_leaderboard SET (security_invoker = on);