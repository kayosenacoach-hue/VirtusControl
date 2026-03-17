import { useState, useMemo } from 'react';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { useEntityContext } from '@/contexts/EntityContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { EntitySelector } from '@/components/layout/EntitySelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  List, 
  Search, 
  Download, 
  Trash2, 
  Pencil, 
  Filter,
  Calendar,
  Trash,
  Building2,
  User
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Expense, 
  ExpenseCategory, 
  PaymentMethod,
  CATEGORY_LABELS, 
  PAYMENT_METHOD_LABELS,
  PERSON_TYPE_LABELS 
} from '@/types/expense';
import { formatDocument } from '@/types/entity';
import { cn } from '@/lib/utils';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const categoryBadgeStyles: Record<string, string> = {
  operacional: 'bg-category-operacional/10 text-category-operacional border-category-operacional/30',
  pessoal: 'bg-category-pessoal/10 text-category-pessoal border-category-pessoal/30',
  marketing: 'bg-category-marketing/10 text-category-marketing border-category-marketing/30',
  fornecedores: 'bg-category-fornecedores/10 text-category-fornecedores border-category-fornecedores/30',
  impostos: 'bg-category-impostos/10 text-category-impostos border-category-impostos/30',
  equipamentos: 'bg-category-equipamentos/10 text-category-equipamentos border-category-equipamentos/30',
  outros: 'bg-category-outros/10 text-category-outros border-category-outros/30',
};

export default function ExpenseList() {
  const { expenses, isLoading, deleteExpense, updateExpense, clearAllExpenses } = useExpenseContext();
  const { entities, selectedEntityId } = useEntityContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get entity by id helper
  const getEntity = (entityId?: string) => entities.find(e => e.id === entityId);

  // Generate month options
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: 'all', label: 'Todos os meses' }];
    const months = new Set<string>();
    
    expenses.forEach((expense) => {
      const monthKey = format(parseISO(expense.date), 'yyyy-MM');
      months.add(monthKey);
    });

    Array.from(months)
      .sort((a, b) => b.localeCompare(a))
      .forEach((monthKey) => {
        const [year, month] = monthKey.split('-').map(Number);
        options.push({
          value: monthKey,
          label: format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR }),
        });
      });

    return options;
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Entity filter (from selector)
      if (selectedEntityId && expense.entityId !== selectedEntityId) {
        return false;
      }

      // Search filter
      if (searchQuery && !expense.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
        return false;
      }

      // Payment method filter
      if (paymentFilter !== 'all' && expense.paymentMethod !== paymentFilter) {
        return false;
      }

      // Month filter
      if (monthFilter !== 'all') {
        const [year, month] = monthFilter.split('-').map(Number);
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));
        const date = parseISO(expense.date);
        if (!isWithinInterval(date, { start, end })) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, categoryFilter, paymentFilter, monthFilter, selectedEntityId]);

  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Forma de Pagamento', 'Tipo Pessoa', 'Observações'];
    const rows = filteredExpenses.map((expense) => [
      format(parseISO(expense.date), 'dd/MM/yyyy'),
      expense.description,
      CATEGORY_LABELS[expense.category],
      expense.amount.toFixed(2).replace('.', ','),
      PAYMENT_METHOD_LABELS[expense.paymentMethod],
      expense.personType ? PERSON_TYPE_LABELS[expense.personType] : 'PJ',
      expense.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `despesas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Arquivo exportado com sucesso!');
  };

  const handleUpdate = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!editingExpense) return;
    
    setIsUpdating(true);
    try {
      await updateExpense(editingExpense.id, data);
      setEditingExpense(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
              <List className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Todas Despesas</h1>
              <p className="text-muted-foreground mt-1">
                {filteredExpenses.length} despesa{filteredExpenses.length !== 1 ? 's' : ''} encontrada{filteredExpenses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredExpenses.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={expenses.length === 0}>
                  <Trash className="h-4 w-4 mr-2" />
                  Limpar Tudo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar todas as despesas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todas as {expenses.length} despesas serão permanentemente removidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllExpenses}>
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Forma de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas formas</SelectItem>
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PAYMENT_METHOD_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger>
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <List className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-card-foreground">
                Nenhuma despesa encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {expenses.length === 0
                  ? 'Comece registrando sua primeira despesa'
                  : 'Tente ajustar os filtros'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="group">
                    <TableCell className="font-medium">
                      {format(parseISO(expense.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-card-foreground">
                          {expense.description}
                        </p>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {expense.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("border", categoryBadgeStyles[expense.category])}
                      >
                        {CATEGORY_LABELS[expense.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        expense.personType === 'pj' 
                          ? "bg-primary/10 text-primary border-primary/30" 
                          : "bg-secondary/50 text-secondary-foreground border-secondary"
                      )}>
                        {expense.personType === 'pj' ? 'PJ' : 'PF'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingExpense(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A despesa "{expense.description}" será permanentemente removida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteExpense(expense.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Despesa</DialogTitle>
            </DialogHeader>
            {editingExpense && (
              <ExpenseForm
                onSubmit={handleUpdate}
                isLoading={isUpdating}
                submitLabel="Salvar Alterações"
                initialData={{
                  description: editingExpense.description,
                  amount: editingExpense.amount,
                  category: editingExpense.category,
                  date: parseISO(editingExpense.date),
                  paymentMethod: editingExpense.paymentMethod,
                  personType: editingExpense.personType || 'pj',
                  notes: editingExpense.notes || '',
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
