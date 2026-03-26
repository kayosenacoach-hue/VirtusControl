import { useState, useEffect, useCallback } from 'react';
import { Entity } from '@/types/entity';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // RESTAURADO: Estados para o Dashboard funcionar
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  
  const { user } = useAuthContext();
  const db = supabase as any;

  const loadEntities = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      
      // 1. Busca as permissões de acesso do usuário
      const { data: accessData } = await db.from('user_entity_access').select('entity_id').eq('user_id', user.id);
      
      if (!accessData || accessData.length === 0) {
        setEntities([]);
        setIsLoading(false);
        return;
      }
      
      const entityIds = accessData.map((a: any) => a.entity_id);
      
      // 2. Busca as entidades que o usuário tem acesso
      const { data, error } = await db.from('entities').select('*').in('id', entityIds).order('name');
      if (error) throw error;
      
      const loadedEntities = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type as 'pf' | 'pj',
        document: d.document,
        color: d.color,
        createdAt: d.created_at,
      }));
      
      setEntities(loadedEntities);
      
      // RESTAURADO: Se não houver entidade selecionada, seleciona a primeira automaticamente
      if (loadedEntities.length > 0 && !selectedEntityId) {
        setSelectedEntityId(loadedEntities[0].id);
        setSelectedEntity(loadedEntities[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar entidades:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedEntityId, db]);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  // RESTAURADO: Função que o cabeçalho do Dashboard chama
  const selectEntity = useCallback((id: string | null) => {
    setSelectedEntityId(id);
    if (id) {
      const entity = entities.find(e => e.id === id);
      setSelectedEntity(entity || null);
    } else {
      setSelectedEntity(null);
    }
  }, [entities]);

  const addEntity = useCallback(async (entity: Omit<Entity, 'id' | 'createdAt'>) => {
    if (!user) return null;
    try {
      const payload = { user_id: user.id, name: entity.name, type: entity.type, document: entity.document, color: entity.color };
      const { data, error } = await db.from('entities').insert(payload).select().single();
      if (error) throw error;
      
      // Concede acesso automático a esta nova empresa
      await db.from('user_entity_access').insert({ user_id: user.id, entity_id: data.id });
      
      toast.success('Empresa/Pessoa adicionada!');
      loadEntities();
      return data;
    } catch (error: any) {
      toast.error('Erro ao adicionar entidade.');
      return null;
    }
  }, [user, loadEntities, db]);

  const updateEntity = useCallback(async (id: string, updates: Partial<Omit<Entity, 'id' | 'createdAt'>>) => {
    if (!user) return;
    try {
      const payload = { name: updates.name, type: updates.type, document: updates.document, color: updates.color };
      const { error } = await db.from('entities').update(payload).eq('id', id);
      if (error) throw error;
      toast.success('Entidade atualizada!');
      loadEntities();
    } catch (error) { toast.error('Erro ao atualizar a entidade.'); }
  }, [user, loadEntities, db]);

  const deleteEntity = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { data, error } = await db.from('entities').delete().eq('id', id).select();
      if (error) { toast.error('Não é possível excluir esta empresa pois existem dados associados.'); return; }
      if (data && data.length > 0) toast.success('Empresa removida com sucesso!');
      loadEntities();
    } catch (error: any) { toast.error('Erro ao tentar remover a empresa.'); }
  }, [user, loadEntities, db]);

  return { entities, selectedEntity, selectedEntityId, selectEntity, isLoading, addEntity, updateEntity, deleteEntity, refetch: loadEntities };
}