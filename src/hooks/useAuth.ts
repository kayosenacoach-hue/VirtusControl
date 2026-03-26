import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Subscription } from '@/types/user';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setSubscriptionError(null);
      const db = supabase as any;

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // 1. Busca o Perfil
        const { data: profileData } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (profileData) {
          setProfile(profileData as Profile);
        } else {
          setProfile({ id: session.user.id, role: 'owner', full_name: session.user.user_metadata?.full_name || 'Usuário', createdAt: new Date().toISOString() } as unknown as Profile);
        }

        // 2. Busca a Assinatura
        setIsSubscriptionLoading(true);
        let targetEntityId = null;
        
        const { data: access } = await db.from('user_entity_access').select('entity_id').eq('user_id', session.user.id).limit(1).maybeSingle();
        if (access) targetEntityId = access.entity_id;
        else {
          const { data: ent } = await db.from('entities').select('id').eq('user_id', session.user.id).limit(1).maybeSingle();
          if (ent) targetEntityId = ent.id;
        }

        let subData = null;
        if (targetEntityId) {
          const { data } = await db.from('subscriptions').select('*').eq('entity_id', targetEntityId).maybeSingle();
          subData = data;
        }
        if (!subData) {
          const { data } = await db.from('subscriptions').select('*').eq('user_id', session.user.id).maybeSingle();
          subData = data;
        }

        if (subData) {
          setSubscription({
            id: subData.id,
            userId: subData.user_id,
            planId: subData.plan_id,
            status: subData.status,
            currentPeriodStart: subData.current_period_start,
            currentPeriodEnd: subData.current_period_end,
            cancelAtPeriodEnd: subData.cancel_at_period_end,
            paymentMethod: subData.payment_method,
          });
        } else {
          setSubscription(null);
        }
      } else {
        setProfile(null);
        setSubscription(null);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setProfile(null);
      setSubscription(null);
    } finally {
      setIsLoading(false);
      setIsSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN') fetchUser();
        else if (event === 'SIGNED_OUT') { setProfile(null); setSubscription(null); }
      }
    );
    return () => { authSubscription.unsubscribe(); };
  }, [fetchUser]);

  const signIn = async (email: string, password: string) => {
    try { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; toast.success('Login realizado!'); } catch (error: any) { toast.error(error.message); throw error; }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try { const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role: 'owner' } } }); if (error) throw error; toast.success('Conta criada!'); } catch (error: any) { toast.error(error.message); throw error; }
  };

  const signOut = async () => {
    try { const { error } = await supabase.auth.signOut(); if (error) throw error; toast.success('Logout realizado!'); } catch (error: any) { toast.error(error.message); }
  };

  return { 
    user, 
    session, 
    profile, 
    subscription, 
    isAuthenticated: !!user, // <-- RESTAURADO AQUI
    isLoading, 
    isSubscriptionLoading, 
    subscriptionError, 
    signIn, 
    signUp, 
    signOut, 
    refreshUser: fetchUser 
  };
}