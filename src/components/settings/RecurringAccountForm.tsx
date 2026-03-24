import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RecurringAccount, RecurrenceType, RECURRENCE_LABELS } from '@/types/recurring';
import { ExpenseCategory, CATEGORY_LABELS } from '@/types/expense';
import { useEntityContext } from '@/contexts/EntityContext';
import { Building2, User } from 'lucide-react';

const accountFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
  category: z.enum(['operacional', 'pessoal', 'marketing', 'fornecedores', 'impostos', 'equipamentos', 'outros'] as const),
  entityId: z.string().optional(),
  recurrence: z.enum(['pontual', 'mensal', 'semanal', 'quinzenal', 'anual'] as const),
  expectedDay: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? undefined : parsed;
    },
    z.number().min(1, 'Mínimo dia 1').max(31, 'Máximo dia 31').optional()
  ),
  averageAmount: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(',', '.'));
        return isNaN(parsed) ? undefined : parsed;
      }
      return Number(val);
    },
    z.number().min(0, 'Não pode ser negativo').optional()
  ),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
  isActive: z.boolean(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface RecurringAccountFormProps {
  onSubmit: (data: Omit<RecurringAccount, 'id' | 'createdAt'>) => Promise<void>;
  initialData?: Partial<AccountFormValues>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function RecurringAccountForm({ 
  onSubmit, 
  initialData, 
  isLoading = false,
  submitLabel = 'Salvar'
}: RecurringAccountFormProps) {
  const { entities } = useEntityContext();
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || 'operacional',
      entityId: initialData?.entityId || undefined,
      recurrence: initialData?.recurrence || 'mensal',
      expectedDay: initialData?.expectedDay || undefined,
      averageAmount: initialData?.averageAmount || undefined,
      notes: initialData?.notes || '',
      isActive: initialData?.isActive ?? true,
    },
  });

  const selectedRecurrence = form.watch('recurrence');

  const handleSubmit = async (values: AccountFormValues) => {
    try {
      console.log("Tentando enviar dados para o Supabase (SEM FORM):", values);
      await onSubmit({
        name: values.name,
        category: values.category,
        entityId: values.entityId || undefined,
        recurrence: values.recurrence,
        expectedDay: values.expectedDay || undefined,
        averageAmount: values.averageAmount || undefined,
        notes: values.notes || undefined,
        isActive: values.isActive,
      });
      form.reset();
      console.log("Sucesso ao enviar!");
    } catch (error) {
      console.error("ERRO AO ENVIAR PARA O SUPABASE:", error);
    }
  };

  const handleError = (errors: any) => {
    console.error("ERRO DE VALIDAÇÃO (O Formulário barrou o envio):", errors);
  };

  return (
    <Form {...form}>
      {/* SUBSTITUÍMOS O <form> POR UMA <div> PARA MATAR O RELOAD NATIVO */}
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Conta *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Conta de Energia, Internet, Aluguel"
                  {...field}
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {CATEGORY_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recurrence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recorrência *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {RECURRENCE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {entities.length > 0 && (
          <FormField
            control={form.control}
            name="entityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa/Pessoa (opcional)</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "all" ? undefined : v)} value={field.value || 'all'}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Todas as entidades" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">Todas as entidades</SelectItem>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: `hsl(${entity.color})` }}
                          />
                          {entity.type === 'pj' ? (
                            <Building2 className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span>{entity.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {selectedRecurrence !== 'pontual' && (
            <FormField
              control={form.control}
              name="expectedDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia de Vencimento</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ex: 10"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="averageAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Médio (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="0,00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Informações adicionais..."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <FormLabel className="text-base">Conta Ativa</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Contas inativas não aparecem nas sugestões
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* O BOTÃO AGORA DISPARA A FUNÇÃO DO REACT DIRETAMENTE PELO ONCLICK */}
        <Button 
          type="button" 
          onClick={form.handleSubmit(handleSubmit, handleError)}
          className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity"
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </Form>
  );
}