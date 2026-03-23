import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types/user';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Começa a carregar por padrão
  const [isAdmin, setIsAdmin] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const loadUserData = async (currentSession: Session | null) => {
      if (!mountedRef.current) return;

      try {
        // Bloqueia a tela enquanto atualiza dados se já estivermos logados
        if (currentSession?.user && !isLoading) setIsLoading(true);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // 1. Vai buscar o Perfil
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (!error && data && mountedRef.current) {
            setProfile(data as Profile);
            setIsAdmin(data.role === 'admin' || data.role === 'owner');
          }

          // 2. Tenta fazer o onboarding pendente (se existir)
          const pending = localStorage.getItem('pendingOnboarding');
          if (pending) {
            const { companyName, whatsappNumber, userName } = JSON.parse(pending);
            const { error: obError } = await supabase.rpc('onboard_new_user', {
              _company_name: companyName,
              _whatsapp_number: whatsappNumber,
            });
            
            if (!obError) {
              localStorage.removeItem('pendingOnboarding');
              toast.success('Empresa criada com sucesso!');
              // Notificação silenciosa
              supabase.functions.invoke('notify-new-signup', {
                body: { userName: userName || companyName, userPhone: whatsappNumber, companyName },
              }).catch(() => {});
            }
          }
        } else {
          // Sem sessão (Logout ou visitante)
          setProfile(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Erro silencioso na Autenticação:', err);
      } finally {
        // GARANTIA ABSOLUTA: Independentemente de sucesso ou erro, destranca o loading!
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    // Arranque inicial: Vê se tem sessão guardada
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session);
    });

    // "Ouve" as mudanças (Login, Logout, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        loadUserData(session);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole = 'owner') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName, role } },
      });
      if (error) throw error;
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
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsAdmin(false);
      toast.success('Logout realizado!');
      
      // ADICIONE ESTA LINHA PARA DESTRUIR O CACHE:
      window.location.replace('/auth');
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