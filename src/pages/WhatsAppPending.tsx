import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { useEntityContext } from '@/contexts/EntityContext';
import { useRecurringContext } from '@/contexts/RecurringContext';
import { useMonthlyBillsContext } from '@/contexts/MonthlyBillsContext';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Check, 
  Trash2, 
  Edit, 
  Image as ImageIcon,
  Calendar,
  Building2,
  DollarSign,
  Loader2,
  RefreshCw,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExpenseCategory, CATEGORY_LABELS } from '@/types/expense';
import { Json } from '@/integrations/supabase/types';
import { formatDocument } from '@/types/entity';

interface ExtractedData {
  description?: string;
  amount?: number;
  category?: string;
  date?: string;
  supplier?: string;
  document_number?: string;
}

interface PendingExpense {
  id: string;
  phone: string;
  extracted_data: ExtractedData;
  file_url: string | null;
  processed_at: string;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
}

interface EditableData {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  entityId: string;
  recurringAccountId: string;
}

export default function WhatsAppPending() {
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<PendingExpense | null>(null);
  const [editData, setEditData] = useState<EditableData>({
    description: '',
    amount: 0,
    category: 'outros',
    date: '',
    entityId: '',
    recurringAccountId: '',
  });
  
  // Track inline selections for each pending expense
  const [inlineSelections, setInlineSelections] = useState<Record<string, { entityId: string; recurringAccountId: string }>>({});

  const { addExpense } = useExpenseContext();
  const { entities, selectedEntityId } = useEntityContext();
  const { accounts: recurringAccounts } = useRecurringContext();
  const { linkExpenseToBill } = useMonthlyBillsContext();
  const { toast } = useToast();
  
  const activeAccounts = recurringAccounts.filter(a => a.isActive);
  
  const getAccountsForEntity = (entityId?: string) => {
    if (!entityId) return activeAccounts;
    return activeAccounts.filter(a => !a.entityId || a.entityId === entityId);
  };
  
  const updateInlineSelection = (pendingId: string, field: 'entityId' | 'recurringAccountId', value: string) => {
    setInlineSelections(prev => ({
      ...prev,
      [pendingId]: {
        ...prev[pendingId],
        [field]: value === 'none' ? '' : value,
        // Reset recurring account if entity changes
        ...(field === 'entityId' ? { recurringAccountId: '' } : {}),
      }
    }));
  };
  
  const getInlineSelection = (pendingId: string) => {
    return inlineSelections[pendingId] || { entityId: selectedEntityId || '', recurringAccountId: '' };
  };

  const parseExtractedData = (data: Json): ExtractedData => {
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return data as ExtractedData;
    }
    return {};
  };

  const fetchPendingExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_whatsapp_expenses')
        .select('*')
        .is('claimed_by', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse the data with proper typing
      const parsedData: PendingExpense[] = (data || []).map(item => ({
        ...item,
        extracted_data: parseExtractedData(item.extracted_data),
      }));
      
      setPendingExpenses(parsedData);
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as despesas pendentes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingExpenses();
  }, []);

  const mapCategoryToExpenseCategory = (category?: string): ExpenseCategory => {
    if (!category) return 'outros';
    const categoryMap: Record<string, ExpenseCategory> = {
      'Alimentação': 'operacional',
      'Transporte': 'operacional',
      'Hospedagem': 'operacional',
      'Material de Escritório': 'equipamentos',
      'Tecnologia': 'equipamentos',
      'Marketing': 'marketing',
      'Serviços': 'fornecedores',
      'Utilities': 'operacional',
      'Saúde': 'pessoal',
      'Educação': 'pessoal',
      'Outros': 'outros',
    };
    return categoryMap[category] || 'outros';
  };

  const openEditDialog = (pending: PendingExpense) => {
    setSelectedPending(pending);
    setEditData({
      description: pending.extracted_data.description || '',
      amount: pending.extracted_data.amount || 0,
      category: mapCategoryToExpenseCategory(pending.extracted_data.category),
      date: pending.extracted_data.date || format(new Date(), 'yyyy-MM-dd'),
      entityId: selectedEntityId || '',
      recurringAccountId: '',
    });
    setEditDialogOpen(true);
  };

  const saveAsExpense = async (pending: PendingExpense, data: EditableData) => {
    setSaving(pending.id);
    try {
      // Add the expense
      await addExpense({
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date,
        paymentMethod: 'pix',
        personType: 'pj',
        entityId: data.entityId || undefined,
        recurringAccountId: data.recurringAccountId || undefined,
        isRecurring: !!data.recurringAccountId,
        notes: pending.extracted_data.supplier 
          ? `Fornecedor: ${pending.extracted_data.supplier}${pending.extracted_data.document_number ? ` | Doc: ${pending.extracted_data.document_number}` : ''}`
          : undefined,
      });

      // If linked to recurring account, link expense to monthly bill
      if (data.recurringAccountId) {
        const expenseDate = new Date(data.date);
        const recurringAccount = recurringAccounts.find(r => r.id === data.recurringAccountId);
        if (recurringAccount) {
          await linkExpenseToBill(
            recurringAccount.id,
            expenseDate.getMonth() + 1,
            expenseDate.getFullYear(),
            '', // expenseId not available yet
            data.amount,
            data.date,
            recurringAccount.expectedDay
          );
        }
      }

      // Mark as claimed
      const { error: updateError } = await supabase
        .from('pending_whatsapp_expenses')
        .update({
          claimed_by: (await supabase.auth.getUser()).data.user?.id,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', pending.id);

      if (updateError) throw updateError;

      // Remove from list
      setPendingExpenses(prev => prev.filter(p => p.id !== pending.id));
      setEditDialogOpen(false);
      setSelectedPending(null);

      toast({
        title: 'Sucesso!',
        description: 'Despesa salva com sucesso.',
      });
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a despesa.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const deletePending = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pending_whatsapp_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPendingExpenses(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'Removido',
        description: 'Pendência removida com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting pending:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a pendência.',
        variant: 'destructive',
      });
    }
  };

  const quickSave = async (pending: PendingExpense) => {
    const selection = getInlineSelection(pending.id);
    const data: EditableData = {
      description: pending.extracted_data.description || 'Despesa WhatsApp',
      amount: pending.extracted_data.amount || 0,
      category: mapCategoryToExpenseCategory(pending.extracted_data.category),
      date: pending.extracted_data.date || format(new Date(), 'yyyy-MM-dd'),
      entityId: selection.entityId,
      recurringAccountId: selection.recurringAccountId,
    };
    await saveAsExpense(pending, data);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pendentes do WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Despesas recebidas pelo WhatsApp aguardando aprovação
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchPendingExpenses} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingExpenses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                Nenhuma despesa pendente
              </h3>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Envie uma foto de comprovante pelo WhatsApp para começar
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingExpenses.map((pending) => (
              <Card key={pending.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Image Preview */}
                    {pending.file_url && (
                      <div className="md:w-48 h-48 md:h-auto bg-muted flex-shrink-0">
                        <img
                          src={pending.file_url}
                          alt="Comprovante"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {pending.extracted_data.description || 'Despesa'}
                          </h3>
                          {pending.extracted_data.supplier && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Building2 className="h-3 w-3" />
                              {pending.extracted_data.supplier}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(pending.extracted_data.amount || 0)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline">
                          {pending.extracted_data.category || 'Outros'}
                        </Badge>
                        {pending.extracted_data.date && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(pending.extracted_data.date), 'dd/MM/yyyy')}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-green-600">
                          📱 {pending.phone.replace(/^55/, '+55 ').replace(/(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mb-3">
                        Recebido em {format(new Date(pending.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>

                      {/* Inline Entity & Recurring Account Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Empresa
                          </Label>
                          <Select
                            value={getInlineSelection(pending.id).entityId || 'none'}
                            onValueChange={(v) => updateInlineSelection(pending.id, 'entityId', v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {entities.map((entity) => (
                                <SelectItem key={entity.id} value={entity.id}>
                                  {entity.name} ({formatDocument(entity.document, entity.type)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            Conta Fixa
                          </Label>
                          <Select
                            value={getInlineSelection(pending.id).recurringAccountId || 'none'}
                            onValueChange={(v) => updateInlineSelection(pending.id, 'recurringAccountId', v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {getAccountsForEntity(getInlineSelection(pending.id).entityId).map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => quickSave(pending)}
                          disabled={saving === pending.id}
                        >
                          {saving === pending.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(pending)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deletePending(pending.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar e Salvar Despesa</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.amount}
                    onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={editData.category}
                  onValueChange={(value: ExpenseCategory) => setEditData({ ...editData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={editData.entityId}
                  onValueChange={(value) => setEditData({ ...editData, entityId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta Fixa (opcional)</Label>
                <Select
                  value={editData.recurringAccountId}
                  onValueChange={(value) => setEditData({ ...editData, recurringAccountId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a uma conta fixa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {recurringAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => selectedPending && saveAsExpense(selectedPending, editData)}
                disabled={saving === selectedPending?.id}
              >
                {saving === selectedPending?.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Salvar Despesa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
