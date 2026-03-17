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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Entity, EntityType, ENTITY_TYPE_LABELS, ENTITY_COLORS, validateDocument } from '@/types/entity';
import { cn } from '@/lib/utils';

const entityFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
  document: z.string().min(1, 'Documento é obrigatório'),
  type: z.enum(['pj', 'pf'] as const),
  color: z.string().min(1, 'Cor é obrigatória'),
}).refine((data) => validateDocument(data.document, data.type), {
  message: 'Documento inválido',
  path: ['document'],
});

type EntityFormValues = z.infer<typeof entityFormSchema>;

interface EntityFormProps {
  onSubmit: (data: Omit<Entity, 'id' | 'createdAt'>) => Promise<void>;
  initialData?: Partial<EntityFormValues>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function EntityForm({ 
  onSubmit, 
  initialData, 
  isLoading = false,
  submitLabel = 'Salvar'
}: EntityFormProps) {
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      document: initialData?.document || '',
      type: initialData?.type || 'pj',
      color: initialData?.color || ENTITY_COLORS[0].value,
    },
  });

  const selectedType = form.watch('type');
  const selectedColor = form.watch('color');

  const handleSubmit = async (values: EntityFormValues) => {
    await onSubmit({
      name: values.name,
      document: values.document.replace(/\D/g, ''),
      type: values.type,
      color: values.color,
    });
    form.reset();
  };

  const formatDocumentInput = (value: string, type: EntityType) => {
    const cleaned = value.replace(/\D/g, '');
    if (type === 'pj') {
      // CNPJ mask
      return cleaned
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      // CPF mask
      return cleaned
        .slice(0, 11)
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="PJ ou PF" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {ENTITY_TYPE_LABELS[key]}
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{selectedType === 'pj' ? 'Razão Social' : 'Nome Completo'} *</FormLabel>
              <FormControl>
                <Input
                  placeholder={selectedType === 'pj' ? 'Empresa LTDA' : 'João da Silva'}
                  {...field}
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{selectedType === 'pj' ? 'CNPJ' : 'CPF'} *</FormLabel>
              <FormControl>
                <Input
                  placeholder={selectedType === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
                  value={formatDocumentInput(field.value, selectedType)}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cor de Identificação *</FormLabel>
              <div className="grid grid-cols-4 gap-3">
                {ENTITY_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => field.onChange(color.value)}
                    className={cn(
                      "h-12 rounded-lg transition-all duration-200 flex items-center justify-center",
                      selectedColor === color.value 
                        ? "ring-2 ring-offset-2 ring-foreground scale-105" 
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: `hsl(${color.value})` }}
                    title={color.name}
                  >
                    {selectedColor === color.value && (
                      <div className="h-3 w-3 rounded-full bg-white" />
                    )}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity"
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
