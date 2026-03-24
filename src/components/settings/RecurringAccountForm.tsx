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
  isLoading?: boolean;
  submitLabel?: string;
}

export function RecurringAccountForm({ onSubmit, isLoading, submitLabel = 'Salvar' }: RecurringAccountFormProps) {
  const { entities } = useEntityContext();
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('operacional');
  const [recurrence, setRecurrence] = useState<any>('mensal');
  const [entityId, setEntityId] = useState<string | undefined>(undefined);
  const [expectedDay, setExpectedDay] = useState('');
  const [averageAmount, setAverageAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleForceSubmit = () => {
    if (!name.trim()) {
      alert("Por favor, preencha o Nome da Conta.");
      return;
    }

    // Filtro seguro para evitar que texto estrague a Base de Dados
    const safeExpectedDay = expectedDay && !isNaN(Number(expectedDay)) ? Number(expectedDay) : undefined;
    const safeAverageAmount = averageAmount && !isNaN(Number(averageAmount.replace(',', '.'))) ? Number(averageAmount.replace(',', '.')) : undefined;

    onSubmit({
      name: name.trim(),
      category,
      recurrence,
      entityId: entityId === "all" ? undefined : entityId,
      expectedDay: safeExpectedDay,
      averageAmount: safeAverageAmount,
      notes: notes.trim() || undefined,
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
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="fornecedores">Fornecedores</SelectItem>
              <SelectItem value="impostos">Impostos</SelectItem>
              <SelectItem value="equipamentos">Equipamentos</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
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
              <SelectItem value="quinzenal">Quinzenal</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {entities.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-1 block">Empresa/Pessoa (Opcional)</label>
          <Select value={entityId || "all"} onValueChange={(v) => setEntityId(v === "all" ? undefined : v)}>
            <SelectTrigger><SelectValue placeholder="Todas as entidades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Dia de Vencimento</label>
          <Input value={expectedDay} onChange={(e) => setExpectedDay(e.target.value)} placeholder="Ex: 10" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Valor Médio (R$)</label>
          <Input value={averageAmount} onChange={(e) => setAverageAmount(e.target.value)} placeholder="0,00" />
        </div>
      </div>

      <div>
         <label className="text-sm font-medium mb-1 block">Observações</label>
         <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </div>

      <div className="flex items-center justify-between border p-3 rounded-md">
         <label className="text-sm font-medium">Conta Ativa</label>
         <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <Button type="button" onClick={handleForceSubmit} disabled={isLoading} className="w-full mt-4 h-12 gradient-primary font-semibold text-base">
        {isLoading ? 'A gravar...' : submitLabel}
      </Button>
    </div>
  );
}