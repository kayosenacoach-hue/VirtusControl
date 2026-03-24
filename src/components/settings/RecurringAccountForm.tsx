import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RecurringAccount } from '@/types/recurring';
import { useEntityContext } from '@/contexts/EntityContext';

interface RecurringAccountFormProps {
  onSubmit: (data: Omit<RecurringAccount, 'id' | 'createdAt'>) => Promise<void>;
  initialData?: any;
  isLoading?: boolean;
  submitLabel?: string;
}

export function RecurringAccountForm({ onSubmit, isLoading, submitLabel = 'Salvar' }: RecurringAccountFormProps) {
  const { entities } = useEntityContext();
  
  // Estado local cru em vez de react-hook-form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('operacional');
  const [recurrence, setRecurrence] = useState<any>('mensal');
  const [entityId, setEntityId] = useState<string | undefined>(undefined);
  const [expectedDay, setExpectedDay] = useState('');
  const [averageAmount, setAverageAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // A função bruta de envio. Salta validações complexas e envia à força.
  const handleForceSubmit = () => {
    if (!name) {
      alert("Por favor, preencha pelo menos o Nome da Conta.");
      return;
    }

    console.log("Forçando envio para o modal...");
    
    onSubmit({
      name,
      category,
      recurrence,
      entityId: entityId === "all" ? undefined : entityId,
      expectedDay: expectedDay ? Number(expectedDay) : undefined,
      averageAmount: averageAmount ? Number(averageAmount.replace(',', '.')) : undefined,
      notes: notes || undefined,
      isActive,
    });
  };

  return (
    <div className="space-y-4 pt-4">
      
      <div>
        <label className="text-sm font-medium mb-1 block">Nome da Conta *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Conta de Energia" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Categoria *</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="operacional">Operacional</SelectItem>
              <SelectItem value="pessoal">Pessoal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
           <label className="text-sm font-medium mb-1 block">Recorrência *</label>
           <Select value={recurrence} onValueChange={setRecurrence}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Dia (Ex: 10)</label>
          <Input value={expectedDay} onChange={(e) => setExpectedDay(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
          <Input value={averageAmount} onChange={(e) => setAverageAmount(e.target.value)} />
        </div>
      </div>

      <div>
         <label className="text-sm font-medium mb-1 block">Conta Ativa</label>
         <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {/* BOTÃO OBRIGADO A FUNCIONAR */}
      <Button 
        type="button" 
        onClick={handleForceSubmit}
        disabled={isLoading}
        className="w-full mt-4"
      >
        {isLoading ? 'A gravar...' : submitLabel}
      </Button>

    </div>
  );
}