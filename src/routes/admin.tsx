import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMatches, useTeams, useClubMatches, useAllPredictions, useAllBonusPredictions, useProfiles, useAllSurveyResponses, useAllSurveyIdeas } from "@/lib/queries";
import { outcome } from "@/lib/scoring";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchWorldCupFixtures } from "@/lib/sync.functions";
import { getAdminProfiles, getAdminBonusQuestions, getAdminLeagues, getAdminLeagueMembers, updateParticipant, deleteParticipant, setParticipantHidden } from "@/lib/admin.functions";
import { Shield, RefreshCcw, Plus, Lock, Cloud, EyeOff, Eye, Trash2, ChevronDown } from "lucide-react";
import { formatKickoff, STAGE_LABELS } from "@/lib/scoring";
import { LOCATION_GROUPS, LOCATIONS, locationLabel } from "@/lib/bonus-locations";
import { resolveLabel } from "@/lib/bonusTally";
import { AdminAnnouncements } from "@/components/admin/AdminAnnouncements";
import { AdminNews } from "@/components/admin/AdminNews";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Admin · PlenoAl15" }] }),
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: clubMatches } = useClubMatches();
  const fetchAdminProfiles = useServerFn(getAdminProfiles);
  const { data: profiles, error: profilesError } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: () => fetchAdminProfiles({}),
    enabled: !!user && isAdmin,
    retry: false,
  });
  const fetchAdminLeagues = useServerFn(getAdminLeagues);
  const fetchAdminLeagueMembers = useServerFn(getAdminLeagueMembers);
  const { data: leagues, error: leaguesError } = useQuery({
    queryKey: ["admin_leagues"],
    queryFn: () => fetchAdminLeagues({}),
    enabled: !!user && isAdmin,
    retry: false,
  });
  const { data: allMembers, error: membersError } = useQuery({
    queryKey: ["admin_all_league_members"],
    queryFn: () => fetchAdminLeagueMembers({}),
    enabled: !!user && isAdmin,
    retry: false,
  });

  useEffect(() => {
    if (profilesError) toast.error(`No se pudieron cargar los participantes: ${(profilesError as any).message ?? profilesError}`);
  }, [profilesError]);
  useEffect(() => {
    if (leaguesError) toast.error(`No se pudieron cargar las ligas: ${(leaguesError as any).message ?? leaguesError}`);
  }, [leaguesError]);
  useEffect(() => {
    if (membersError) toast.error(`No se pudieron cargar los miembros: ${(membersError as any).message ?? membersError}`);
  }, [membersError]);
  const [tab, setTab] = useState<"matches" | "users" | "ligas" | "noticias" | "anuncios">("matches");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/inicio" });
  }, [user, isAdmin, loading, navigate]);

  if (!user || !isAdmin) return null;

  async function recalc() {
    const { error } = await supabase.rpc("recompute_all_points" as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Refrescar snapshot del día (para que el gráfico de evolución refleje los nuevos puntos)
    try {
      await fetch("/api/public/hooks/daily-snapshot", { method: "POST" });
    } catch {
      /* no bloquear si falla */
    }
    toast.success("Puntos recalculados · clasificación, gráficos y estadísticas actualizados");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-pitch-deep text-white p-5 shadow-soft flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="display text-3xl flex items-center gap-2"><Shield className="h-6 w-6 text-gold" /> Panel de admin</div>
          <p className="text-white/80 text-sm">Gestiona jornadas, participantes, ligas y contenido de la web.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={recalc} className="bg-gold text-gold-foreground hover:bg-gold/90">
            <RefreshCcw className="h-4 w-4 mr-1" /> Recalcular puntos
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[["matches","Partidos"],["users","Participantes"],["ligas","Ligas"],["noticias","Noticias"],["anuncios","Anuncios"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-3 py-1.5 rounded-full text-sm border ${tab===k ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "matches" && (
        <div className="space-y-4">
          {Object.entries(
            (clubMatches ?? []).reduce((acc: Record<number, any[]>, m: any) => {
              (acc[m.matchday] ||= []).push(m);
              return acc;
            }, {})
          ).map(([matchday, list]) => (
            <div key={matchday} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Jornada {matchday}</h3>
              {list.map((m: any) => (
                <AdminClubMatchRow key={m.id} match={m} onChange={() => qc.invalidateQueries({ queryKey: ["club_matches"] })} />
              ))}
            </div>
          ))}
          {(clubMatches ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No hay partidos cargados todavía.</p>
          )}
        </div>
      )}
      {tab === "users" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="display text-xl mb-2">
              Participantes visibles ({(profiles ?? []).filter((p: any) => !p.is_hidden).length})
            </h3>
            <ul>
              {(profiles ?? []).filter((p: any) => !p.is_hidden).map((p: any) => (
                <AdminUserRow
                  key={p.id}
                  profile={p}
                  leagues={leagues ?? []}
                  memberships={(allMembers ?? []).filter((m: any) => m.user_id === p.id)}
                  onChange={() => qc.invalidateQueries()}
                />
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-flame/40 bg-flame/5 p-4">
            <h3 className="display text-xl mb-1">
              👻 Participantes ocultos ({(profiles ?? []).filter((p: any) => p.is_hidden).length})
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Pueden entrar en la web pero no aparecen en rankings, estadísticas ni en ninguna vista pública.
            </p>
            <ul>
              {(profiles ?? []).filter((p: any) => p.is_hidden).map((p: any) => (
                <AdminUserRow
                  key={p.id}
                  profile={p}
                  leagues={leagues ?? []}
                  memberships={(allMembers ?? []).filter((m: any) => m.user_id === p.id)}
                  onChange={() => qc.invalidateQueries()}
                />
              ))}
              {(profiles ?? []).filter((p: any) => p.is_hidden).length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">No hay participantes ocultos.</li>
              )}
            </ul>
          </div>
        </div>
      )}
      {tab === "ligas" && <AdminLeaguesTab profiles={profiles ?? []} leagues={leagues ?? []} allMembers={allMembers ?? []} />}
      {tab === "noticias" && <AdminNews />}
      {tab === "anuncios" && <AdminAnnouncements />}
    </div>
  );
}

// ── Admin: Partidos de clubes (LaLiga / Champions) ────────────

function AdminClubMatchRow({ match, onChange }: { match: any; onChange: () => void }) {
  const [home, setHome] = useState<string>(match.home_score?.toString() ?? "");
  const [away, setAway] = useState<string>(match.away_score?.toString() ?? "");
  const [tier, setTier] = useState<"normal" | "premium" | "megapremium">(
    match.is_megapremium ? "megapremium" : match.is_premium ? "premium" : "normal"
  );
  const [locked, setLocked] = useState(match.predictions_locked);
  const [saving, setSaving] = useState(false);

  const homeName = match.home?.short_name ?? match.home?.name ?? "?";
  const awayName = match.away?.short_name ?? match.away?.name ?? "?";
  const kickoff = new Date(match.utc_date).toLocaleString("es-ES", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  async function save() {
    setSaving(true);
    const update: any = {
      is_premium: tier === "premium",
      is_megapremium: tier === "megapremium",
      predictions_locked: locked,
    };
    if (home !== "" && away !== "") {
      update.home_score = Number(home);
      update.away_score = Number(away);
      update.status = "FINISHED";
    } else {
      update.home_score = null;
      update.away_score = null;
      update.status = "SCHEDULED";
    }
    const { error } = await (supabase as any).from("club_matches").update(update).eq("id", match.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Guardado"); onChange(); }
  }

  return (
    <div className={`rounded-xl border bg-card p-3 shadow-soft ${
      tier === "megapremium" ? "border-red-500/50" : tier === "premium" ? "border-gold/40" : "border-border"
    }`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{kickoff}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {(["normal", "premium", "megapremium"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border transition-colors ${
                  tier === t
                    ? t === "megapremium" ? "bg-red-600 text-white border-red-600"
                    : t === "premium" ? "bg-gold text-gold-foreground border-gold"
                    : "bg-muted text-foreground border-border"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "megapremium" ? "Mega" : t === "premium" ? "Premium" : "Normal"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-foreground">
            <Lock className="h-3 w-3" /> Bloquear
            <Switch checked={locked} onCheckedChange={setLocked} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
        <div className="text-right truncate">{homeName}</div>
        <div className="flex items-center gap-1">
          <Input type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} className="w-14 text-center font-bold" />
          <span>–</span>
          <Input type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} className="w-14 text-center font-bold" />
        </div>
        <div className="truncate">{awayName}</div>
        <Button size="sm" disabled={saving} onClick={save}>Guardar</Button>
      </div>
    </div>
  );
}

// ── Admin: Ligas ─────────────────────────────────────────────

function AdminLeaguesTab({ profiles, leagues, allMembers }: { profiles: any[]; leagues: any[]; allMembers: any[] }) {
  const qc = useQueryClient();
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [addUserLeague, setAddUserLeague] = useState<{ id: string; name: string } | null>(null);
  const [addUserId, setAddUserId] = useState("");

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach((p: any) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const membersByLeague = useMemo(() => {
    const m: Record<string, any[]> = {};
    (allMembers ?? []).forEach((lm: any) => (m[lm.league_id] ||= []).push(lm));
    return m;
  }, [allMembers]);

  async function deleteLeague(id: string, name: string) {
    if (!confirm(`¿Eliminar la liga "${name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await (supabase as any).from("leagues").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin_leagues"] });
    qc.invalidateQueries({ queryKey: ["admin_all_league_members"] });
    qc.invalidateQueries({ queryKey: ["leagues"] });
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    toast.success(`Liga "${name}" eliminada`);
  }

  async function removeMember(leagueId: string, userId: string) {
    const { error } = await (supabase as any)
      .from("league_memberships")
      .delete()
      .eq("league_id", leagueId)
      .eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin_all_league_members"] });
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    qc.invalidateQueries({ queryKey: ["my_leagues"] });
    toast.success("Participante eliminado de la liga");
  }

  async function addMember(leagueId: string) {
    if (!addUserId) return;
    const { error } = await (supabase as any)
      .from("league_memberships")
      .insert({ league_id: leagueId, user_id: addUserId, is_league_admin: false });
    if (error) { toast.error(error.message.includes("duplicate") ? "Ya está en esta liga" : error.message); return; }
    // Entrar en una liga real ya no es jugar individualmente.
    if (!leagues.find((l) => l.id === leagueId)?.is_default) {
      await (supabase as any).from("profiles").update({ plays_individually: false }).eq("id", addUserId);
    }
    qc.invalidateQueries({ queryKey: ["admin_all_league_members"] });
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    qc.invalidateQueries({ queryKey: ["my_leagues"] });
    setAddUserId("");
    setAddUserLeague(null);
    toast.success("Participante añadido");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Vista completa de todas las ligas. Puedes ver códigos, gestionar miembros y eliminar ligas.
      </p>

      {(leagues ?? []).map((league: any) => {
        const members = membersByLeague[league.id] ?? [];
        const creator = profileMap[league.creator_id];
        const isOpen = expandedLeague === league.id;

        return (
          <div key={league.id} className={`rounded-xl border bg-card overflow-hidden shadow-soft ${league.is_default ? "border-gold/40" : "border-border"}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold truncate">{league.name}</span>
                  {league.is_default && <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-full font-bold">DEFAULT</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono font-bold tracking-widest text-foreground">{league.invite_code}</span>
                  <span>·</span>
                  <span>{members.length} miembros</span>
                  {creator && <><span>·</span><span>Creador: {creator.display_name}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedLeague(isOpen ? null : league.id)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-border hover:bg-muted transition-colors"
                >
                  {isOpen ? "Cerrar" : "Ver miembros"}
                </button>
                {!league.is_default && (
                  <button
                    onClick={() => deleteLeague(league.id, league.name)}
                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Members list */}
            {isOpen && (
              <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin miembros.</p>
                ) : (
                  <div className="space-y-1">
                    {members.map((m: any) => {
                      const p = profileMap[m.user_id];
                      return (
                        <div key={m.user_id} className="flex items-center justify-between text-sm">
                          <span>{p?.avatar_emoji} {p?.display_name ?? m.user_id.slice(0, 8)}</span>
                          <div className="flex items-center gap-2">
                            {m.is_league_admin && <span className="text-[10px] text-gold">Admin</span>}
                            <button
                              onClick={() => removeMember(league.id, m.user_id)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Expulsar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add member */}
                {addUserLeague?.id === league.id ? (
                  <div className="flex gap-2 pt-1">
                    <select
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">Seleccionar participante…</option>
                      {profiles
                        .filter((p: any) => !members.find((m: any) => m.user_id === p.id))
                        .map((p: any) => (
                          <option key={p.id} value={p.id}>{p.avatar_emoji} {p.display_name}</option>
                        ))}
                    </select>
                    <button
                      onClick={() => addMember(league.id)}
                      disabled={!addUserId}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40"
                    >
                      Añadir
                    </button>
                    <button
                      onClick={() => { setAddUserLeague(null); setAddUserId(""); }}
                      className="px-2 py-1.5 rounded-lg border border-border text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddUserLeague({ id: league.id, name: league.name })}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Añadir participante
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdminBonus({ bonus, teams, onChange }: any) {
  const [showNew, setShowNew] = useState(false);

  const grouped = bonus.reduce((acc: Record<string, any[]>, b: any) => {
    const k = b.location ?? "mis_especiales_generales";
    (acc[k] ||= []).push(b);
    return acc;
  }, {} as Record<string, any[]>);

  const orderedKeys = [
    ...LOCATION_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
    ...Object.keys(grouped).filter((k) => !LOCATIONS[k]),
  ].filter((k, i, a) => a.indexOf(k) === i && grouped[k]);

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowNew(!showNew)} variant="outline">
        <Plus className="h-4 w-4 mr-1" /> Nueva pregunta bonus
      </Button>
      {showNew && <NewBonusForm onCreated={() => { setShowNew(false); onChange(); }} />}
      {orderedKeys.map((k) => (
        <div key={k} className="space-y-2">
          <h3 className="display text-lg text-muted-foreground">
            {LOCATIONS[k] ?? grouped[k][0]?.location_label ?? k}{" "}
            <span className="text-xs">({grouped[k].length})</span>
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {grouped[k].map((b: any) => (
              <AdminBonusCard key={b.id} bonus={b} teams={teams} onChange={onChange} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LocationSelect({
  value,
  customLabel,
  onChange,
}: {
  value: string;
  customLabel: string;
  onChange: (loc: string, customLabel: string) => void;
}) {
  const isPreset = !!LOCATIONS[value];
  const [mode, setMode] = useState<"preset" | "custom">(isPreset || !value ? "preset" : "custom");
  return (
    <div className="space-y-1">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => { setMode("preset"); onChange("mis_especiales_generales", ""); }}
          className={`px-2 py-0.5 rounded ${mode === "preset" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          Preset
        </button>
        <button
          type="button"
          onClick={() => { setMode("custom"); onChange(`custom_${Date.now()}`, customLabel || ""); }}
          className={`px-2 py-0.5 rounded ${mode === "custom" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          Nueva categoría
        </button>
      </div>
      {mode === "preset" ? (
        <select
          value={isPreset ? value : "mis_especiales_generales"}
          onChange={(e) => onChange(e.target.value, "")}
          className="w-full border rounded-md px-2 py-1.5 text-sm"
        >
          {LOCATION_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : (
        <Input
          value={customLabel}
          onChange={(e) => onChange(value.startsWith("custom_") ? value : `custom_${Date.now()}`, e.target.value)}
          placeholder="Nombre de la nueva categoría"
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "yes_no", label: "Sí / No" },
  { value: "bracket_side", label: "Lado del cuadro (Izq/Der)" },
  { value: "team", label: "Equipo (desplegable)" },
  { value: "match", label: "Partido (desplegable)" },
  { value: "text", label: "Texto libre" },
  { value: "multi_text", label: "Varias respuestas de texto" },
  { value: "two_teams", label: "Dos equipos" },
  { value: "stage", label: "Fase" },
  { value: "player", label: "Jugador" },
  { value: "group", label: "Grupo" },
  { value: "top5_players", label: "Top 5 jugadores" },
  { value: "multi_match", label: "Varios partidos" },
];

function NewBonusForm({ onCreated }: { onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState("10");
  const [kind, setKind] = useState("yes_no");
  const [startAt, setStartAt] = useState("");
  const [deadline, setDeadline] = useState("2026-06-11T18:00");
  const [visible, setVisible] = useState(true);
  const [location, setLocation] = useState("mis_especiales_generales");
  const [customLabel, setCustomLabel] = useState("");
  const [multiCount, setMultiCount] = useState(3);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40) + "_" + Date.now();
    const payload: any = {
      key,
      label,
      points: Number(points),
      kind,
      deadline_at: new Date(deadline).toISOString(),
      start_at: startAt ? new Date(startAt).toISOString() : null,
      is_visible: visible,
      is_fun: true,
      location,
      location_label: location.startsWith("custom_") ? (customLabel || "Personalizada") : null,
      multi_text_count: kind === "multi_text" ? multiCount : 1,
    };
    const { error } = await supabase.from("bonus_questions").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Pregunta creada"); onCreated(); }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs text-muted-foreground">Pregunta</span>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: ¿Marca España en el primer partido?" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Puntos</span>
          <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Tipo de respuesta</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm">
            {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Fecha/hora de inicio (opcional)</span>
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Fecha/hora de cierre</span>
          <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        {kind === "multi_text" && (
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Nº de campos (1–10)</span>
            <Input type="number" min={1} max={10} value={multiCount} onChange={(e) => setMultiCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        )}
        <div className="space-y-1 md:col-span-2">
          <span className="text-xs text-muted-foreground">Ubicación</span>
          <LocationSelect
            value={location}
            customLabel={customLabel}
            onChange={(loc, cl) => { setLocation(loc); setCustomLabel(cl); }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={visible} onCheckedChange={setVisible} />
          Visible para los participantes
        </label>
      </div>
      <Button onClick={create} disabled={saving || !label}>Crear pregunta</Button>
    </div>
  );
}

function AdminBonusCard({ bonus, teams, onChange }: any) {
  const [val, setVal] = useState<string>(bonus.correct_answer?.value ?? bonus.correct_answer?.text ?? "");
  const [val1, setVal1] = useState<string>(bonus.correct_answer?.values?.[0] ?? "");
  const [val2, setVal2] = useState<string>(bonus.correct_answer?.values?.[1] ?? "");
  const [active, setActive] = useState(bonus.is_active);
  const [visible, setVisible] = useState(bonus.is_visible !== false);
  const [editLabel, setEditLabel] = useState(bonus.label);
  const [editPoints, setEditPoints] = useState(String(bonus.points));
  const [editStart, setEditStart] = useState(bonus.start_at ? toLocalDT(bonus.start_at) : "");
  const [editDeadline, setEditDeadline] = useState(toLocalDT(bonus.deadline_at));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isManual = MANUAL_KINDS.has(bonus.kind);

  async function save() {
    setSaving(true);
    const update: any = {
      is_active: active,
      is_visible: visible,
    };
    // Las preguntas de texto libre/partidos se marcan a mano en Pronósticos → Especiales,
    // así que aquí no tocamos correct_answer (evita pisar lo ya marcado).
    if (!isManual) {
      let answer: any = null;
      if (bonus.kind === "two_teams") {
        if (val1 || val2) answer = { values: [val1, val2].filter(Boolean) };
      } else if (val) {
        answer = { value: val };
      }
      update.correct_answer = answer;
    }
    if (editing) {
      update.label = editLabel;
      update.points = Number(editPoints);
      update.deadline_at = new Date(editDeadline).toISOString();
      update.start_at = editStart ? new Date(editStart).toISOString() : null;
    }
    const { error } = await supabase.from("bonus_questions").update(update).eq("id", bonus.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Pregunta actualizada · puntos recalculados");
      setEditing(false);
      onChange();
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${bonus.label}"? Se borrarán todas las respuestas.`)) return;
    setSaving(true);
    await supabase.from("bonus_predictions").delete().eq("bonus_id", bonus.id);
    const { error } = await supabase.from("bonus_questions").delete().eq("id", bonus.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Eliminada"); onChange(); }
  }

  return (
    <div className={`rounded-xl border bg-card p-4 ${visible ? "border-border" : "border-flame/40"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-sm font-semibold" />
          ) : (
            <div className="display text-lg truncate">{bonus.label}</div>
          )}
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
            <span>+{bonus.points} pts</span>
            <span>· {KIND_OPTIONS.find((k) => k.value === bonus.kind)?.label ?? bonus.kind}</span>
            <span>· {locationLabel(bonus)}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {bonus.start_at && <>Abre {formatKickoff(bonus.start_at)} · </>}
            Cierra {formatKickoff(bonus.deadline_at)}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs items-end">
          <label className="flex items-center gap-1">Activa <Switch checked={active} onCheckedChange={setActive} /></label>
          <label className="flex items-center gap-1">
            {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-flame" />}
            <Switch checked={visible} onCheckedChange={setVisible} />
          </label>
        </div>
      </div>

      {editing && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Puntos</span>
            <Input type="number" value={editPoints} onChange={(e) => setEditPoints(e.target.value)} className="h-8" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Inicio</span>
            <Input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="h-8" />
          </label>
          <label className="space-y-1 text-xs col-span-2">
            <span className="text-muted-foreground">Cierre</span>
            <Input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="h-8" />
          </label>
        </div>
      )}

      <div className="mt-3 space-y-2 text-sm">
        {isManual ? (
          <p className="text-xs text-muted-foreground italic">
            Esta pregunta se marca a mano, respuesta por respuesta, en Pronósticos → Especiales.
          </p>
        ) : (
        <>
        <div className="text-xs text-muted-foreground">Respuesta correcta</div>
        {bonus.kind === "team" ? (
          <select value={val} onChange={(e) => setVal(e.target.value)} className="w-full border rounded-md px-2 py-1.5">
            <option value="">— sin respuesta —</option>
            {teams.map((t: any) => <option key={t.code} value={t.code}>{t.flag} {t.name}</option>)}
          </select>
        ) : bonus.kind === "stage" ? (
          <select value={val} onChange={(e) => setVal(e.target.value)} className="w-full border rounded-md px-2 py-1.5">
            <option value="">—</option>
            {Object.entries(STAGE_LABELS).map(([k,l]) => <option key={k} value={k}>{l as string}</option>)}
            <option value="champion">Campeona</option>
          </select>
        ) : bonus.kind === "yes_no" ? (
          <select value={val} onChange={(e) => setVal(e.target.value)} className="w-full border rounded-md px-2 py-1.5">
            <option value="">— sin respuesta —</option>
            <option value="yes">Sí</option>
            <option value="no">No</option>
          </select>
        ) : bonus.kind === "bracket_side" ? (
          <select value={val} onChange={(e) => setVal(e.target.value)} className="w-full border rounded-md px-2 py-1.5">
            <option value="">— sin respuesta —</option>
            <option value="left">Izquierdo</option>
            <option value="right">Derecho</option>
          </select>
        ) : bonus.kind === "two_teams" ? (
          <div className="grid grid-cols-2 gap-2">
            <select value={val1} onChange={(e) => setVal1(e.target.value)} className="border rounded-md px-2 py-1.5"><option value="">—</option>{teams.map((t: any) => <option key={t.code} value={t.code}>{t.flag} {t.name}</option>)}</select>
            <select value={val2} onChange={(e) => setVal2(e.target.value)} className="border rounded-md px-2 py-1.5"><option value="">—</option>{teams.map((t: any) => <option key={t.code} value={t.code}>{t.flag} {t.name}</option>)}</select>
          </div>
        ) : (
          <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Respuesta correcta" />
        )}
        </>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={save} disabled={saving}>Guardar</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>{editing ? "Cancelar edición" : "Editar"}</Button>
          <Button size="sm" variant="destructive" onClick={remove} disabled={saving}>
            <Trash2 className="h-3 w-3 mr-1" /> Borrar
          </Button>
        </div>
      </div>
    </div>
  );
}

const KNOCKOUT_STAGES = ["round_of_32","round_of_16","quarter_final","semi_final","third_place","final"] as const;
const KNOCKOUT_STAGE_LABELS: Record<string, string> = {
  round_of_32:   "Dieciseisavos",
  round_of_16:   "Octavos",
  quarter_final: "Cuartos",
  semi_final:    "Semifinal",
  third_place:   "3er puesto",
  final:         "Final",
};
// Prefijo admin para identificar el slot del cuadro (no se muestra a los usuarios)
const KNOCKOUT_STAGE_PREFIX: Record<string, string> = {
  round_of_32:   "16",
  round_of_16:   "8",
  quarter_final: "4",
  semi_final:    "2",
};

function AdminKnockoutSection({
  matches,
  teams,
  onSync,
  syncing,
  onChange,
}: {
  matches: any[];
  teams: any[];
  onSync: () => void;
  syncing: boolean;
  onChange: () => void;
}) {
  const [showNew, setShowNew] = useState(false);

  const byStage = KNOCKOUT_STAGES.reduce((acc, s) => {
    acc[s] = [...matches.filter((m: any) => m.stage === s)].sort((a, b) => {
      if (a.bracket_position != null && b.bracket_position != null) return a.bracket_position - b.bracket_position;
      return a.kickoff_at < b.kickoff_at ? -1 : 1;
    });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap items-center">
        <Button onClick={onSync} disabled={syncing} variant="outline">
          <Cloud className="h-4 w-4 mr-1" />
          {syncing ? "Sincronizando…" : "Sync clasificados"}
        </Button>
        <Button variant="outline" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo partido
        </Button>
      </div>

      {showNew && (
        <NewKnockoutMatchForm teams={teams} existingByStage={byStage} onCreated={() => { setShowNew(false); onChange(); }} />
      )}

      {KNOCKOUT_STAGES.map((stage) => (
        <div key={stage} className="space-y-2">
          <h3 className="display text-lg text-muted-foreground">
            {KNOCKOUT_STAGE_LABELS[stage]}{" "}
            <span className="text-xs">({byStage[stage].length})</span>
          </h3>
          {byStage[stage].length > 0 ? (
            byStage[stage].map((m: any, i: number) => (
              <AdminMatchRow
                key={m.id}
                match={m}
                teams={teams}
                positionLabel={KNOCKOUT_STAGE_PREFIX[stage] ? `${KNOCKOUT_STAGE_PREFIX[stage]}-Partido ${m.bracket_position ?? i + 1}` : null}
                onChange={onChange}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground pl-1">Sin partidos creados aún.</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Avance automático del cuadro ──────────────────────────────
const KNOCKOUT_ADVANCE_ORDER = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"] as const;

async function upsertBracketSlot(
  stage: string,
  position: number,
  side: "home" | "away",
  code: string | null,
  label: string | null,
) {
  const codeField = side === "home" ? "home_code" : "away_code";
  const labelField = side === "home" ? "home_label" : "away_label";
  const { data: existing } = await (supabase as any)
    .from("matches")
    .select("id")
    .eq("stage", stage)
    .eq("bracket_position", position)
    .maybeSingle();
  if (existing) {
    await supabase.from("matches").update({ [codeField]: code, [labelField]: code ? null : label } as any).eq("id", existing.id);
  } else {
    await supabase.from("matches").insert({
      stage,
      bracket_position: position,
      kickoff_at: new Date(Date.now() + 86400000).toISOString(),
      [codeField]: code,
      [labelField]: code ? null : label,
    } as any);
  }
}

async function advanceBracket(match: any, winnerSide: "home" | "away") {
  const position = match.bracket_position;
  if (!position) return; // sin posición no sabemos a qué partido avanza
  const idx = KNOCKOUT_ADVANCE_ORDER.indexOf(match.stage);
  const winnerCode = winnerSide === "home" ? match.home_code : match.away_code;
  const winnerLabel = winnerSide === "home" ? match.home_label : match.away_label;
  const loserCode = winnerSide === "home" ? match.away_code : match.home_code;
  const loserLabel = winnerSide === "home" ? match.away_label : match.home_label;
  const side: "home" | "away" = position % 2 === 1 ? "home" : "away";

  if (idx >= 0 && idx < KNOCKOUT_ADVANCE_ORDER.length - 1) {
    const nextStage = KNOCKOUT_ADVANCE_ORDER[idx + 1];
    const nextPosition = Math.ceil(position / 2);
    await upsertBracketSlot(nextStage, nextPosition, side, winnerCode, winnerLabel);
  }
  if (match.stage === "semi_final") {
    await upsertBracketSlot("third_place", 1, side, loserCode, loserLabel);
  }
}

function TeamPickerInline({
  teams,
  code,
  label,
  onChangeCode,
  onChangeLabel,
}: {
  teams: any[];
  code: string | null;
  label: string | null;
  onChangeCode: (code: string | null) => void;
  onChangeLabel: (label: string) => void;
}) {
  const [freeText, setFreeText] = useState(!code && !!label);
  return (
    <div className="flex-1 min-w-0 space-y-1">
      {freeText ? (
        <div className="flex gap-1">
          <Input
            value={label ?? ""}
            onChange={(e) => onChangeLabel(e.target.value)}
            placeholder="ej: Ganador Partido 3"
            className="h-7 text-xs"
          />
          <button type="button" onClick={() => setFreeText(false)} className="text-[10px] text-muted-foreground underline shrink-0">
            elegir equipo
          </button>
        </div>
      ) : (
        <div className="flex gap-1">
          <select
            value={code ?? ""}
            onChange={(e) => onChangeCode(e.target.value || null)}
            className="flex-1 min-w-0 border rounded-md px-1.5 py-1 text-xs"
          >
            <option value="">— por definir —</option>
            {teams.map((t: any) => <option key={t.code} value={t.code}>{t.flag} {t.name}</option>)}
          </select>
          <button type="button" onClick={() => setFreeText(true)} className="text-[10px] text-muted-foreground underline shrink-0">
            texto libre
          </button>
        </div>
      )}
    </div>
  );
}

function AdminMatchRow({ match, teams, positionLabel, onChange }: { match: any; teams?: any[]; positionLabel?: string | null; onChange: () => void }) {
  const [home, setHome] = useState<string>(match.home_score?.toString() ?? "");
  const [away, setAway] = useState<string>(match.away_score?.toString() ?? "");
  const [tier, setTier] = useState<"normal" | "premium" | "megapremium">(
    match.is_megapremium ? "megapremium" : match.is_premium ? "premium" : "normal"
  );
  const [locked, setLocked] = useState(match.predictions_locked);
  const [extId, setExtId] = useState<string>(match.external_id ?? "");
  const [homeCode, setHomeCode] = useState<string | null>(match.home_code ?? null);
  const [awayCode, setAwayCode] = useState<string | null>(match.away_code ?? null);
  const [homeLabel, setHomeLabel] = useState<string>(match.home_label ?? "");
  const [awayLabel, setAwayLabel] = useState<string>(match.away_label ?? "");
  const [winnerCode, setWinnerCode] = useState<string | null>(match.winner_code ?? null);
  const [saving, setSaving] = useState(false);
  const isKnockout = match.stage !== "group";

  async function save(extra: any = {}) {
    setSaving(true);
    const update: any = {
      is_premium: tier === "premium",
      is_megapremium: tier === "megapremium",
      predictions_locked: locked,
      external_id: extId.trim() || null,
      ...extra,
    };
    if (isKnockout) {
      update.home_code = homeCode || null;
      update.away_code = awayCode || null;
      update.home_label = homeCode ? null : (homeLabel.trim() || null);
      update.away_label = awayCode ? null : (awayLabel.trim() || null);
      update.winner_code = winnerCode || null;
    }
    if (home !== "" && away !== "") {
      update.home_score = Number(home);
      update.away_score = Number(away);
      update.status = "finished";
    } else {
      update.home_score = null;
      update.away_score = null;
      update.status = "scheduled";
    }
    // Ganador que pasa de ronda: el que fije el admin (winner_code) manda; si no,
    // el que tenga más goles a 90'. Sirve para empates decididos en prórroga/penaltis.
    const effWinnerCode = (isKnockout && winnerCode)
      || (update.status === "finished" && update.home_score !== update.away_score
        ? (update.home_score > update.away_score ? homeCode : awayCode)
        : null);
    const { error } = await supabase.from("matches").update(update).eq("id", match.id);
    if (!error && isKnockout && match.bracket_position && effWinnerCode) {
      const winnerSide: "home" | "away" | null =
        effWinnerCode === homeCode ? "home" : effWinnerCode === awayCode ? "away" : null;
      if (winnerSide) await advanceBracket({ ...match, ...update }, winnerSide);
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Guardado"); onChange(); }
  }

  return (
    <div className={`rounded-xl border bg-card p-3 shadow-soft ${
      tier === "megapremium" ? "border-red-500/50" : tier === "premium" ? "border-gold/40" : "border-border"
    }`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>
          {positionLabel && <span className="font-bold text-foreground">{positionLabel} · </span>}
          {formatKickoff(match.kickoff_at)} · {STAGE_LABELS[match.stage]}{match.group_letter ? ` · Grupo ${match.group_letter}`:""}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {(["normal", "premium", "megapremium"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border transition-colors ${
                  tier === t
                    ? t === "megapremium" ? "bg-red-600 text-white border-red-600"
                    : t === "premium" ? "bg-gold text-gold-foreground border-gold"
                    : "bg-muted text-foreground border-border"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "megapremium" ? "Mega" : t === "premium" ? "Premium" : "Normal"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-foreground">
            <Lock className="h-3 w-3" /> Bloquear
            <Switch checked={locked} onCheckedChange={setLocked} />
          </label>
        </div>
      </div>

      {isKnockout && teams ? (
        <div className="flex items-center gap-2 mb-2">
          <TeamPickerInline teams={teams} code={homeCode} label={homeLabel} onChangeCode={setHomeCode} onChangeLabel={setHomeLabel} />
          <span className="text-xs text-muted-foreground">vs</span>
          <TeamPickerInline teams={teams} code={awayCode} label={awayLabel} onChangeCode={setAwayCode} onChangeLabel={setAwayLabel} />
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
        <div className="text-right truncate">{match.home?.flag} {match.home?.name ?? match.home_label}</div>
        <div className="flex items-center gap-1">
          <Input type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} className="w-14 text-center font-bold" />
          <span>–</span>
          <Input type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} className="w-14 text-center font-bold" />
        </div>
        <div className="truncate">{match.away?.name ?? match.away_label} {match.away?.flag}</div>
        <Button size="sm" disabled={saving} onClick={() => save()}>Guardar</Button>
      </div>

      {isKnockout && homeCode && awayCode && (
        <div className="mt-2 flex items-center gap-1.5 text-xs flex-wrap">
          <span className="text-muted-foreground shrink-0">¿Quién pasa? <span className="text-[10px]">(si empate a 90')</span></span>
          {[{ code: homeCode, name: match.home?.name ?? homeCode }, { code: awayCode, name: match.away?.name ?? awayCode }].map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => setWinnerCode(winnerCode === t.code ? null : t.code)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                winnerCode === t.code
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.name}
            </button>
          ))}
          {winnerCode && (
            <button type="button" onClick={() => setWinnerCode(null)} className="text-[10px] text-muted-foreground underline">
              quitar
            </button>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">API-Football fixture ID:</span>
        <Input value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="ej: 1208123" className="h-7 w-32 text-xs" />
      </div>
    </div>
  );
}

function NewKnockoutMatchForm({ teams, existingByStage, onCreated }: { teams: any[]; existingByStage: Record<string, any[]>; onCreated: () => void }) {
  const [stage,      setStage]     = useState("round_of_32");
  const [homeCode,   setHomeCode]  = useState<string | null>(null);
  const [awayCode,   setAwayCode]  = useState<string | null>(null);
  const [homeLabel,  setHomeLabel] = useState("");
  const [awayLabel,  setAwayLabel] = useState("");
  const [kickoff,    setKickoff]   = useState("2026-06-29T18:00");
  const [premium,    setPremium]   = useState(false);
  const [saving,     setSaving]    = useState(false);

  const nextPosition = (existingByStage[stage]?.length ?? 0) + 1;

  async function create() {
    setSaving(true);
    const { error } = await supabase.from("matches").insert({
      stage,
      bracket_position: nextPosition,
      home_code: homeCode || null,
      away_code: awayCode || null,
      home_label: homeCode ? null : (homeLabel.trim() || null),
      away_label: awayCode ? null : (awayLabel.trim() || null),
      kickoff_at: new Date(kickoff).toISOString(),
      is_premium: premium,
    } as any);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Partido de eliminatoria creado"); onCreated(); }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Fase</span>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full border rounded-md px-2 py-1.5 text-sm"
          >
            {KNOCKOUT_STAGES.map((s) => (
              <option key={s} value={s}>{KNOCKOUT_STAGE_LABELS[s]}</option>
            ))}
          </select>
          {KNOCKOUT_STAGE_PREFIX[stage] && (
            <span className="text-[10px] text-muted-foreground">
              Se creará como {KNOCKOUT_STAGE_PREFIX[stage]}-Partido {nextPosition}
            </span>
          )}
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Fecha/hora</span>
          <Input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Equipo local</span>
          <TeamPickerInline teams={teams} code={homeCode} label={homeLabel} onChangeCode={setHomeCode} onChangeLabel={setHomeLabel} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Equipo visitante</span>
          <TeamPickerInline teams={teams} code={awayCode} label={awayLabel} onChangeCode={setAwayCode} onChangeLabel={setAwayLabel} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={premium} onCheckedChange={setPremium} />
          Partido Premium
        </label>
      </div>
      <Button onClick={create} disabled={saving}>
        <Plus className="h-4 w-4 mr-1" /> Crear partido
      </Button>
    </div>
  );
}


function toLocalDT(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminUserRow({ profile, leagues, memberships, onChange }: {
  profile: any; leagues: any[]; memberships: any[]; onChange: () => void;
}) {
  const updateFn = useServerFn(updateParticipant);
  const deleteFn = useServerFn(deleteParticipant);
  const hideFn = useServerFn(setParticipantHidden);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [movingTo, setMovingTo] = useState("");

  const currentLeagues = memberships
    .map((m) => leagues.find((l) => l.id === m.league_id))
    .filter(Boolean);
  const createdLeagues = leagues.filter((l) => l.creator_id === profile.id && !l.is_default);

  async function moveToLeague() {
    if (!movingTo) return;
    setSaving(true);
    try {
      // Sale de todas las ligas en las que esté.
      for (const m of memberships) {
        await (supabase as any).from("league_memberships").delete().eq("league_id", m.league_id).eq("user_id", profile.id);
      }
      if (movingTo === "__individual__") {
        // Individual es estar solo, no una liga compartida con nadie.
        const { error } = await (supabase as any).from("profiles").update({ plays_individually: true }).eq("id", profile.id);
        if (error) throw error;
        toast.success("Participante puesto en individual");
      } else {
        const { error } = await (supabase as any)
          .from("league_memberships")
          .insert({ league_id: movingTo, user_id: profile.id, is_league_admin: false });
        if (error) throw error;
        await (supabase as any).from("profiles").update({ plays_individually: false }).eq("id", profile.id);
        toast.success("Participante movido de liga");
      }
      setMovingTo("");
      onChange();
    } catch (e: any) {
      toast.error(e.message ?? "Error al cambiar de liga");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await updateFn({ data: { id: profile.id, display_name: name } });
      toast.success("Participante actualizado");
      setEditing(false);
      onChange();
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleHidden() {
    setSaving(true);
    try {
      await hideFn({ data: { id: profile.id, hidden: !profile.is_hidden } });
      toast.success(profile.is_hidden ? "Participante visible" : "Participante oculto");
      onChange();
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar a ${profile.display_name}? Se borrarán todos sus pronósticos.`)) return;
    setSaving(true);
    try {
      await deleteFn({ data: { id: profile.id } });
      toast.success("Participante eliminado");
      onChange();
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="py-2.5 space-y-1.5 border-b border-border last:border-0">
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-xl shrink-0 mt-0.5">{profile.avatar_emoji}</span>
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1" />
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="truncate text-sm">{profile.display_name}</strong>
              {profile.is_hidden && (
                <span className="text-[10px] font-semibold uppercase bg-flame/20 text-flame px-1.5 py-0.5 rounded shrink-0">Oculto</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {currentLeagues.length > 0
                ? currentLeagues.map((l: any) => l.name).join(", ")
                : profile.plays_individually ? "Individual" : "Sin liga"}
              {createdLeagues.length > 0 && (
                <span className="text-gold"> · creó {createdLeagues.length === 1 ? `"${createdLeagues[0].name}"` : `${createdLeagues.length} ligas`}</span>
              )}
            </div>
          </div>
        )}
      </div>
      {!editing && leagues.length > 0 && (
        <div className="flex gap-1.5 items-center">
          <select
            value={movingTo}
            onChange={(e) => setMovingTo(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">Mover a…</option>
            <option value="__individual__">Individual (sin liga)</option>
            {leagues.filter((l: any) => !l.is_default).map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" disabled={saving || !movingTo} onClick={moveToLeague}>Mover</Button>
        </div>
      )}
      <div className="flex gap-1 justify-end">
        {editing ? (
          <>
            <Button size="sm" disabled={saving || !name.trim()} onClick={save}>Guardar</Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setEditing(false); setName(profile.display_name); }}>Cancelar</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
            <Button size="sm" variant="outline" disabled={saving} onClick={toggleHidden}>
              {profile.is_hidden ? "Mostrar" : "Ocultar"}
            </Button>
            <Button size="sm" variant="destructive" disabled={saving} onClick={remove}>Eliminar</Button>
          </>
        )}
      </div>
    </li>
  );
}

// ── Admin: Pronósticos ────────────────────────────────────────

function AdminPredictions() {
  const qc = useQueryClient();
  const [section, setSection] = useState<"matches" | "bonus">("matches");
  const { data: allPreds } = useAllPredictions();
  const { data: allBonusPreds } = useAllBonusPredictions();
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  // Vía segura (server function): correct_answer no es legible desde el cliente para usuarios normales
  const fetchAdminBonus = useServerFn(getAdminBonusQuestions);
  const { data: bonusQs } = useQuery({ queryKey: ["admin_bonus_questions"], queryFn: () => fetchAdminBonus({}) });
  const { data: profiles } = useProfiles();

  const onBonusChange = () => {
    qc.invalidateQueries({ queryKey: ["bonus_questions"] });
    qc.invalidateQueries({ queryKey: ["admin_bonus_questions"] });
    qc.invalidateQueries({ queryKey: ["all_bonus_predictions"] });
  };

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const predsByMatch = useMemo(() => {
    const m: Record<string, any[]> = {};
    (allPreds ?? []).forEach((p: any) => (m[p.match_id] ||= []).push(p));
    return m;
  }, [allPreds]);

  const bonusPredsByQ = useMemo(() => {
    const m: Record<string, any[]> = {};
    (allBonusPreds ?? []).forEach((p: any) => (m[p.bonus_id] ||= []).push(p));
    return m;
  }, [allBonusPreds]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["matches", "bonus"] as const).map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${section === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            {s === "matches" ? "Partidos" : "Especiales"}
          </button>
        ))}
      </div>

      {section === "matches" && (
        <div className="space-y-1.5">
          {(matches ?? []).map((m: any) => (
            <AdminMatchPreds key={m.id} match={m} preds={predsByMatch[m.id] ?? []} profileMap={profileMap} />
          ))}
        </div>
      )}

      {section === "bonus" && (
        <div className="space-y-1.5">
          {(bonusQs ?? []).map((q: any) => (
            <AdminBonusPreds
              key={q.id}
              question={q}
              preds={bonusPredsByQ[q.id] ?? []}
              profileMap={profileMap}
              teams={teams ?? []}
              matches={matches ?? []}
              onChange={onBonusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminMatchPreds({ match, preds, profileMap }: { match: any; preds: any[]; profileMap: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const homeName = match.home?.name ?? match.home_label ?? "?";
  const awayName = match.away?.name ?? match.away_label ?? "?";
  const isFinished = match.status === "finished" && match.home_score != null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors">
        <span className="font-semibold flex-1 text-left truncate">
          {match.home?.flag ?? "🏳️"} {homeName} – {match.away?.flag ?? "🏳️"} {awayName}
        </span>
        {isFinished && (
          <span className="text-xs font-bold text-primary tabular-nums shrink-0">{match.home_score}–{match.away_score}</span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{preds.length} pronósticos</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
          {preds.length === 0 && <p className="text-xs text-muted-foreground col-span-full">Sin pronósticos.</p>}
          {preds.map((p: any) => {
            const profile = profileMap[p.user_id];
            const exact = isFinished && p.home_score === match.home_score && p.away_score === match.away_score;
            const right = isFinished && !exact && outcome(p.home_score, p.away_score) === outcome(match.home_score, match.away_score);
            return (
              <div key={p.user_id} className={`flex items-center justify-between text-xs border rounded px-2 py-1 ${exact ? "border-gold bg-gold/10" : right ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                <span className="truncate">{profile?.avatar_emoji} {profile?.display_name ?? "?"}</span>
                <span className="font-bold tabular-nums ml-1">{p.home_score}–{p.away_score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Kinds donde puede haber varias respuestas correctas a la vez (ej. 5 jugadores acertados,
// o varios equipos invictos a la vez). "team"/"yes_no"/"bracket_side"/"group"/"stage" se
// marcan normalmente con una sola, pero permitimos marcar más de una cuando aplica.
const MULTI_CORRECT_KINDS = new Set(["top5_players", "multi_text", "team", "yes_no", "bracket_side", "group", "stage"]);
// two_teams: exactamente 2 correctas
const PAIR_CORRECT_KINDS = new Set(["two_teams"]);
// Kinds de texto libre / partidos: aquí no fiamos del texto exacto (variantes de nombres),
// así que se marca a mano respuesta por respuesta y usuario por usuario.
const MANUAL_KINDS = new Set(["player", "text", "match", "multi_text", "top5_players", "multi_match"]);

function rawValuesOf(answer: any): string[] {
  if (!answer) return [];
  if (Array.isArray(answer.values)) return answer.values.filter(Boolean);
  if (answer.value != null && answer.value !== "") return [answer.value];
  if (answer.text) return [answer.text];
  return [];
}

// correct_items: { [respuesta]: true (correcta) | false (incorrecta) } — si una respuesta no
// aparece en el objeto, está "en blanco" (sin juzgar todavía).
function manualPointsFor(question: any, marks: Record<string, boolean>): number {
  const correctCount = Object.values(marks).filter((v) => v === true).length;
  if (question.kind === "top5_players") return correctCount * 5;
  if (question.kind === "multi_text") return correctCount * question.points;
  // match, multi_match, player, text: todo o nada (basta con que una de sus respuestas esté en verde)
  return correctCount > 0 ? question.points : 0;
}

function AdminBonusPreds({
  question,
  preds,
  profileMap,
  teams,
  matches,
  onChange,
}: {
  question: any;
  preds: any[];
  profileMap: Record<string, any>;
  teams: any[];
  matches: any[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isManual = MANUAL_KINDS.has(question.kind);
  const isMulti = MULTI_CORRECT_KINDS.has(question.kind);
  const isPair = PAIR_CORRECT_KINDS.has(question.kind);

  // ── Modo automático (equipos, sí/no, grupo, fase...): se marca una respuesta y se
  // aplica sola a todo el mundo que haya puesto exactamente esa opción ──
  const tally = useMemo(() => {
    if (isManual) return [];
    const counts: Record<string, number> = {};
    preds.forEach((p: any) => {
      rawValuesOf(p.answer).forEach((raw) => { counts[raw] = (counts[raw] ?? 0) + 1; });
    });
    return Object.entries(counts)
      .map(([raw, count]) => ({ raw, count, label: resolveLabel(question.kind, raw, teams, matches) || raw }))
      .sort((a, b) => b.count - a.count);
  }, [preds, question.kind, teams, matches, isManual]);

  const correctSet = useMemo(() => new Set(rawValuesOf(question.correct_answer)), [question.correct_answer]);
  const hasCorrect = correctSet.size > 0;

  async function toggleAuto(raw: string) {
    const next = new Set(correctSet);
    if (next.has(raw)) {
      next.delete(raw);
    } else if (isMulti) {
      next.add(raw);
    } else if (isPair) {
      if (next.size >= 2) { toast.error("Ya hay 2 marcadas — desmarca una antes de elegir otra"); return; }
      next.add(raw);
    } else {
      next.clear();
      next.add(raw);
    }
    setSaving(true);
    let answer: any = null;
    if (next.size) {
      if (question.kind === "text") answer = { text: [...next][0] };
      else if (isMulti || isPair) answer = { values: [...next] };
      else answer = { value: [...next][0] };
    }
    const { error } = await supabase.from("bonus_questions").update({ correct_answer: answer }).eq("id", question.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Puntos recalculados"); onChange(); }
  }

  // ── Modo manual (jugadores, partidos, texto libre): cada respuesta de cada
  // persona se marca a mano, sin comparar texto. 3 estados, en ciclo al tocar:
  // en blanco → correcta (verde) → incorrecta (roja) → en blanco ──
  async function toggleManual(p: any, raw: string) {
    const current: Record<string, boolean> =
      p.correct_items && typeof p.correct_items === "object" && !Array.isArray(p.correct_items)
        ? p.correct_items
        : {};
    const next = { ...current };
    if (!(raw in next)) next[raw] = true;
    else if (next[raw] === true) next[raw] = false;
    else delete next[raw];
    const points = manualPointsFor(question, next);
    setSaving(true);
    const { error } = await supabase
      .from("bonus_predictions")
      .update({ correct_items: next, points_awarded: points })
      .eq("user_id", p.user_id)
      .eq("bonus_id", question.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else onChange();
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors">
        <span className="font-semibold flex-1 text-left truncate">{question.label}</span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{preds.length} respuestas</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 space-y-3">
          {isManual ? (
            <p className="text-[11px] text-muted-foreground">
              Toca cada respuesta para alternar: en blanco → correcta (verde) → incorrecta (roja). Se valora persona por persona.
            </p>
          ) : (
            tally.length > 0 && (
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">
                  Toca para marcar correcta{(isMulti || isPair) ? " (puedes marcar varias)" : ""}:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tally.map(({ raw, label, count }) => {
                    const isCorrect = correctSet.has(raw);
                    return (
                      <button
                        key={raw}
                        type="button"
                        disabled={saving}
                        onClick={() => toggleAuto(raw)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                          isCorrect
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-rose-400 hover:text-rose-600"
                        }`}
                      >
                        {label} <span className="opacity-60">· {count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {preds.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin respuestas.</p>
          ) : (
            <div className="space-y-1">
              {preds.map((p: any) => {
                const profile = profileMap[p.user_id];
                const raws = rawValuesOf(p.answer);
                const marks: Record<string, boolean> =
                  p.correct_items && typeof p.correct_items === "object" && !Array.isArray(p.correct_items)
                    ? p.correct_items
                    : {};
                const anyJudged = Object.keys(marks).length > 0;
                return (
                  <div key={p.user_id} className="flex items-center justify-between gap-2 text-xs border-b border-border/40 py-1 last:border-0">
                    <span className="text-muted-foreground truncate shrink-0">{profile?.avatar_emoji} {profile?.display_name ?? "?"}</span>
                    <span className="flex flex-wrap gap-1 justify-end items-center">
                      {raws.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : raws.map((raw, i) => {
                        const label = resolveLabel(question.kind, raw, teams, matches) || raw;
                        if (isManual) {
                          const mark = marks[raw]; // true | false | undefined (en blanco)
                          const cls = mark === true
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/40"
                            : mark === false
                            ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/40"
                            : "text-foreground bg-muted/40 border-transparent hover:bg-muted";
                          return (
                            <button
                              key={i}
                              type="button"
                              disabled={saving}
                              onClick={() => toggleManual(p, raw)}
                              title="Toca para alternar: en blanco → correcta → incorrecta"
                              className={`font-semibold px-1.5 py-0.5 rounded border transition-colors disabled:opacity-50 ${cls}`}
                            >
                              {label}
                            </button>
                          );
                        }
                        const isCorrect = correctSet.has(raw);
                        const cls = !hasCorrect ? "text-foreground"
                          : isCorrect ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                          : "text-rose-600 dark:text-rose-400 bg-rose-500/10";
                        return (
                          <span key={i} className={`font-semibold px-1.5 py-0.5 rounded ${cls}`}>
                            {label}
                          </span>
                        );
                      })}
                      {(isManual ? anyJudged : hasCorrect) && (
                        <span className="font-bold tabular-nums text-muted-foreground shrink-0">{p.points_awarded ?? 0}p</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admin: Encuesta LaLiga/Champions/Premier ──────────────────

const SURVEY_LEAGUE_LABELS: Record<string, string> = { laliga: "LaLiga", champions: "Champions", premier: "Premier" };

function AdminSurvey({ profiles }: { profiles: any[] }) {
  const { data: responses } = useAllSurveyResponses();
  const { data: ideas } = useAllSurveyIdeas();

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach((p: any) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const yesCount = (responses ?? []).filter((r: any) => r.would_play === "yes").length;
  const noCount = (responses ?? []).filter((r: any) => r.would_play === "no").length;

  const leagueCounts = useMemo(() => {
    const counts: Record<string, number> = { laliga: 0, champions: 0, premier: 0 };
    (responses ?? []).forEach((r: any) => {
      (r.leagues ?? []).forEach((l: string) => { if (counts[l] != null) counts[l]++; });
    });
    return counts;
  }, [responses]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">¿Jugarían?</p>
          <p className="display text-2xl mt-1">
            <span className="text-emerald-600">{yesCount} sí</span> · <span className="text-rose-600">{noCount} no</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total respuestas</p>
          <p className="display text-2xl mt-1">{(responses ?? []).length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold mb-2">Competiciones más pedidas</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {Object.entries(SURVEY_LEAGUE_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-lg bg-muted/40 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{leagueCounts[key] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold mb-2">Respuestas individuales ({(responses ?? []).length})</h3>
        <div className="space-y-1.5">
          {(responses ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no hay respuestas.</p>
          ) : (
            (responses ?? []).map((r: any) => {
              const p = profileMap[r.user_id];
              return (
                <div key={r.user_id} className="flex items-center justify-between text-xs border-b border-border/40 py-1.5 last:border-0">
                  <span className="truncate">{p?.avatar_emoji} {p?.display_name ?? r.user_id.slice(0, 8)}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={r.would_play === "yes" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                      {r.would_play === "yes" ? "Sí" : r.would_play === "no" ? "No" : "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {(r.leagues ?? []).map((l: string) => SURVEY_LEAGUE_LABELS[l] ?? l).join(", ") || "—"}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold mb-2">Ideas enviadas ({(ideas ?? []).length})</h3>
        <div className="space-y-2">
          {(ideas ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no hay ideas.</p>
          ) : (
            (ideas ?? []).map((i: any) => {
              const p = profileMap[i.user_id];
              return (
                <div key={i.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="font-semibold">{p?.avatar_emoji} {p?.display_name ?? i.user_id.slice(0, 8)}</span>
                    <span>{new Date(i.created_at).toLocaleDateString("es-ES")}</span>
                  </div>
                  <p className="text-foreground">{i.idea_text}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
