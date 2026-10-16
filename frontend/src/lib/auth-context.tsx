"use client";

import React, { createContext, useContext, useEffect, useState } from"react";
import { User, Session } from"@supabase/supabase-js";
import { supabase } from"./supabase";
import { useRouter } from"next/navigation";

interface AuthContextType {
 user: User | null;
 session: Session | null;
 loading: boolean;
 signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
 user: null,
 session: null,
 loading: true,
 signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
 const [user, setUser] = useState<User | null>(null);
 const [session, setSession] = useState<Session | null>(null);
 const [loading, setLoading] = useState(true);
 const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

    // Non-blocking pre-warm ping to Render backend to eliminate cold-start wait
    try {
      fetch(`${backendUrl}/health`, { mode: "no-cors" }).catch(() => {});
    } catch {}

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_OUT") {
          router.push("/login");
        } else if (newSession?.access_token && event === "SIGNED_IN") {
          fetch(`${backendUrl}/api/auth/provision`, {
            method: "POST",
            headers: { Authorization: `Bearer ${newSession.access_token}` },
          }).catch((err) => console.error("[AuthContext] Provision error:", err));
        }
      }
    );

    // Fast initial check directly from local cache
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!mounted) return;
      if (initSession) {
        setSession(initSession);
        setUser(initSession.user);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

 const signOut = async () => {
 try {
 await supabase.auth.signOut();
 } catch (e) {
 console.error(e);
 }
 router.push("/login");
 };

 return (
 <AuthContext.Provider value={{ user, session, loading, signOut }}>
 {children}
 </AuthContext.Provider>
 );
};

export const useAuth = () => useContext(AuthContext);
