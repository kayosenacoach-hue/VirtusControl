import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types/user';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;
        
        if (data && mountedRef.current) {
          setProfile(data as Profile);
          setIsAdmin(data.role === 'admin' || data.role === 'owner');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    const runPendingOnboarding = async () => {
      const pending = localStorage.getItem('pendingOnboarding');
      if (!pending) return;
      
      try {
        const { companyName, whatsappNumber, userName } = JSON.parse(pending);
        const { error } = await supabase.rpc('onboard_new_user', {
          _company_name: companyName,
          _whatsapp_number: whatsappNumber,
        });
        
        if (error) {
          console.error('Pending onboarding error:', error);
        } else {
          localStorage.removeItem('pendingOnboarding');
          toast.success('Empresa criada com sucesso!');
          
          // Send WhatsApp notifications (fire and forget)
          supabase.functions.invoke('notify-new-signup', {
            body: {
              userName: userName || companyName,
              userPhone: whatsappNumber,
              companyName: companyName,
            },
          }).catch((err) => console.error('Notification error:', err));
        }
      } catch (e) {
        console.error('Error running pending onboarding:', e);
      }
    };

    const initSession = async (sessionData: Session | null) => {
      if (!mountedRef.current) return;
      setSession(sessionData);
      setUser(sessionData?.user ?? null);
      if (sessionData?.user) {
        await fetchProfile(sessionData.user.id);
        await runPendingOnboarding();
      }
      if (mountedRef.current) setIsLoading(false);
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initSession(session);
    });

    // Listen for auth changes (no await inside callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            if (!mountedRef.current) return;
            fetchProfile(session.user.id).then(() => runPendingOnboarding());
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole = 'employee') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, role },
        },
      });
      if (error) throw error;
      toast.success('Conta criada com sucesso!');
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Login realizado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (error: any) {
      console.warn('Sign out error:', error.message);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsAdmin(false);
      toast.success('Logout realizado!');
    }
  };

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at'>>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Perfil atualizado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
      throw error;
    }
  };

  const refetchProfile = () => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data as Profile);
        setIsAdmin(data.role === 'admin' || data.role === 'owner');
      }
    });
  };

  return {
    user, profile, session, isLoading, isAdmin,
    isAuthenticated: !!session,
    signUp, signIn, signOut, updateProfile, refetchProfile,
  };
}
