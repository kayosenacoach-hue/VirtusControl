import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEntityContext } from '@/contexts/EntityContext';
import { CATEGORY_LABELS } from '@/types/expense';
import { RECURRENCE_LABELS } from '@/types/recurring';

// SCHEMA ULTRA SIMPLIFICADO: Tudo o que é número entra como string para evitar crash do Zod
const simpleSchema = z.object({
  name: z.string().min(1, 'O Nome é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  entityId: z.string().optional(),
  recurrence: z.string().min(1, 'Recorrência é obrigatória'),
  expectedDayRaw: z.string().optional(), 
  averageAmountRaw: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof simpleSchema>;

export function RecurringAccountForm({ onSubmit, isLoading, submitLabel = 'Salvar' }: any) {
  const { entities } = useEntityContext();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(simpleSchema),
    defaultValues: {
      name: '',
      category: 'operacional',
      entityId: 'all',
      recurrence: 'mensal',
      expectedDayRaw: '',
      averageAmountRaw: '',
      notes: '',
      isActive: true,
    },
  });

  const handleManualSubmit = async (values: FormValues) => {
    try {
      console.log("✅ Validação passou! Dados brutos:", values);

      // Conversão manual e segura dos números
      let finalDay = undefined;
      if (values.expectedDayRaw && values.expectedDayRaw.trim() !== '') {
        finalDay = parseInt(values.expectedDayRaw);
      }

      let finalAmount = undefined;
      if (values.averageAmountRaw && values.averageAmountRaw.trim() !== '') {
        // Troca vírgula por ponto e converte
        finalAmount = parseFloat(values.averageAmountRaw.replace(',', '.'));
      }

      const cleanData = {
        name: values.name,
        category: values.category as any,
        entityId: values.entityId === 'all' ? undefined : values.entityId,
        recurrence: values.recurrence as any,
        expectedDay: isNaN(finalDay as any) ? undefined : finalDay,
        averageAmount: isNaN(finalAmount as any) ? undefined : finalAmount,
        notes: values.notes,
        isActive: values.isActive,
      };

      console.log("📦 Pacote limpo pronto para o Hook:", cleanData);
      await onSubmit(cleanData);
      form.reset();

    } catch (err) {
      console.error("Erro no formulário:", err);
    }
  };

  const onErrors = (errors: any) => {
    console.log("❌ O ZOD BLOQUEOU O ENVIO:", errors);
    alert("Preencha os campos obrigatórios corretamente.");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleManualSubmit, onErrors)} className="space-y-4 pt-4">
        
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nome da Conta *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          <FormField control={form.control} name="recurrence" render={({ field }) => (
            <FormItem>
              <FormLabel>Recorrência *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        {entities.length > 0 && (
          <FormField control={form.control} name="entityId" render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="expectedDayRaw" render={({ field }) => (
            <FormItem><FormLabel>Dia (Ex: 10)</FormLabel><FormControl><Input {...field} placeholder="Opcional" /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="averageAmountRaw" render={({ field }) => (
            <FormItem><FormLabel>Valor Médio (R$)</FormLabel><FormControl><Input {...field} placeholder="0,00" /></FormControl></FormItem>
          )} />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
        )} />

        <FormField control={form.control} name="isActive" render={({ field }) => (
          <FormItem className="flex items-center justify-between border p-3 rounded-md">
            <FormLabel>Conta Ativa</FormLabel>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}