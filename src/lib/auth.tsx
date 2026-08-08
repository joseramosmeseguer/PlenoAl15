import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAILS } from "@/lib/admin-emails";

const VIEW_AS_USER_KEY = "pleno_view_as_user";

interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  realIsAdmin: boolean;
  viewingAsUser: boolean;
  setViewingAsUser: (v: boolean) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  session: null,
  user: null,
  isAdmin: false,
  realIsAdmin: false,
  viewingAsUser: false,
  setViewingAsUser: () => {},
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [realIsAdmin, setRealIsAdmin] = useState(false);
  const [viewingAsUser, setViewingAsUserState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setViewingAsUserState(localStorage.getItem(VIEW_AS_USER_KEY) === "1");
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        // diferido para evitar deadlocks
        setTimeout(() => checkAdmin(s.user.id, s.user.email), 0);
      } else {
        setRealIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) checkAdmin(data.session.user.id, data.session.user.email);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function checkAdmin(uid: string, email?: string | null) {
    // Solo estos correos pueden ser admin, aunque el rol en la base de
    // datos estuviera mal puesto: la lista de ADMIN_EMAILS manda siempre.
    if (!email || !ADMIN_EMAILS.includes(email)) {
      setRealIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setRealIsAdmin(!!data);
  }

  function setViewingAsUser(v: boolean) {
    setViewingAsUserState(v);
    if (typeof window !== "undefined") {
      if (v) localStorage.setItem(VIEW_AS_USER_KEY, "1");
      else localStorage.removeItem(VIEW_AS_USER_KEY);
    }
  }

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        // isAdmin es el que usa el resto de la app para decidir qué mostrar:
        // si el admin está "viendo como usuario", se comporta como uno más.
        isAdmin: realIsAdmin && !viewingAsUser,
        realIsAdmin,
        viewingAsUser,
        setViewingAsUser,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
