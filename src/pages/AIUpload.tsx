import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { useEntityContext } from '@/contexts/EntityContext';
import { useRecurringContext } from '@/contexts/RecurringContext';
import { useMonthlyBillsSafe } from '@/contexts/MonthlyBillsContext';
import { MainLayout } from '@/components/layout/MainLayout';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Image, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  X,
  Files,
  RotateCcw,
  Check,
  Receipt,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ExpenseCategory, PaymentMethod, PersonType, Expense } from '@/types/expense';
import { formatDocument } from '@/types/entity';
import { parseISO, format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY_LABELS, PAYMENT_METHOD_LABELS, PERSON_TYPE_LABELS } from '@/types/expense';
import { RECURRENCE_LABELS } from '@/types/recurring';
import { CreditCardStatementUpload } from '@/components/ai-upload/CreditCardStatementUpload';

interface ExtractedData {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  personType: PersonType;
  notes: string;
}

interface FileProcessState {
  file: File;
  status: 'pending' | 'processing' | 'extracted' | 'saved' | 'error';
  extractedData?: ExtractedData;
  error?: string;
  entityId?: string;
  recurringAccountId?: string;
  isRecurring?: boolean;
}

export default function AIUpload() {
  const { addExpense } = useExpenseContext();
  const { entities, selectedEntityId } = useEntityContext();
  const { accounts } = useRecurringContext();
  const monthlyBillsContext = useMonthlyBillsSafe();
  const linkExpenseToBill = monthlyBillsContext?.linkExpenseToBill;
  
  const [files, setFiles] = useState<FileProcessState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [selectedEntityForBatch, setSelectedEntityForBatch] = useState<string>(selectedEntityId || '');
  const [editingFile, setEditingFile] = useState<FileProcessState | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtractedData & { entityId?: string; recurringAccountId?: string; isRecurring?: boolean }>>({});
  const [activeTab, setActiveTab] = useState<string>('receipts');

  const activeAccounts = accounts.filter(a => a.isActive);

  const getAccountsForEntity = (entityId?: string) => {
    if (!entityId) return activeAccounts;
    // contas sem entityId são "todas as entidades"
    return activeAccounts.filter(a => !a.entityId || a.entityId === entityId);
  };

  const processFile = async (file: File): Promise<ExtractedData> => {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: file.type,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao processar documento');
    }

    return response.json();
  };

  const processAllFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      
      setCurrentProcessingIndex(i);
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        const data = await processFile(files[i].file);
        
        // Try to match with recurring account
        const matchedAccount = activeAccounts.find(acc => 
          data.description.toLowerCase().includes(acc.name.toLowerCase()) ||
          acc.name.toLowerCase().includes(data.description.toLowerCase().split(' ')[0])
        );

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'extracted', 
            extractedData: data,
            entityId: selectedEntityForBatch || matchedAccount?.entityId,
            recurringAccountId: matchedAccount?.id,
            isRecurring: !!matchedAccount
          } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Erro desconhecido' 
          } : f
        ));
      }
    }

    setCurrentProcessingIndex(-1);
    setIsProcessing(false);
    toast.success('Processamento concluído! Revise os dados antes de salvar.');
  };

  const saveAllExtracted = async () => {
    const toSave = files.filter(f => f.status === 'extracted' && f.extractedData);
    
    for (const fileState of toSave) {
      if (!fileState.extractedData) continue;

      try {
        const expense = await addExpense({
          description: fileState.extractedData.description,
          amount: fileState.extractedData.amount,
          category: fileState.extractedData.category,
          date: fileState.extractedData.date,
          paymentMethod: fileState.extractedData.paymentMethod,
          personType: fileState.extractedData.personType || 'pj',
          entityId: fileState.entityId,
          recurringAccountId: fileState.recurringAccountId,
          isRecurring: fileState.isRecurring || false,
          notes: fileState.extractedData.notes,
        });

        // If linked to a recurring account, update the monthly bill
        if (fileState.recurringAccountId && fileState.isRecurring && linkExpenseToBill) {
          const expenseDate = new Date(fileState.extractedData.date);
          const month = expenseDate.getMonth() + 1;
          const year = expenseDate.getFullYear();
          const account = accounts.find(a => a.id === fileState.recurringAccountId);
          
          await linkExpenseToBill(
            fileState.recurringAccountId,
            month,
            year,
            expense.id,
            fileState.extractedData.amount,
            fileState.extractedData.date,
            account?.expectedDay
          );
        }

        setFiles(prev => prev.map(f => 
          f.file === fileState.file ? { ...f, status: 'saved' } : f
        ));
      } catch (error) {
        console.error('Error saving expense:', error);
      }
    }

    toast.success(`${toSave.length} despesa(s) salva(s) com sucesso!`);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileProcessState[] = acceptedFiles.map(file => ({
      file,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    disabled: isProcessing,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const openEditDialog = (fileState: FileProcessState) => {
    setEditingFile(fileState);
    setEditForm({
      ...fileState.extractedData,
      entityId: fileState.entityId,
      recurringAccountId: fileState.recurringAccountId,
      isRecurring: fileState.isRecurring,
    });
  };

  const saveEdit = () => {
    if (!editingFile) return;

    setFiles(prev => prev.map(f => 
      f.file === editingFile.file ? {
        ...f,
        extractedData: {
          description: editForm.description || '',
          amount: editForm.amount || 0,
          category: editForm.category || 'outros',
          date: editForm.date || new Date().toISOString().split('T')[0],
          paymentMethod: editForm.paymentMethod || 'pix',
          personType: editForm.personType || 'pj',
          notes: editForm.notes || '',
        },
        entityId: editForm.entityId,
        recurringAccountId: editForm.recurringAccountId,
        isRecurring: editForm.isRecurring,
      } : f
    ));

    setEditingFile(null);
    toast.success('Dados atualizados!');
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const extractedCount = files.filter(f => f.status === 'extracted').length;
  const savedCount = files.filter(f => f.status === 'saved').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Upload com IA</h1>
              <p className="text-muted-foreground mt-1">
                Envie comprovantes ou faturas de cartão para extração automática
              </p>
            </div>
          </div>
          {activeTab === 'receipts' && files.length > 0 && (
            <Button variant="outline" onClick={clearAll} disabled={isProcessing}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar Tudo
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receipts" className="gap-2">
              <Receipt className="h-4 w-4" />
              Comprovantes
            </TabsTrigger>
            <TabsTrigger value="credit-card" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Fatura de Cartão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipts" className="mt-6 space-y-6">
            {/* Entity selector for batch */}
            {entities.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                <Label className="text-sm font-medium">Entidade padrão para os comprovantes</Label>
                <Select value={selectedEntityForBatch || "none"} onValueChange={(v) => setSelectedEntityForBatch(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione a empresa/pessoa (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (definir individualmente)</SelectItem>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                          {entity.name} ({formatDocument(entity.document, entity.type)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Upload Area */}
            <div
              {...getRootProps()}
              className={cn(
                "relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50 hover:bg-card/80",
                isProcessing && "pointer-events-none opacity-70"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Files className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-card-foreground">
                    {isDragActive ? 'Solte os arquivos aqui' : 'Arraste e solte múltiplos arquivos'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou clique para selecionar (PDF, JPG, PNG)
                  </p>
                </div>
              </div>
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary" className="gap-1">
                    <Files className="h-3 w-3" />
                    {files.length} arquivo(s)
                  </Badge>
                  {pendingCount > 0 && (
                    <Badge variant="outline">{pendingCount} pendente(s)</Badge>
                  )}
                  {extractedCount > 0 && (
                    <Badge className="bg-warning/20 text-warning border-warning/30">
                      {extractedCount} extraído(s)
                    </Badge>
                  )}
                  {savedCount > 0 && (
                    <Badge className="bg-success/20 text-success border-success/30">
                      {savedCount} salvo(s)
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="destructive">{errorCount} erro(s)</Badge>
                  )}
                </div>

                {/* File cards */}
                <div className="grid gap-3">
                  {files.map((fileState, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 transition-colors",
                        fileState.status === 'saved' && "bg-success/5 border-success/30",
                        fileState.status === 'error' && "bg-destructive/5 border-destructive/30",
                        fileState.status === 'extracted' && "bg-warning/5 border-warning/30",
                        fileState.status === 'processing' && "bg-primary/5 border-primary/30"
                      )}
                    >
                      {/* File icon */}
                      <div className="flex-shrink-0">
                        {fileState.file.type.includes('pdf') ? (
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        ) : (
                          <Image className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground truncate">
                          {fileState.file.name}
                        </p>
                        {fileState.status === 'processing' && (
                          <p className="text-sm text-primary flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processando...
                          </p>
                        )}
                        {fileState.status === 'error' && (
                          <p className="text-sm text-destructive">{fileState.error}</p>
                        )}
                        {fileState.status === 'extracted' && fileState.extractedData && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>{fileState.extractedData.description}</strong> - {formatCurrency(fileState.extractedData.amount)}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {CATEGORY_LABELS[fileState.extractedData.category]}
                              </Badge>
                              {fileState.entityId && (
                                <Badge variant="secondary" className="text-xs">
                                  {entities.find(e => e.id === fileState.entityId)?.name}
                                </Badge>
                              )}
                              {fileState.isRecurring && (
                                <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                                  Recorrente
                                </Badge>
                              )}
                            </div>

                            {/* Pergunta de vínculo direto no card (sem precisar abrir o modal) */}
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Vincular este comprovante a uma conta fixa (opcional)
                                </span>
                              </div>

                              {getAccountsForEntity(fileState.entityId).length > 0 ? (
                                <Select
                                  value={fileState.recurringAccountId || 'none'}
                                  onValueChange={(v) => {
                                    setFiles(prev => prev.map(f => {
                                      if (f.file !== fileState.file) return f;
                                      const selectedId = v === 'none' ? undefined : v;
                                      const account = selectedId ? accounts.find(a => a.id === selectedId) : undefined;
                                      return {
                                        ...f,
                                        recurringAccountId: selectedId,
                                        isRecurring: !!selectedId,
                                        // se o usuário ainda não escolheu entidade, herda da conta fixa
                                        entityId: f.entityId || account?.entityId || f.entityId,
                                      };
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione a conta fixa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Não vincular</SelectItem>
                                    {getAccountsForEntity(fileState.entityId).map((account) => (
                                      <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                        {account.averageAmount
                                          ? ` (média: R$ ${account.averageAmount.toFixed(2)})`
                                          : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  Nenhuma conta fixa ativa cadastrada para esta entidade.
                                </p>
                              )}

                              {fileState.recurringAccountId && (
                                <p className="text-xs text-success">
                                  Ao salvar, esta despesa dará baixa como paga em "{activeAccounts.find(a => a.id === fileState.recurringAccountId)?.name}".
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {fileState.status === 'saved' && (
                          <p className="text-sm text-success flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Salvo com sucesso
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {fileState.status === 'extracted' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(fileState)}
                          >
                            Editar
                          </Button>
                        )}
                        {fileState.status !== 'saved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            disabled={isProcessing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  {pendingCount > 0 && (
                    <Button 
                      onClick={processAllFiles}
                      disabled={isProcessing}
                      className="flex-1 gradient-primary"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando {currentProcessingIndex + 1} de {files.filter(f => f.status === 'pending' || f.status === 'processing').length}...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Processar {pendingCount} Arquivo(s) com IA
                        </>
                      )}
                    </Button>
                  )}
                  {extractedCount > 0 && (
                    <Button 
                      onClick={saveAllExtracted}
                      disabled={isProcessing}
                      className="flex-1 bg-success hover:bg-success/90"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Salvar {extractedCount} Despesa(s)
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="credit-card" className="mt-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Importar Fatura de Cartão</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Envie a fatura do seu cartão de crédito e classifique cada transação como despesa da empresa (PJ) ou pessoal (PF)
                </p>
              </div>
              <CreditCardStatementUpload />
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editingFile} onOpenChange={(open) => !open && setEditingFile(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Dados Extraídos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <Input 
                  value={editForm.description || ''} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editForm.amount || ''} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input 
                    type="date"
                    value={editForm.date || ''} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select 
                    value={editForm.category} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, category: v as ExpenseCategory }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {CATEGORY_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Pessoa</Label>
                  <Select 
                    value={editForm.personType} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, personType: v as PersonType }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PERSON_TYPE_LABELS) as PersonType[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {PERSON_TYPE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {entities.length > 0 && (
                <div>
                  <Label>Empresa/Pessoa</Label>
                  <Select 
                    value={editForm.entityId || "none"} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, entityId: v === "none" ? undefined : v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seção destacada para vincular a conta recorrente */}
              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Receipt className="h-5 w-5" />
                  <Label className="text-primary font-medium">Vincular a Conta Cadastrada</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se este comprovante é de uma conta fixa (ex: energia, internet), vincule aqui para atualizar o valor pago do mês.
                </p>
                
                {activeAccounts.length > 0 ? (
                  <Select 
                    value={editForm.recurringAccountId || "none"} 
                    onValueChange={(v) => setEditForm(prev => ({ 
                      ...prev, 
                      recurringAccountId: v === "none" ? undefined : v,
                      isRecurring: v !== "none"
                    }))}
                  >
                    <SelectTrigger className="border-primary/30">
                      <SelectValue placeholder="Selecione a conta fixa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não vincular a nenhuma conta</SelectItem>
                      {activeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                          {account.averageAmount
                            ? ` (média: R$ ${account.averageAmount.toFixed(2)})`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma conta fixa cadastrada. Vá em Configurações para adicionar.
                  </p>
                )}

                {editForm.recurringAccountId && editForm.recurringAccountId !== "none" && (
                  <div className="flex items-center gap-2 text-xs text-success bg-success/10 px-3 py-2 rounded-md">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Ao salvar, este valor será registrado como pagamento de{' '}
                      <strong>{activeAccounts.find(a => a.id === editForm.recurringAccountId)?.name}</strong>{' '}
                      para o mês correspondente à data da despesa.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea 
                  value={editForm.notes || ''} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <Button onClick={saveEdit} className="w-full gradient-primary">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
