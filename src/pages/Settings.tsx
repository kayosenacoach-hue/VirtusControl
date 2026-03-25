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
  Settings as SettingsIcon, 
  Plus, 
  Building2, 
  RotateCcw,
  Trash2
} from 'lucide-react';
import { Entity } from '@/types/entity';
import { RecurringAccount, RECURRENCE_LABELS } from '@/types/recurring';
import { Skeleton } from '@/components/ui/skeleton';

export default function Settings() {
  const { entities, isLoading: isLoadingEntities, addEntity, deleteEntity } = useEntityContext();
  const { accounts, isLoading: isLoadingAccounts, addAccount, deleteAccount } = useRecurringContext();
  
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
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

  const handleAddAccount = async (data: Omit<RecurringAccount, 'id' | 'createdAt'>) => {
    setIsSubmitting(true);
    try {
      await addAccount(data);
      setIsAddAccountDialogOpen(false); // Fecha o modal após o sucesso comprovado
    } catch (e) {
      console.error(e);
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
            <p className="text-muted-foreground mt-1">Gerencie empresas, pessoas e contas fixas</p>
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
                  <Button className="gradient-primary"><Plus className="h-4 w-4 mr-2" /> Adicionar Entidade</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Nova Entidade</DialogTitle></DialogHeader>
                  <EntityForm onSubmit={handleAddEntity} isLoading={isSubmitting} submitLabel="Salvar" />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
               {entities.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground">Sem entidades cadastradas.</div>
               ) : (
                 <div className="divide-y divide-border">
                   {entities.map(entity => (
                     <div key={entity.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                       <p className="font-medium">{entity.name}</p>
                       <Button variant="ghost" size="icon" onClick={() => deleteEntity(entity.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </TabsContent>

          {/* ABA CONTAS FIXAS */}
          <TabsContent value="accounts" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Conta Fixa
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="max-w-md max-h-[90vh] overflow-y-auto"
                  onPointerDownOutside={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle>Nova Conta Fixa</DialogTitle>
                  </DialogHeader>
                  <RecurringAccountForm
                    onSubmit={handleAddAccount}
                    isLoading={isSubmitting}
                    submitLabel="Adicionar Conta Agora"
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
                  <p className="text-lg font-medium text-card-foreground">Nenhuma conta fixa cadastrada</p>
                  <Button onClick={() => setIsAddAccountDialogOpen(true)} className="gradient-primary mt-4">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Primeira Conta
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                         <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${account.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                            <RotateCcw className={`h-6 w-6 ${account.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{account.name}</p>
                              <Badge variant="outline" className="text-xs">{RECURRENCE_LABELS[account.recurrence] || account.recurrence}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteAccount(account.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}