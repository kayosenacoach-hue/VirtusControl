import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEntityContext } from '@/contexts/EntityContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Users as UsersIcon,
  UserPlus,
  Shield,
  Building2,
  User,
  Loader2,
  X,
  Plus,
  ShieldCheck,
  UserCog,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppRole, MenuPermission, MENU_LABELS, ALL_MENUS } from '@/types/user';
import { formatDocument } from '@/types/entity';
import { Navigate } from 'react-router-dom';

export default function Users() {
  const { user, isAdmin, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { users, isLoading, createUser, updateUserRole, toggleUserActive, assignEntityToUser, removeEntityFromUser, getUserEntities } = useUsers();
  const { entities } = useEntityContext();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // New user form - reorganized
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('employee');
  const [newUserEntityId, setNewUserEntityId] = useState<string>('');
  const [newUserMenus, setNewUserMenus] = useState<MenuPermission[]>(['dashboard', 'expense_list']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
        </div>
      </MainLayout>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newUser = await createUser(newUserEmail, newUserPassword, newUserName, newUserRole);
      
      // Assign entity if selected and role is employee
      if (newUser && newUserRole === 'employee' && newUserEntityId && user) {
        await assignEntityToUser(newUser.id, newUserEntityId, user.id);
      }
      
      // TODO: Save menu permissions when backend supports it
      
      setIsCreateDialogOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserName('');
    setNewUserRole('employee');
    setNewUserEntityId('');
    setNewUserMenus(['dashboard', 'expense_list']);
  };

  const handleAssignEntity = async (entityId: string) => {
    if (!selectedUserId || !user) return;
    await assignEntityToUser(selectedUserId, entityId, user.id);
  };

  const handleRemoveEntity = async (userId: string, entityId: string) => {
    await removeEntityFromUser(userId, entityId);
  };

  const openAssignDialog = (userId: string) => {
    setSelectedUserId(userId);
    setIsAssignDialogOpen(true);
  };

  const toggleMenu = (menu: MenuPermission) => {
    setNewUserMenus(prev => 
      prev.includes(menu) 
        ? prev.filter(m => m !== menu)
        : [...prev, menu]
    );
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const userEntities = selectedUserId ? getUserEntities(selectedUserId) : [];
  const availableEntities = entities.filter(e => !userEntities.includes(e.id));

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl gradient-primary">
              <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-foreground">Usuários</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Gerencie usuários e permissões de acesso
              </p>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Defina o acesso e credenciais do novo usuário
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-6">
                {/* Step 1: Role */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">1. Tipo de Usuário</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Funcionário (acesso restrito)
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          Administrador (acesso total)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Entity Access (only for employees) */}
                {newUserRole === 'employee' && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">2. Acesso a Entidade</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecione qual empresa/pessoa este usuário terá acesso
                    </p>
                    {entities.length === 0 ? (
                      <p className="text-sm text-destructive">
                        Nenhuma entidade cadastrada. Cadastre primeiro em Configurações.
                      </p>
                    ) : (
                      <Select value={newUserEntityId} onValueChange={setNewUserEntityId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a entidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {entities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
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
                                {entity.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Step 3: Menu Access (only for employees) */}
                {newUserRole === 'employee' && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">3. Acesso aos Menus</Label>
                    <p className="text-sm text-muted-foreground">
                      Marque quais funcionalidades este usuário poderá acessar
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {ALL_MENUS.map((menu) => (
                        <label
                          key={menu}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            newUserMenus.includes(menu)
                              ? "bg-primary/10 border-primary"
                              : "bg-card border-border hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={newUserMenus.includes(menu)}
                            onCheckedChange={() => toggleMenu(menu)}
                          />
                          <span className="text-sm font-medium">{MENU_LABELS[menu]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Credentials */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {newUserRole === 'employee' ? '4.' : '2.'} Credenciais de Acesso
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Nome do usuário"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (newUserRole === 'employee' && !newUserEntityId)}
                    className="w-full"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Todos os Usuários</CardTitle>
            <CardDescription>
              {users.length} usuário(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <UsersIcon className="h-8 w-8 mb-2" />
                <p>Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {users.map((userItem) => {
                    const entityIds = getUserEntities(userItem.id);
                    const userEntityList = entities.filter(e => entityIds.includes(e.id));
                    const isCurrentUser = userItem.id === user?.id;

                    return (
                      <div key={userItem.id} className="p-4 border rounded-lg space-y-3">
                        {/* Header: Name, Role Badge, Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{userItem.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{userItem.email}</p>
                          </div>
                          <Badge
                            variant={userItem.role === 'admin' ? 'default' : 'secondary'}
                            className={cn(
                              "shrink-0 text-xs",
                              userItem.role === 'admin' && "bg-primary/20 text-primary border-primary/30"
                            )}
                          >
                            {userItem.role === 'admin' ? 'Admin' : 'Func.'}
                          </Badge>
                        </div>

                        {/* Entities */}
                        {userItem.role !== 'admin' && (
                          <div className="flex flex-wrap gap-1">
                            {userEntityList.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sem entidades</span>
                            ) : (
                              userEntityList.slice(0, 2).map(entity => (
                                <Badge 
                                  key={entity.id} 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ borderColor: `hsl(${entity.color})` }}
                                >
                                  {entity.name.slice(0, 12)}{entity.name.length > 12 && '...'}
                                </Badge>
                              ))
                            )}
                            {userEntityList.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{userEntityList.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={userItem.is_active}
                              onCheckedChange={(checked) => toggleUserActive(userItem.id, checked)}
                              disabled={isCurrentUser}
                            />
                            <span className={cn(
                              "text-xs",
                              userItem.is_active ? "text-success" : "text-muted-foreground"
                            )}>
                              {userItem.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          {!isCurrentUser && userItem.role !== 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignDialog(userItem.id)}
                              className="h-8 text-xs"
                            >
                              <UserCog className="h-3 w-3 mr-1" />
                              Gerenciar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Entidades</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userItem) => {
                        const entityIds = getUserEntities(userItem.id);
                        const userEntityList = entities.filter(e => entityIds.includes(e.id));
                        const isCurrentUser = userItem.id === user?.id;

                        return (
                          <TableRow key={userItem.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{userItem.full_name}</span>
                                <span className="text-sm text-muted-foreground">{userItem.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={userItem.role === 'admin' ? 'default' : 'secondary'}
                                className={cn(
                                  userItem.role === 'admin' && "bg-primary/20 text-primary border-primary/30"
                                )}
                              >
                                {userItem.role === 'admin' ? (
                                  <><ShieldCheck className="h-3 w-3 mr-1" /> Admin</>
                                ) : (
                                  <><User className="h-3 w-3 mr-1" /> Funcionário</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {userItem.role === 'admin' ? (
                                  <Badge variant="outline" className="text-xs">
                                    Acesso Total
                                  </Badge>
                                ) : userEntityList.length === 0 ? (
                                  <span className="text-sm text-muted-foreground">Nenhuma</span>
                                ) : (
                                  userEntityList.slice(0, 3).map(entity => (
                                    <Badge 
                                      key={entity.id} 
                                      variant="outline" 
                                      className="text-xs gap-1"
                                      style={{ borderColor: `hsl(${entity.color})` }}
                                    >
                                      {entity.type === 'pj' ? (
                                        <Building2 className="h-2.5 w-2.5" />
                                      ) : (
                                        <User className="h-2.5 w-2.5" />
                                      )}
                                      {entity.name.slice(0, 15)}
                                      {entity.name.length > 15 && '...'}
                                    </Badge>
                                  ))
                                )}
                                {userEntityList.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{userEntityList.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={userItem.is_active}
                                  onCheckedChange={(checked) => toggleUserActive(userItem.id, checked)}
                                  disabled={isCurrentUser}
                                />
                                <span className={cn(
                                  "text-sm",
                                  userItem.is_active ? "text-success" : "text-muted-foreground"
                                )}>
                                  {userItem.is_active ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {!isCurrentUser && userItem.role !== 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAssignDialog(userItem.id)}
                                >
                                  <UserCog className="h-4 w-4 mr-1" />
                                  Gerenciar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Assign Entities Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gerenciar Acesso - {selectedUser?.full_name}</DialogTitle>
              <DialogDescription>
                Configure as entidades e permissões deste usuário
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Current access */}
              <div>
                <Label className="text-sm font-semibold">Entidades com Acesso</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userEntities.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Nenhuma entidade atribuída</span>
                  ) : (
                    userEntities.map(entityId => {
                      const entity = entities.find(e => e.id === entityId);
                      if (!entity) return null;
                      return (
                        <Badge
                          key={entity.id}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          <div 
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: `hsl(${entity.color})` }}
                          />
                          {entity.name}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 hover:bg-destructive/20"
                            onClick={() => selectedUserId && handleRemoveEntity(selectedUserId, entity.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add new access */}
              {availableEntities.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Adicionar Acesso</Label>
                  <div className="grid gap-2 mt-2">
                    {availableEntities.map(entity => (
                      <Button
                        key={entity.id}
                        variant="outline"
                        className="justify-start gap-2"
                        onClick={() => handleAssignEntity(entity.id)}
                      >
                        <Plus className="h-4 w-4" />
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: `hsl(${entity.color})` }}
                        />
                        {entity.type === 'pj' ? (
                          <Building2 className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {entity.name}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDocument(entity.document, entity.type)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {entities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma entidade cadastrada. Vá em Configurações para adicionar entidades.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
