import { useState, useEffect, useCallback } from 'react';
import { Entity } from '@/types/entity';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  // A OPÇÃO NUCLEAR: Desliga o TypeScript completamente para as chamadas à BD neste ficheiro
  const db = supabase as any;

  const loadEntities = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { data, error } = await db.from('entities').select('*').eq('user_id', user.id).order('name');
      if (error) throw error;
      
      setEntities((data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type as 'pf' | 'pj',
        document: d.document,
        color: d.color,
        createdAt: d.created_at,
      })));
    } catch (error) {
      console.error('Erro ao carregar entidades:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  const addEntity = useCallback(async (entity: Omit<Entity, 'id' | 'createdAt'>) => {
    if (!user) return null;
    try {
      const payload = {
        user_id: user.id,
        name: entity.name,
        type: entity.type,
        document: entity.document,
        color: entity.color,
      };
      
      const { data, error } = await db.from('entities').insert(payload).select().single();

      if (error) throw error;
      
      toast.success('Empresa/Pessoa adicionada!');
      loadEntities();
      return data;
    } catch (error: any) {
      console.error('Erro ao adicionar entidade:', error);
      toast.error('Erro ao adicionar entidade. Verifique os dados e tente novamente.');
      return null;
    }
  }, [user, loadEntities]);

  const updateEntity = useCallback(async (id: string, updates: Partial<Omit<Entity, 'id' | 'createdAt'>>) => {
    if (!user) return;
    try {
      const payload = {
        name: updates.name,
        type: updates.type,
        document: updates.document,
        color: updates.color,
      };

      const { error } = await db.from('entities').update(payload).eq('id', id).eq('user_id', user.id);
      
      if (error) throw error;
      toast.success('Entidade atualizada!');
      loadEntities();
    } catch (error) {
      console.error('Erro ao atualizar entidade:', error);
      toast.error('Erro ao atualizar a entidade.');
    }
  }, [user, loadEntities]);

  const deleteEntity = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { data, error } = await db.from('entities').delete().eq('id', id).eq('user_id', user.id).select();
      
      if (error) {
        console.error('Bloqueio do banco de dados:', error);
        toast.error('Não é possível excluir esta empresa pois existem despesas ou contas associadas a ela.');
        return;
      }
      
      if (data && data.length > 0) {
        toast.success('Empresa removida com sucesso!');
      }

      loadEntities();
    } catch (error: any) {
      console.error('Erro ao excluir entidade:', error);
      toast.error('Ocorreu um erro ao tentar remover a empresa.');
    }
  }, [user, loadEntities]);

  return { entities, isLoading, addEntity, updateEntity, deleteEntity, refetch: loadEntities };
}