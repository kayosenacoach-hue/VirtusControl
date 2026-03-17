import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserEntityAccess, AppRole } from '@/types/user';
import { toast } from 'sonner';

export function useUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [userEntityAccess, setUserEntityAccess] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as Profile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const fetchUserEntityAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('user_entity_access')
        .select('*');

      if (error) throw error;
      
      // Group by user_id
      const accessMap: Record<string, string[]> = {};
      (data || []).forEach((access: UserEntityAccess) => {
        if (!accessMap[access.user_id]) {
          accessMap[access.user_id] = [];
        }
        accessMap[access.user_id].push(access.entity_id);
      });
      
      setUserEntityAccess(accessMap);
    } catch (error) {
      console.error('Error fetching user entity access:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchUsers(), fetchUserEntityAccess()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const createUser = async (email: string, password: string, fullName: string, role: AppRole): Promise<{ id: string } | null> => {
    try {
      // Create user via auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) throw error;
      
      await fetchUsers();
      toast.success('Usuário criado com sucesso!');
      
      // Return the user id if available
      if (data?.user?.id) {
        return { id: data.user.id };
      }
      return null;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário');
      throw error;
    }
  };

  const updateUserRole = async (userId: string, role: AppRole) => {
    try {
      // Update profile role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update or insert user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: role 
        }, { 
          onConflict: 'user_id,role' 
        });

      if (roleError) throw roleError;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toast.success('Função do usuário atualizada!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar função');
      throw error;
    }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
      toast.success(isActive ? 'Usuário ativado!' : 'Usuário desativado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar status');
      throw error;
    }
  };

  const assignEntityToUser = async (userId: string, entityId: string, assignedBy: string) => {
    try {
      const { error } = await supabase
        .from('user_entity_access')
        .insert({ user_id: userId, entity_id: entityId, assigned_by: assignedBy });

      if (error) throw error;

      setUserEntityAccess(prev => ({
        ...prev,
        [userId]: [...(prev[userId] || []), entityId]
      }));
      toast.success('Entidade atribuída!');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Usuário já tem acesso a esta entidade');
      } else {
        toast.error(error.message || 'Erro ao atribuir entidade');
      }
      throw error;
    }
  };

  const removeEntityFromUser = async (userId: string, entityId: string) => {
    try {
      const { error } = await supabase
        .from('user_entity_access')
        .delete()
        .eq('user_id', userId)
        .eq('entity_id', entityId);

      if (error) throw error;

      setUserEntityAccess(prev => ({
        ...prev,
        [userId]: (prev[userId] || []).filter(id => id !== entityId)
      }));
      toast.success('Acesso removido!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover acesso');
      throw error;
    }
  };

  const getUserEntities = (userId: string): string[] => {
    return userEntityAccess[userId] || [];
  };

  return {
    users,
    isLoading,
    createUser,
    updateUserRole,
    toggleUserActive,
    assignEntityToUser,
    removeEntityFromUser,
    getUserEntities,
    refetch: () => Promise.all([fetchUsers(), fetchUserEntityAccess()]),
  };
}
