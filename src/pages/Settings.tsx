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
    setIsSubmitting(true);
    try {
      await addAccount(data);
      setIsAddAccountDialogOpen(false);
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
        {/* Header */}
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

        {/* Tabs */}
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

          {/* Entities Tab */}
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
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-card-foreground">
                    Nenhuma empresa ou pessoa cadastrada
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Adicione sua primeira entidade para começar
                  </p>
                  <Button onClick={() => setIsAddEntityDialogOpen(true)} className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeira Entidade
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {entities.map((entity) => (
                    <div
                      key={entity.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `hsl(${entity.color})` }}
                        >
                          {entity.type === 'pj' ? (
                            <Building2 className="h-6 w-6 text-white" />
                          ) : (
                            <User className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-card-foreground">{entity.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {entity.type.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDocument(entity.document, entity.type)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEntity(entity)}
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
                              <AlertDialogTitle>Excluir {entity.type === 'pj' ? 'empresa' : 'pessoa'}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. "{entity.name}" será permanentemente removida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteEntity(entity.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Recurring Accounts Tab */}
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
                                {RECURRENCE_LABELS[account.recurrence]}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {CATEGORY_LABELS[account.category]}
                              </Badge>
                              {!account.isActive && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Inativa
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {account.expectedDay && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Dia {account.expectedDay}
                                </span>
                              )}
                              {entity && (
                                <span className="flex items-center gap-1">
                                  <div 
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: `hsl(${entity.color})` }}
                                  />
                                  {entity.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAccount(account)}
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
                                <AlertDialogTitle>Excluir conta fixa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. "{account.name}" será permanentemente removida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteAccount(account.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Clear All Data Section */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 mt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Zona de Perigo</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Limpar todos os dados do sistema. Esta ação não pode ser desfeita.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Todos os Dados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover permanentemente todas as despesas, entidades, contas fixas e histórico de pagamentos. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await clearAllData();
                        toast.success('Todos os dados foram removidos!');
                        window.location.reload();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, limpar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Edit Entity Dialog */}
        <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar {editingEntity?.type === 'pj' ? 'Empresa' : 'Pessoa'}</DialogTitle>
            </DialogHeader>
            {editingEntity && (
              <EntityForm
                onSubmit={handleUpdateEntity}
                isLoading={isSubmitting}
                submitLabel="Salvar Alterações"
                initialData={{
                  name: editingEntity.name,
                  document: editingEntity.document,
                  type: editingEntity.type,
                  color: editingEntity.color,
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Conta Fixa</DialogTitle>
            </DialogHeader>
            {editingAccount && (
              <RecurringAccountForm
                onSubmit={handleUpdateAccount}
                isLoading={isSubmitting}
                submitLabel="Salvar Alterações"
                initialData={{
                  name: editingAccount.name,
                  category: editingAccount.category,
                  entityId: editingAccount.entityId,
                  recurrence: editingAccount.recurrence,
                  expectedDay: editingAccount.expectedDay,
                  averageAmount: editingAccount.averageAmount,
                  notes: editingAccount.notes,
                  isActive: editingAccount.isActive,
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
