import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Customized,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useAllSnapshots, useProfiles } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

const COLORS = [
  "#e11d48", "#2563eb", "#16a34a", "#d97706", "#9333ea",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#7c3aed",
  "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
];

const LABEL_GAP = 17;
const RIGHT_MARGIN = 128;
const CHARS_PER_PX = 5.4;

function truncate(text: string, maxPx: number) {
  const max = Math.floor(maxPx / CHARS_PER_PX);
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

function EndLabels({ xAxisMap, yAxisMap, data, users, userId, colors }: any) {
  if (!data?.length || !xAxisMap || !yAxisMap) return null;
  const lastPoint = data[data.length - 1];
  const yAxis = Object.values(yAxisMap)[0] as any;
  const xAxis = Object.values(xAxisMap)[0] as any;
  if (!yAxis?.scale || !xAxis) return null;

  const labelX = xAxis.x + xAxis.width + 6;
  const chartBottom = (yAxis.y ?? 0) + (yAxis.height ?? 300);

  const rawItems = users
    .map((u: any, i: number) => {
      const val = lastPoint[u.id];
      if (val == null) return null;
      return {
        user: u,
        rawY: yAxis.scale(val),
        color: colors[i % colors.length],
        isMe: u.id === userId,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.rawY - b.rawY);

  if (!rawItems.length) return null;

  // Forward collision avoidance
  const items = rawItems.map((x: any) => ({ ...x, adjY: x.rawY }));
  for (let pass = 0; pass < 40; pass++) {
    for (let i = 1; i < items.length; i++) {
      if (items[i].adjY - items[i - 1].adjY < LABEL_GAP) {
        items[i].adjY = items[i - 1].adjY + LABEL_GAP;
      }
    }
    // Keep within chart bounds — backward pass
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].adjY > chartBottom) items[i].adjY = chartBottom;
      if (i > 0 && items[i - 1].adjY > items[i].adjY - LABEL_GAP) {
        items[i - 1].adjY = items[i].adjY - LABEL_GAP;
      }
    }
  }

  const maxLabelW = RIGHT_MARGIN - 14;

  return (
    <>
      {items.map((item: any) => {
        const fullText = `${item.user.emoji} ${item.user.name}`;
        const text = truncate(fullText, maxLabelW - 8);
        const w = Math.min(text.length * CHARS_PER_PX + 10, maxLabelW);
        const alpha = item.isMe ? 1 : 0.72;
        return (
          <g key={item.user.id}>
            {Math.abs(item.adjY - item.rawY) > 2 && (
              <line
                x1={labelX - 3} y1={item.rawY}
                x2={labelX + 1} y2={item.adjY}
                stroke={item.color} strokeWidth={0.7} opacity={0.4}
              />
            )}
            <rect
              x={labelX} y={item.adjY - 8}
              width={w} height={16} rx={5}
              fill={item.color} opacity={alpha}
            />
            <text
              x={labelX + 5} y={item.adjY + 4}
              fontSize={9} fill="white"
              fontWeight={item.isMe ? "bold" : "normal"}
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {text}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function EvolutionChart({ memberIds }: { memberIds?: Set<string> }) {
  const { user } = useAuth();
  const { data: snaps, isLoading } = useAllSnapshots();
  const { data: profiles } = useProfiles();
  const [metric, setMetric] = useState<"position" | "total_points">("position");

  const { chartData, users, maxPos } = useMemo(() => {
    const START = "2026-06-10";
    const rows = (snaps ?? []).filter((r) => {
      if (r.snapshot_date < START) return false;
      if (memberIds) return memberIds.has(r.user_id);
      return true;
    });
    const dates = Array.from(new Set(rows.map((r) => r.snapshot_date))).sort();
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    // Top 10 by points from the latest snapshot (+ always include current user)
    const latestDate = dates[dates.length - 1];
    const latestRows = latestDate ? rows.filter((r) => r.snapshot_date === latestDate) : [];
    const sortedLatest = [...latestRows].sort((a, b) => b.total_points - a.total_points);
    const top10Ids = new Set(sortedLatest.slice(0, 10).map((r) => r.user_id));
    if (user?.id) top10Ids.add(user.id);

    // Keep rank order so colors are consistent (1st = first color)
    const userIds = sortedLatest.filter((r) => top10Ids.has(r.user_id)).map((r) => r.user_id);
    if (user?.id && !userIds.includes(user.id) && rows.some((r) => r.user_id === user.id)) {
      userIds.push(user.id);
    }

    const usersList = userIds.map((id) => {
      const p: any = profileMap.get(id);
      return { id, name: p?.display_name ?? "—", emoji: p?.avatar_emoji ?? "⚽" };
    });

    let max = 0;
    const chart = dates.map((d) => {
      const dayRows = rows.filter((r) => r.snapshot_date === d);
      const sorted = [...dayRows].sort((a, b) => b.total_points - a.total_points);
      const row: Record<string, any> = { date: d };
      for (const u of usersList) {
        if (metric === "position") {
          const pos = sorted.findIndex((r) => r.user_id === u.id) + 1;
          if (pos > 0) { row[u.id] = pos; if (pos > max) max = pos; }
        } else {
          const s = dayRows.find((r) => r.user_id === u.id);
          if (s) row[u.id] = s.total_points;
        }
      }
      return row;
    });
    return { chartData: chart, users: usersList, maxPos: Math.max(max, userIds.length) };
  }, [snaps, profiles, metric, memberIds, user]);

  const chartHeight = Math.max(300, Math.min(users.length * 22 + 60, 460));

  return (
    <section className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="display text-2xl flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Evolución diaria
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setMetric("position")}
            className={`px-3 py-1.5 ${metric === "position" ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            Posición
          </button>
          <button
            onClick={() => setMetric("total_points")}
            className={`px-3 py-1.5 ${metric === "total_points" ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            Puntos
          </button>
        </div>
      </div>

      <div className="p-3 md:p-5">
        {isLoading ? (
          <div className="text-muted-foreground py-10 text-center">Cargando…</div>
        ) : chartData.length === 0 ? (
          <div className="text-muted-foreground py-10 text-center">
            Aún no hay histórico. Empezará a registrarse el 10 de junio de 2026.
          </div>
        ) : (
          <div style={{ width: "100%", height: chartHeight }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: RIGHT_MARGIN, bottom: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                  }
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  reversed={metric === "position"}
                  domain={metric === "position" ? [1, maxPos] : ["auto", "auto"]}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(d) =>
                    new Date(d as string).toLocaleDateString("es-ES", {
                      weekday: "short", day: "numeric", month: "short",
                    })
                  }
                  formatter={(value, name) => {
                    const u = users.find((x) => x.id === name);
                    return [value, u ? `${u.emoji} ${u.name}` : String(name)];
                  }}
                />
                {users.map((u, i) => (
                  <Line
                    key={u.id}
                    type="monotone"
                    dataKey={u.id}
                    name={u.id}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={u.id === user?.id ? 2.5 : 1.5}
                    strokeOpacity={u.id === user?.id ? 1 : 0.7}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
                <Customized
                  component={(props: any) => (
                    <EndLabels
                      {...props}
                      data={chartData}
                      users={users}
                      userId={user?.id}
                      colors={COLORS}
                    />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Se actualiza cada día con la {metric === "position" ? "posición" : "puntuación"} de cada participante.
        </p>
      </div>
    </section>
  );
}
