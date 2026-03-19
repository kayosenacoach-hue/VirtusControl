import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { useEntityContext } from '@/contexts/EntityContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  FileText, 
  Image, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Building2,
  User,
  Check,
  X,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ExpenseCategory, PaymentMethod, PersonType, CATEGORY_LABELS } from '@/types/expense';
import { formatDocument } from '@/types/entity';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using unpkg CDN (more reliable for ES modules)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface CardInfo {
  lastDigits: string;
  dueDate: string;
  totalAmount: number;
  closingDate: string | null;
}

interface StatementTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  suggestedPersonType: PersonType;
  selectedPersonType: PersonType;
  entityId?: string;
  selected: boolean;
}

interface CreditCardStatementUploadProps {
  onComplete?: () => void;
}

export function CreditCardStatementUpload({ onComplete }: CreditCardStatementUploadProps) {
  const { addExpense } = useExpenseContext();
  const { entities } = useEntityContext();
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Password-related state
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const pjEntities = entities.filter(e => e.type === 'pj');
  const pfEntities = entities.filter(e => e.type === 'pf');

  // Convert PDF page to image
  const pdfPageToImage = async (page: pdfjsLib.PDFPageProxy): Promise<string> => {
    const scale = 2; // Higher scale for better quality
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Process PDF with optional password
  const processPdfWithPassword = async (file: File, password?: string): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password,
    });
    
    const pdf = await loadingTask.promise;
    const images: string[] = [];
    
    // Convert first few pages (usually statement is on first pages)
    const maxPages = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const imageData = await pdfPageToImage(page);
      images.push(imageData);
    }
    
    return images;
  };

  // Check if PDF needs password
  const checkPdfPassword = async (file: File): Promise<boolean> => {
    const arrayBuffer = await file.arrayBuffer();
    
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      await loadingTask.promise;
      return false; // No password needed
    } catch (err: any) {
      if (err.name === 'PasswordException') {
        return true; // Password required
      }
      throw err;
    }
  };

  const sendToAI = async (imageBase64: string, mimeType: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${API_URL}/analyze-credit-card-statement`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
    // ...
        body: JSON.stringify({
          imageBase64: imageBase64.split(',')[1] || imageBase64,
          mimeType,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao processar fatura');
    }

    return response.json();
  };

  // Send multiple pages to AI and combine results
  const sendMultiplePagesToAI = async (images: string[], mimeType: string) => {
    let allTransactions: any[] = [];
    let cardInfo: CardInfo | null = null;

    for (let i = 0; i < images.length; i++) {
      toast.info(`Processando página ${i + 1} de ${images.length}...`);
      
      try {
        const result = await sendToAI(images[i], mimeType);
        
        // Use card info from first page that has it
        if (!cardInfo && result.cardInfo && result.cardInfo.totalAmount > 0) {
          cardInfo = result.cardInfo;
        }
        
        // Combine transactions from all pages
        if (result.transactions && result.transactions.length > 0) {
          allTransactions = [...allTransactions, ...result.transactions];
        }
      } catch (err) {
        console.error(`Error processing page ${i + 1}:`, err);
        // Continue with other pages
      }
    }

    return {
      cardInfo: cardInfo || {
        lastDigits: '',
        dueDate: new Date().toISOString().split('T')[0],
        totalAmount: allTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
        closingDate: null,
      },
      transactions: allTransactions,
    };
  };

  const processStatement = async (file: File, pdfPassword?: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      let data: { cardInfo: CardInfo; transactions: any[] };

      if (file.type === 'application/pdf') {
        // Check if PDF needs password
        if (!pdfPassword) {
          const needsPwd = await checkPdfPassword(file);
          if (needsPwd) {
            setNeedsPassword(true);
            setIsProcessing(false);
            return;
          }
        }

        // Convert PDF to images (all pages)
        toast.info('Extraindo páginas do PDF...');
        const images = await processPdfWithPassword(file, pdfPassword);
        
        if (images.length === 0) {
          throw new Error('Não foi possível extrair imagens do PDF');
        }
        
        // Process all pages and combine results
        data = await sendMultiplePagesToAI(images, 'image/jpeg');
      } else {
        // Regular image file
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        data = await sendToAI(imageBase64, file.type);
      }
      
      setCardInfo(data.cardInfo);
      // Default payment date to the statement due date
      if (data.cardInfo?.dueDate) {
        setPaymentDate(data.cardInfo.dueDate);
      }
      setTransactions(
        data.transactions.map((tx: any, index: number) => ({
          ...tx,
          id: `tx-${index}-${Date.now()}`,
          selectedPersonType: tx.suggestedPersonType,
          selected: true,
        }))
      );

      setNeedsPassword(false);
      setPassword('');
      
      if (data.transactions.length > 0) {
        toast.success(`${data.transactions.length} transações extraídas da fatura!`);
      } else {
        toast.warning('Nenhuma transação encontrada. Verifique se a fatura contém transações visíveis.');
      }
    } catch (err: any) {
      if (err.name === 'PasswordException') {
        if (err.code === 1) {
          // Need password
          setNeedsPassword(true);
          setPasswordError(null);
        } else if (err.code === 2) {
          // Wrong password
          setPasswordError('Senha incorreta. Tente novamente.');
        }
      } else {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsProcessing(false);
      setIsUnlocking(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!file || !password.trim()) return;
    
    setIsUnlocking(true);
    setPasswordError(null);
    await processStatement(file, password);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
      setTransactions([]);
      setCardInfo(null);
      setNeedsPassword(false);
      setPassword('');
      setPasswordError(null);
      processStatement(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const toggleTransaction = (id: string) => {
    setTransactions(prev => prev.map(tx =>
      tx.id === id ? { ...tx, selected: !tx.selected } : tx
    ));
  };

  const updateTransactionPersonType = (id: string, personType: PersonType) => {
    setTransactions(prev => prev.map(tx =>
      tx.id === id ? { ...tx, selectedPersonType: personType, entityId: undefined } : tx
    ));
  };

  const updateTransactionEntity = (id: string, entityId: string | undefined) => {
    setTransactions(prev => prev.map(tx =>
      tx.id === id ? { ...tx, entityId } : tx
    ));
  };

  const selectAllForPersonType = (personType: PersonType) => {
    setTransactions(prev => prev.map(tx => ({
      ...tx,
      selected: tx.selectedPersonType === personType,
    })));
  };

  const setAllToPersonType = (personType: PersonType) => {
    setTransactions(prev => prev.map(tx => ({
      ...tx,
      selectedPersonType: personType,
      entityId: undefined,
    })));
  };

  const saveSelectedTransactions = async () => {
    const toSave = transactions.filter(tx => tx.selected);
    
    if (toSave.length === 0) {
      toast.error('Selecione pelo menos uma transação para salvar');
      return;
    }

    setIsSaving(true);

    try {
      // Group transactions by entityId + personType to create one expense per group
      const groups = new Map<string, typeof toSave>();
      
      for (const tx of toSave) {
        const key = `${tx.selectedPersonType}-${tx.entityId || 'none'}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(tx);
      }

      const cardSuffix = cardInfo?.lastDigits ? ` (cartão final ${cardInfo.lastDigits})` : ' (fatura de cartão)';
      let savedGroups = 0;

      for (const [, groupTxs] of groups) {
        const totalAmount = groupTxs.reduce((sum, tx) => sum + tx.amount, 0);
        const personType = groupTxs[0].selectedPersonType;
        const entityId = groupTxs[0].entityId;
        
        // Build description listing all transactions in the group
        const descriptions = groupTxs.map(tx => `${tx.description} (R$ ${tx.amount.toFixed(2)})`).join('; ');

        await addExpense({
          description: `Fatura cartão${cardSuffix}`,
          amount: totalAmount,
          category: groupTxs.length === 1 ? groupTxs[0].category : 'outros',
          date: paymentDate,
          paymentMethod: 'cartao_credito' as PaymentMethod,
          personType,
          entityId,
          isRecurring: false,
          notes: descriptions,
        });
        savedGroups++;
      }

      toast.success(`${savedGroups} despesa(s) lançada(s) em ${paymentDate.split('-').reverse().join('/')}!`);
      
      setTransactions(prev => prev.map(tx =>
        tx.selected ? { ...tx, selected: false } : tx
      ));

      onComplete?.();
    } catch (err) {
      console.error('Error saving expenses:', err);
      toast.error('Erro ao salvar despesas');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const selectedCount = transactions.filter(tx => tx.selected).length;
  const pjCount = transactions.filter(tx => tx.selectedPersonType === 'pj').length;
  const pfCount = transactions.filter(tx => tx.selectedPersonType === 'pf').length;
  const selectedTotal = transactions
    .filter(tx => tx.selected)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const clearAll = () => {
    setFile(null);
    setTransactions([]);
    setCardInfo(null);
    setError(null);
    setNeedsPassword(false);
    setPassword('');
    setPasswordError(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!file && (
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
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-card-foreground">
                {isDragActive ? 'Solte a fatura aqui' : 'Arraste sua fatura de cartão'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF ou imagem da fatura do cartão de crédito
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      <Dialog open={needsPassword} onOpenChange={(open) => !open && clearAll()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              PDF Protegido por Senha
            </DialogTitle>
            <DialogDescription>
              Esta fatura está protegida. Digite a senha para continuar (geralmente é seu CPF sem pontos ou data de nascimento).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="pdf-password">Senha do PDF</Label>
              <div className="relative">
                <Input
                  id="pdf-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  className={cn(passwordError && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearAll}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={!password.trim() || isUnlocking}
                className="flex-1 gradient-primary"
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Desbloqueando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Desbloquear
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Dica: A senha geralmente é seu CPF (só números) ou data de nascimento (ddmmaaaa)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing State */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-3 p-8 rounded-xl border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Extraindo transações da fatura...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isProcessing && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={clearAll} className="ml-auto">
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Card Info */}
      {cardInfo && !isProcessing && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-medium">
                Fatura do Cartão {cardInfo.lastDigits && `final ${cardInfo.lastDigits}`}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Vencimento: {new Date(cardInfo.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            <span>Total: <strong className="text-foreground">{formatCurrency(cardInfo.totalAmount)}</strong></span>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length > 0 && !isProcessing && (
        <div className="space-y-4">
          {/* Stats and bulk actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              {transactions.length} transações
            </Badge>
            <Badge className="gap-1 bg-primary/20 text-primary border-primary/30">
              <Building2 className="h-3 w-3" />
              {pjCount} PJ
            </Badge>
            <Badge className="gap-1 bg-secondary text-secondary-foreground">
              <User className="h-3 w-3" />
              {pfCount} PF
            </Badge>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setAllToPersonType('pj')}>
              Tudo PJ
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllToPersonType('pf')}>
              Tudo PF
            </Button>
          </div>

          {/* Transactions grid */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  tx.selected ? "bg-card" : "bg-muted/30 opacity-60"
                )}
              >
                <Checkbox
                  checked={tx.selected}
                  onCheckedChange={() => toggleTransaction(tx.id)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        <Badge variant="outline" className="text-xs py-0">
                          {CATEGORY_LABELS[tx.category]}
                        </Badge>
                      </div>
                    </div>
                    <span className="font-semibold whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>

                  {tx.selected && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Person Type Toggle */}
                      <div className="flex items-center rounded-lg border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateTransactionPersonType(tx.id, 'pj')}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                            tx.selectedPersonType === 'pj'
                              ? "bg-primary text-primary-foreground"
                              : "bg-background hover:bg-muted"
                          )}
                        >
                          <Building2 className="h-3 w-3" />
                          Empresa
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTransactionPersonType(tx.id, 'pf')}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                            tx.selectedPersonType === 'pf'
                              ? "bg-primary text-primary-foreground"
                              : "bg-background hover:bg-muted"
                          )}
                        >
                          <User className="h-3 w-3" />
                          Pessoal
                        </button>
                      </div>

                      {/* Entity selector */}
                      {tx.selectedPersonType === 'pj' && pjEntities.length > 0 && (
                        <Select
                          value={tx.entityId || 'none'}
                          onValueChange={(v) => updateTransactionEntity(tx.id, v === 'none' ? undefined : v)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[180px]">
                            <SelectValue placeholder="Selecionar empresa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem vínculo</SelectItem>
                            {pjEntities.map(entity => (
                              <SelectItem key={entity.id} value={entity.id}>
                                {entity.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {tx.selectedPersonType === 'pf' && pfEntities.length > 0 && (
                        <Select
                          value={tx.entityId || 'none'}
                          onValueChange={(v) => updateTransactionEntity(tx.id, v === 'none' ? undefined : v)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[180px]">
                            <SelectValue placeholder="Selecionar pessoa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem vínculo</SelectItem>
                            {pfEntities.map(entity => (
                              <SelectItem key={entity.id} value={entity.id}>
                                {entity.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary and save */}
          {/* Payment date + summary + save */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Label htmlFor="payment-date" className="text-sm text-muted-foreground whitespace-nowrap">
                Data de pagamento da fatura:
              </Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8 w-auto text-sm"
              />
              {cardInfo?.dueDate && (
                <span className="text-xs text-muted-foreground">
                  (vencimento: {new Date(cardInfo.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')})
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Selecionadas:</span>{' '}
                <strong>{selectedCount}</strong> de {transactions.length}
                <span className="text-muted-foreground ml-3">Total:</span>{' '}
                <strong className="text-primary">{formatCurrency(selectedTotal)}</strong>
              </div>
              <Button 
                onClick={saveSelectedTransactions}
                disabled={selectedCount === 0 || isSaving || !paymentDate}
                className="gradient-primary"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Lançar em {paymentDate ? new Date(paymentDate + 'T00:00:00').toLocaleDateString('pt-BR') : '...'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
