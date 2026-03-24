import { useState } from 'react';
import { useEntityContext } from '@/contexts/EntityContext';
import { useRecurringContext } from '@/contexts/RecurringContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { EntityForm } from '@/components/settings/EntityForm';
import { RecurringAccountForm } from '@/components/settings/RecurringAccountForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Settings as SettingsIcon, 
  Plus, 
  Building2, 
  User, 
  Pencil, 
  Trash2,
  RotateCcw,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Entity, formatDocument } from '@/types/entity';
import { RecurringAccount, RECURRENCE_LABELS } from '@/types/recurring';
import { CATEGORY_LABELS } from '@/types/expense';
import { Skeleton } from '@/components/ui/skeleton';
import { clearAllData } from '@/lib/clearAllData';
import { toast } from 'sonner';

export default function Settings() {
  const { entities, isLoading: isLoadingEntities, addEntity, updateEntity, deleteEntity } = useEntityContext();
  const { accounts, isLoading: isLoadingAccounts, addAccount, updateAccount, deleteAccount } = useRecurringContext();
  
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [editingAccount, setEditingAccount] = useState<RecurringAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEntity = async (data: Omit<Entity, 'id' | 'createdAt'>) => {
    setIsSubmitting(true);
    try {
      await addEntity(data);
      setIsAddEntityDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEntity = async (data: Omit<Entity, 'id' | 'createdAt'>) => {
    if (!editingEntity) return;
    setIsSubmitting(true);
    try {
      await updateEntity(editingEntity.id, data);
      setEditingEntity(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAccount = async (data: Omit<RecurringAccount, 'id' | 'createdAt'>) => {
    console.log("🟢 [Settings.tsx] O modal recebeu os dados para Adicionar Conta Fixa:", data);
    setIsSubmitting(true);
    try {
      const result = await addAccount(data);
      console.log("🟢 [Settings.tsx] Resultado do Hook:", result);
      setIsAddAccountDialogOpen(false);
    } catch (err) {
       console.error("🔴 [Settings.tsx] Erro ao gravar!", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAccount = async (data: Omit<RecurringAccount, 'id' | 'createdAt'>) => {
    if (!editingAccount) return;
    setIsSubmitting(true);
    try {
      await updateAccount(editingAccount.id, data);
      setEditingAccount(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingEntities || isLoadingAccounts;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
            <SettingsIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie empresas, pessoas e contas fixas
            </p>
          </div>
        </div>

        <Tabs defaultValue="entities" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entities" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresas/Pessoas
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Contas Fixas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddEntityDialogOpen} onOpenChange={setIsAddEntityDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Empresa/Pessoa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova Empresa/Pessoa</DialogTitle>
                  </DialogHeader>
                  <EntityForm
                    onSubmit={handleAddEntity}
                    isLoading={isSubmitting}
                    submitLabel="Adicionar"
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
               {entities.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground">Sem entidades.</div>
               ) : (
                 <div className="divide-y divide-border">
                   {entities.map(entity => (
                     <div key={entity.id} className="p-4 flex justify-between">
                       <p>{entity.name}</p>
                       <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingEntity(entity)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteEntity(entity.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </TabsContent>

          {/* A Aba de Contas */}
          <TabsContent value="accounts" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Conta Fixa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Conta Fixa</DialogTitle>
                  </DialogHeader>
                  {/* ESTE É O COMPONENTE QUE ESTÁ A FALHAR - VAMOS CORRIGIR NO PASSO 2 */}
                  <RecurringAccountForm
                    onSubmit={handleAddAccount}
                    isLoading={isSubmitting}
                    submitLabel="Adicionar"
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <RotateCcw className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-card-foreground">
                    Nenhuma conta fixa cadastrada
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-4">
                    Cadastre contas recorrentes como energia, internet, aluguel para associar automaticamente aos comprovantes
                  </p>
                  <Button onClick={() => setIsAddAccountDialogOpen(true)} className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeira Conta
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {accounts.map((account) => {
                    const entity = entities.find(e => e.id === account.entityId);
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                         <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${account.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                            <RotateCcw className={`h-6 w-6 ${account.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-semibold ${account.isActive ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                                {account.name}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {RECURRENCE_LABELS[account.recurrence] || account.recurrence}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon" onClick={() => deleteAccount(account.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}