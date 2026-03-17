import { useEntityContext } from '@/contexts/EntityContext';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Building2, User, BarChart3 } from 'lucide-react';
import { formatDocument } from '@/types/entity';

export function EntitySelector() {
  const { entities, selectedEntityId, selectEntity, selectedEntity } = useEntityContext();

  if (entities.length === 0) {
    return null;
  }

  return (
    <Select value={selectedEntityId || 'all'} onValueChange={(value) => selectEntity(value === 'all' ? null : value)}>
      <SelectTrigger className="w-full sm:w-[280px] h-11 bg-card border-border">
        <SelectValue placeholder="Selecione uma entidade">
          {selectedEntity ? (
            <div className="flex items-center gap-2">
              <div 
                className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `hsl(${selectedEntity.color})` }}
              >
                {selectedEntity.type === 'pj' ? (
                  <Building2 className="h-2.5 w-2.5 text-white" />
                ) : (
                  <User className="h-2.5 w-2.5 text-white" />
                )}
              </div>
              <span className="truncate">{selectedEntity.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary shrink-0" />
              <span>Consolidada</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-medium">Visão Consolidada</span>
          </div>
        </SelectItem>
        {entities.map((entity) => (
          <SelectItem key={entity.id} value={entity.id}>
            <div className="flex items-center gap-2">
              <div 
                className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `hsl(${entity.color})` }}
              >
                {entity.type === 'pj' ? (
                  <Building2 className="h-2.5 w-2.5 text-white" />
                ) : (
                  <User className="h-2.5 w-2.5 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{entity.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDocument(entity.document, entity.type)}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
