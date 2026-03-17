import { useState, useEffect, useCallback } from 'react';
import { Entity } from '@/types/entity';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuthContext();

  // Load entities from database
  const loadEntities = useCallback(async () => {
    if (!user) {
      setEntities([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Transform database format to app format
      const transformed: Entity[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        document: row.document,
        type: row.type as Entity['type'],
        color: row.color,
        createdAt: row.created_at,
      }));

      setEntities(transformed);

      // Auto-select first entity if exists and none selected
      const storedSelected = localStorage.getItem('selected-entity-id');
      if (storedSelected && transformed.some(e => e.id === storedSelected)) {
        setSelectedEntityId(storedSelected);
      } else if (transformed.length > 0) {
        setSelectedEntityId(transformed[0].id);
        localStorage.setItem('selected-entity-id', transformed[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar entidades:', error);
      toast.error('Erro ao carregar entidades');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const selectEntity = useCallback((id: string | null) => {
    setSelectedEntityId(id);
    if (id) {
      localStorage.setItem('selected-entity-id', id);
    } else {
      localStorage.removeItem('selected-entity-id');
    }
  }, []);

  const addEntity = useCallback(async (entity: Omit<Entity, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar entidades');
      return null;
    }

    if (!isAdmin) {
      toast.error('Apenas administradores podem adicionar entidades');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('entities')
        .insert({
          name: entity.name,
          document: entity.document,
          type: entity.type,
          color: entity.color,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newEntity: Entity = {
        id: data.id,
        name: data.name,
        document: data.document,
        type: data.type as Entity['type'],
        color: data.color,
        createdAt: data.created_at,
      };

      setEntities(prev => [...prev, newEntity]);

      // Auto-select if first entity
      if (entities.length === 0) {
        setSelectedEntityId(newEntity.id);
        localStorage.setItem('selected-entity-id', newEntity.id);
      }

      toast.success(`${entity.type === 'pj' ? 'Empresa' : 'Pessoa'} adicionada com sucesso!`);
      return newEntity;
    } catch (error) {
      console.error('Erro ao adicionar entidade:', error);
      toast.error('Erro ao adicionar entidade');
      return null;
    }
  }, [user, isAdmin, entities.length]);

  const updateEntity = useCallback(async (id: string, updates: Partial<Omit<Entity, 'id' | 'createdAt'>>) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!isAdmin) {
      toast.error('Apenas administradores podem atualizar entidades');
      return;
    }

    try {
      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.document !== undefined) updateData.document = updates.document;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.color !== undefined) updateData.color = updates.color;

      const { error } = await supabase
        .from('entities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setEntities(prev => prev.map(entity =>
        entity.id === id ? { ...entity, ...updates } : entity
      ));

      toast.success('Entidade atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar entidade:', error);
      toast.error('Erro ao atualizar entidade');
    }
  }, [user, isAdmin]);

  const deleteEntity = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir entidades');
      return;
    }

    try {
      const { error } = await supabase
        .from('entities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntities(prev => {
        const updated = prev.filter(entity => entity.id !== id);
        
        // If deleted entity was selected, select first remaining
        if (selectedEntityId === id) {
          const newSelected = updated.length > 0 ? updated[0].id : null;
          setSelectedEntityId(newSelected);
          if (newSelected) {
            localStorage.setItem('selected-entity-id', newSelected);
          } else {
            localStorage.removeItem('selected-entity-id');
          }
        }
        
        return updated;
      });

      toast.success('Entidade removida com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir entidade:', error);
      toast.error('Erro ao excluir entidade');
    }
  }, [user, isAdmin, selectedEntityId]);

  const selectedEntity = entities.find(e => e.id === selectedEntityId) || null;

  return {
    entities,
    selectedEntity,
    selectedEntityId,
    isLoading,
    selectEntity,
    addEntity,
    updateEntity,
    deleteEntity,
    refetch: loadEntities,
  };
}
