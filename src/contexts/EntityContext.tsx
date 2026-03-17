import React, { createContext, useContext, ReactNode } from 'react';
import { useEntities } from '@/hooks/useEntities';
import { Entity } from '@/types/entity';

interface EntityContextType {
  entities: Entity[];
  selectedEntity: Entity | null;
  selectedEntityId: string | null;
  isLoading: boolean;
  selectEntity: (id: string | null) => void;
  addEntity: (entity: Omit<Entity, 'id' | 'createdAt'>) => Promise<Entity | null>;
  updateEntity: (id: string, updates: Partial<Omit<Entity, 'id' | 'createdAt'>>) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const entityData = useEntities();

  return (
    <EntityContext.Provider value={entityData}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntityContext() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error('useEntityContext must be used within an EntityProvider');
  }
  return context;
}
