import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORY_LABELS, PAYMENT_METHOD_LABELS, PERSON_TYPE_LABELS } from '@/types/expense';
import { useEntityContext } from '@/contexts/EntityContext';
import { formatDocument } from '@/types/entity';

// SCHEMA SUPER SIMPLES: Sem validações automáticas de número que causam falhas silenciosas
const simpleExpenseSchema = z.object({
  description: z.string().min(1, 'A descrição é obrigatória'),
  amountRaw: z.string().min(1, 'O valor é obrigatório'),
  category: z.string(),
  date: z.date(),
  paymentMethod: z.string(),
  personType: z.string(),
  entityId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof simpleExpenseSchema>;

export function ExpenseForm({ onSubmit, initialData, isLoading = false, showEntitySelector = true }: any) {
  const { entities, selectedEntityId } = useEntityContext();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(simpleExpenseSchema),
    defaultValues: {
      description: initialData?.description || '',
      amountRaw: initialData?.amount ? String(initialData.amount).replace('.', ',') : '',
      category: initialData?.category || 'operacional',
      date: initialData?.date || new Date(),
      paymentMethod: initialData?.paymentMethod || 'pix',
      personType: initialData?.personType || 'pj',
      entityId: initialData?.entityId || selectedEntityId || 'all',
      isRecurring: initialData?.isRecurring ?? false,
      notes: initialData?.notes || '',
    },
  });

  const handleManualSubmit = async (values: FormValues) => {
    try {
      // 1. Converter o valor manualmente com segurança
      let finalAmount = parseFloat(values.amountRaw.replace(',', '.'));
      
      if (isNaN(finalAmount) || finalAmount <= 0) {
        alert("🔴 O formulário bloqueou o envio!\nMotivo: O valor da despesa deve ser maior que zero (ex: 150,50).");
        return;
      }

      // 2. Prepara os dados perfeitos
      const cleanData = {
        description: values.description,
        amount: finalAmount,
        category: values.category,
        date: format(values.date, 'yyyy-MM-dd'),
        paymentMethod: values.paymentMethod,
        personType: values.personType,
        entityId: values.entityId === 'all' ? undefined : values.entityId,
        isRecurring: values.isRecurring,
        notes: values.notes,
      };

      console.log("✅ Validação Frontend passou! Indo para o Pai...", cleanData);
      await onSubmit(cleanData);
      form.reset();

    } catch (err) {
      console.error(err);
    }
  };

  const onErrors = (errors: any) => {
    console.log("❌ ZOD BLOQUEOU O ENVIO:", errors);
    const campos = Object.keys(errors).map(k => `- ${k}`).join('\n');
    alert(`🔴 FALTAM DADOS!\nPreencha os seguintes campos obrigatórios:\n${campos}`);
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Descrição *</FormLabel>
              <FormControl><Input placeholder="Ex: Conta de energia" {...field} className="h-11" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="amountRaw" render={({ field }) => (
            <FormItem>
              <FormLabel>Valor (R$) *</FormLabel>
              <FormControl><Input type="text" placeholder="0,00" {...field} className="h-11" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("h-11 w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
            </FormItem>
          )} />

          <FormField control={form.control} name="paymentMethod" render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de Pagamento *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          <FormField control={form.control} name="personType" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Pessoa *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(PERSON_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          {showEntitySelector && entities.length > 0 && (
            <FormField control={form.control} name="entityId" render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa/Pessoa (opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                  <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="all">Nenhuma/Todas</SelectItem>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: `hsl(${entity.color})` }}/>
                          {entity.type === 'pj' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          <span>{entity.name}</span>
                          <span className="text-xs text-muted-foreground">({formatDocument(entity.document, entity.type)})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          )}

          <FormField control={form.control} name="isRecurring" render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
              <div>
                <FormLabel className="text-base">Despesa Recorrente</FormLabel>
                <p className="text-sm text-muted-foreground">Marque se é uma conta fixa/mensal</p>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Observações</FormLabel>
              <FormControl><Textarea placeholder="Opcional..." className="resize-none" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        {/* BOTÃO MÁGICO QUE DISPARA TUDO */}
        <Button 
          type="button" 
          onClick={form.handleSubmit(handleManualSubmit, onErrors)}
          className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity"
          disabled={isLoading}
        >
          {isLoading ? 'A gravar...' : 'Adicionar Despesa Agora'}
        </Button>
      </form>
    </Form>
  );
}