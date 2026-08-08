import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADMIN_EMAILS } from "@/lib/admin-emails";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string; claims?: any }) {
  // La lista de ADMIN_EMAILS manda siempre, aunque el rol en la base de datos
  // estuviera mal puesto. No nos fiamos del claim "email" del JWT (con las
  // claves de firma asimétricas no siempre viene poblado) — lo buscamos en
  // la base de datos con la service role, que es fiable siempre.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!profile?.email || !ADMIN_EMAILS.includes(profile.email)) {
    throw new Response("Solo admin", { status: 403 });
  }
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Solo admin", { status: 403 });
}

export const getAdminProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_emoji, email, created_at, is_hidden")
      .order("display_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setParticipantHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_hidden: data.hidden })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminBonusQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("bonus_questions")
      .select("*")
      .order("position");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      display_name: z.string().min(1).max(80),
      avatar_emoji: z.string().min(1).max(8).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const update: any = { display_name: data.display_name };
    if (data.avatar_emoji) update.avatar_emoji = data.avatar_emoji;
    const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminLeagues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("leagues")
      .select("*")
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAdminLeagueMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("league_memberships")
      .select("league_id, user_id, is_league_admin");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) {
      throw new Response("No puedes eliminarte a ti mismo", { status: 400 });
    }
    // Delete dependent data first (no FK cascades configured)
    await supabaseAdmin.from("predictions").delete().eq("user_id", data.id);
    await supabaseAdmin.from("bonus_predictions").delete().eq("user_id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
