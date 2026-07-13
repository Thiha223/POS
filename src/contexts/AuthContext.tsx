import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, shopName: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string, shopName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!(user.email_confirmed_at ?? user.confirmed_at);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore existing session only if the email is verified
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s && isVerified(s.user)) {
        setSession(s);
        setUser(s.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Only admit the session if email is verified.
        // signUp fires SIGNED_IN immediately but email_confirmed_at is null — blocked here.
        // verifyOtp fires SIGNED_IN with email_confirmed_at set — allowed through.
        if (s && isVerified(s.user)) {
          setSession(s);
          setUser(s.user);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, shopName: string) => {
    // Clear any stale session before signup so the OTP flow starts clean.
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { shop_name: shopName } },
    });
    return { error: error as Error | null };
  };

  const verifyOtp = async (email: string, token: string, shopName: string) => {
    try {
      const cleanToken = token.trim();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanToken,
        type: 'signup',
      });
      if (error) return { error: error as Error | null };
      if (data.session && isVerified(data.user)) {
        setSession(data.session);
        setUser(data.user!);
        await supabase.from('profiles').upsert(
          { user_id: data.user!.id, shop_name: shopName || 'My Shop' },
          { onConflict: 'user_id', ignoreDuplicates: true }
        );
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Verification failed.') };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, verifyOtp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
