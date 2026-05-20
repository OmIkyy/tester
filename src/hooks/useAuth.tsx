import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "ADMIN" | "SALES" | "TEKNISI" | "VIEWER";

interface Profile {
  id: string;
  nama: string;
  email: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevents double-loading profile data on initial mount
  const initializedRef = useRef(false);
  // Track current values inside async callbacks without retriggering effects
  const profileRef = useRef<Profile | null>(null);
  const roleRef = useRef<AppRole | null>(null);
  const currentUserRef = useRef<User | null>(null);
  // Guard so we only show diff toasts after the first successful load
  const firstLoadRef = useRef(true);

  const loadUserData = async (uid: string, opts: { notify?: boolean } = {}) => {
    try {
      const [{ data: prof, error: profileError }, { data: roleRow, error: roleError }] = await Promise.all([
        supabase.from("profiles").select("id,nama,email").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      ]);

      if (currentUserRef.current?.id !== uid) return;

      if (profileError) console.error("load profile failed", profileError);
      if (roleError) console.error("load role failed", roleError);

      const authUser = currentUserRef.current;
      const fallbackProfile: Profile | null = authUser
        ? {
            id: uid,
            nama: (authUser.user_metadata?.nama as string | undefined) || authUser.email?.split("@")[0] || "User",
            email: authUser.email ?? "",
          }
        : null;
      const nextProfile = ((prof as Profile | null) ?? fallbackProfile) ?? null;
      const nextRole = ((roleRow?.role as AppRole) ?? "VIEWER") as AppRole;

      if (opts.notify && !firstLoadRef.current) {
        const prevProfile = profileRef.current;
        const prevRole = roleRef.current;
        if (prevProfile && nextProfile && prevProfile.nama !== nextProfile.nama) {
          toast.success("Nama profil diperbarui", {
            description: `Sekarang: ${nextProfile.nama}`,
          });
        }
        if (prevRole && nextRole && prevRole !== nextRole) {
          toast.info("Role Anda berubah", {
            description: `Role baru: ${nextRole}`,
          });
        }
      }

      profileRef.current = nextProfile;
      roleRef.current = nextRole;
      setProfile(nextProfile);
      setRole(nextRole);
      firstLoadRef.current = false;
    } catch (err) {
      console.error("loadUserData failed", err);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Attach listener FIRST (Supabase recommendation) so we don't miss events,
    // then resolve the existing session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (cancelled) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      currentUserRef.current = sess?.user ?? null;
      if (sess?.user) {
        if (initializedRef.current) {
          // Defer to avoid running supabase calls inside the auth callback synchronously
          setTimeout(() => {
            if (!cancelled) loadUserData(sess.user!.id);
          }, 0);
        }
      } else {
        // Reset all derived state on sign-out so a re-login starts clean
        currentUserRef.current = null;
        profileRef.current = null;
        roleRef.current = null;
        firstLoadRef.current = true;
        setProfile(null);
        setRole(null);
      }
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session: sess } }) => {
        if (cancelled) return;
        setSession(sess);
        setUser(sess?.user ?? null);
        currentUserRef.current = sess?.user ?? null;
        if (sess?.user) {
          await loadUserData(sess.user.id);
        }
      })
      .catch((err) => console.error("getSession failed", err))
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        initializedRef.current = true;
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Realtime: refresh profile/role whenever they change in the DB
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    // Unique channel name per user + random suffix prevents duplicate-channel
    // errors when the effect re-mounts quickly (StrictMode, fast reload).
    const channelName = `user-sync-${uid}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${uid}` },
        () => loadUserData(uid, { notify: true })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        () => loadUserData(uid, { notify: true })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) await loadUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}