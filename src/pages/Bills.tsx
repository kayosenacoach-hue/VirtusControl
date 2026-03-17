import { useState, useEffect } from 'react';
import { useRecurringContext } from '@/contexts/RecurringContext';
import { useMonthlyBillsContext } from '@/contexts/MonthlyBillsContext';
import { useEntityContext } from '@/contexts/EntityContext';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  User,
  RefreshCw,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_LABELS } from '@/types/expense';
import { BILL_STATUS_LABELS, BillStatus } from '@/types/recurring';

export default function Bills() {
  const { accounts } = useRecurringContext();
  const { 
    bills, 
    isLoading, 
    generateMonthlyBills, 
    markAsPaid,
    getBillsForPeriod,
    deleteBill
  } = useMonthlyBillsContext();
  const { entities, selectedEntityId } = useEntityContext();
  const { addExpense } = useExpenseContext();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [payDialog, setPayDialog] = useState<{ billId: string; accountName: string; expected: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Filter accounts by selected entity.
  // If the account has no entityId, treat it as "all entities" and include it too.
  const filteredAccounts = selectedEntityId
    ? accounts.filter(a => a.isActive && (a.entityId === selectedEntityId || !a.entityId))
    : accounts.filter(a => a.isActive);

  // Get bills for current period
  const monthBills = getBillsForPeriod(currentMonth, currentYear);
  
  // Match bills with accounts
  const billsWithAccounts = filteredAccounts.map(account => {
    const bill = monthBills.find(b => b.recurringAccountId === account.id);
    return { account, bill };
  });

  const pendingBills = billsWithAccounts.filter(({ bill }) => !bill || bill.status === 'pending');
  const overdueBills = billsWithAccounts.filter(({ bill }) => bill?.status === 'overdue');
  const paidBills = billsWithAccounts.filter(({ bill }) => bill?.status === 'paid');

  // Totals
  const totalExpected = filteredAccounts.reduce((sum, a) => sum + (a.averageAmount || 0), 0);
  const totalPaid = paidBills.reduce((sum, { bill }) => sum + (bill?.actualAmount || 0), 0);
  const totalPending = pendingBills.reduce((sum, { account }) => sum + (account.averageAmount || 0), 0) +
    overdueBills.reduce((sum, { bill }) => sum + (bill?.expectedAmount || 0), 0);

  // Generate bills for the month if not exists
  const handleGenerateBills = async () => {
    setIsGenerating(true);
    try {
      await generateMonthlyBills(
        filteredAccounts.map(a => ({
          id: a.id,
          expectedDay: a.expectedDay,
          averageAmount: a.averageAmount,
        })),
        currentMonth,
        currentYear
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate bills ONLY when there are NO bills at all for the month (first time)
  // This prevents re-generating bills that were explicitly deleted
  useEffect(() => {
    if (!isLoading && filteredAccounts.length > 0) {
      const existingBills = getBillsForPeriod(currentMonth, currentYear);
      // Only generate if there are NO bills for this month (never generated before)
      if (existingBills.length === 0) {
        handleGenerateBills();
      }
    }
  }, [currentMonth, currentYear, isLoading, filteredAccounts.length]);

  const handlePayBill = async () => {
    if (!payDialog || !payAmount) return;

    const bill = monthBills.find(b => b.id === payDialog.billId);
    if (!bill) return;

    const account = accounts.find(a => a.id === bill.recurringAccountId);
    if (!account) return;

    // Create expense record
    const expense = await addExpense({
      description: `${account.name} - ${format(currentDate, 'MMMM yyyy', { locale: ptBR })}`,
      amount: parseFloat(payAmount),
      category: account.category,
      date: payDate,
      paymentMethod: 'pix',
      personType: 'pj',
      entityId: account.entityId,
      recurringAccountId: account.id,
      isRecurring: true,
    });

    // Mark bill as paid
    await markAsPaid(payDialog.billId, parseFloat(payAmount), payDate, expense.id);

    setPayDialog(null);
    setPayAmount('');
  };

  const openPayDialog = (billId: string, accountName: string, expectedAmount: number) => {
    setPayDialog({ billId, accountName, expected: expectedAmount });
    setPayAmount(expectedAmount.toString());
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const getStatusIcon = (status?: BillStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status?: BillStatus) => {
    const s = status || 'pending';
    return (
      <Badge
        variant="outline"
        className={cn(
          s === 'paid' && 'bg-success/10 text-success border-success/30',
          s === 'overdue' && 'bg-destructive/10 text-destructive border-destructive/30',
          s === 'pending' && 'bg-warning/10 text-warning border-warning/30'
        )}
      >
        {getStatusIcon(s)}
        <span className="ml-1">{BILL_STATUS_LABELS[s]}</span>
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
              <Receipt className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Contas</h1>
              <p className="text-muted-foreground mt-1">
                Controle de contas a pagar e pagas
              </p>
            </div>
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-40 text-center font-medium">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateBills}
              disabled={isGenerating}
              className="ml-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Previsto</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalExpected)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pago</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
                </div>
                <Clock className="h-8 w-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vencido</p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(overdueBills.reduce((sum, { bill }) => sum + (bill?.expectedAmount || 0), 0))}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({pendingBills.length + overdueBills.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Pagas ({paidBills.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Receipt className="h-4 w-4" />
              Todas ({billsWithAccounts.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contas Pendentes e Vencidas</CardTitle>
                <CardDescription>
                  Contas que precisam ser pagas neste mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                {[...overdueBills, ...pendingBills].length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mb-2 text-success" />
                    <p>Todas as contas estão pagas!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conta</TableHead>
                        <TableHead>Entidade</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor Previsto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...overdueBills, ...pendingBills].map(({ account, bill }) => {
                        const entity = entities.find(e => e.id === account.entityId);
                        return (
                          <TableRow key={account.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{account.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {CATEGORY_LABELS[account.category]}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {entity ? (
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
                                  <span className="text-sm">{entity.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {bill?.dueDate ? (
                                <span className={cn(
                                  bill.status === 'overdue' && 'text-destructive font-medium'
                                )}>
                                  {format(new Date(bill.dueDate), 'dd/MM/yyyy')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Dia {account.expectedDay || 1}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(bill?.expectedAmount || account.averageAmount || 0)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(bill?.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => bill && openPayDialog(
                                    bill.id, 
                                    account.name, 
                                    bill.expectedAmount || account.averageAmount || 0
                                  )}
                                  disabled={!bill}
                                >
                                  Pagar
                                </Button>
                                {bill && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Isso irá remover este registro de conta do mês. Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteBill(bill.id)}>
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paid Tab */}
          <TabsContent value="paid" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contas Pagas</CardTitle>
                <CardDescription>
                  Contas quitadas neste mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paidBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Receipt className="h-8 w-8 mb-2" />
                    <p>Nenhuma conta paga ainda</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conta</TableHead>
                        <TableHead>Entidade</TableHead>
                        <TableHead>Pago em</TableHead>
                        <TableHead>Valor Previsto</TableHead>
                        <TableHead>Valor Pago</TableHead>
                        <TableHead>Diferença</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidBills.map(({ account, bill }) => {
                        const entity = entities.find(e => e.id === account.entityId);
                        const diff = (bill?.actualAmount || 0) - (bill?.expectedAmount || 0);
                        return (
                          <TableRow key={account.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{account.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {CATEGORY_LABELS[account.category]}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {entity ? (
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: `hsl(${entity.color})` }}
                                  />
                                  <span className="text-sm">{entity.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {bill?.paidDate && format(new Date(bill.paidDate), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(bill?.expectedAmount || 0)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(bill?.actualAmount || 0)}
                            </TableCell>
                            <TableCell>
                              <div className={cn(
                                "flex items-center gap-1",
                                diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : "text-muted-foreground"
                              )}>
                                {diff > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : diff < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : null}
                                {diff !== 0 ? formatCurrency(Math.abs(diff)) : '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {bill && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Isso irá remover este registro de conta do mês. Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteBill(bill.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Tab */}
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Todas as Contas do Mês</CardTitle>
                <CardDescription>
                  Visão completa das contas de {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billsWithAccounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Receipt className="h-8 w-8 mb-2" />
                    <p>Nenhuma conta cadastrada</p>
                    <p className="text-sm">Vá em Configurações para adicionar contas fixas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conta</TableHead>
                        <TableHead>Entidade</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Previsto</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billsWithAccounts.map(({ account, bill }) => {
                        const entity = entities.find(e => e.id === account.entityId);
                        return (
                          <TableRow key={account.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{account.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {CATEGORY_LABELS[account.category]}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {entity ? (
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: `hsl(${entity.color})` }}
                                  />
                                  <span className="text-sm">{entity.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {bill?.dueDate ? (
                                format(new Date(bill.dueDate), 'dd/MM/yyyy')
                              ) : (
                                <span className="text-muted-foreground">Dia {account.expectedDay || 1}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(bill?.expectedAmount || account.averageAmount || 0)}
                            </TableCell>
                            <TableCell>
                              {bill?.actualAmount ? formatCurrency(bill.actualAmount) : '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(bill?.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              {bill && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Isso irá remover este registro de conta do mês. Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteBill(bill.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pay Dialog */}
        <Dialog open={!!payDialog} onOpenChange={(open) => !open && setPayDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pagar Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Registrar pagamento de: <strong>{payDialog?.accountName}</strong>
              </p>
              <div className="space-y-2">
                <Label>Valor Pago (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0,00"
                />
                {payDialog && parseFloat(payAmount || '0') !== payDialog.expected && (
                  <p className="text-xs text-muted-foreground">
                    Valor esperado: {formatCurrency(payDialog.expected)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handlePayBill} disabled={!payAmount}>
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
