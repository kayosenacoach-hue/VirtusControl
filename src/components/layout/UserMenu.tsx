import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, ShieldCheck, Settings, CreditCard, UserCircle, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserMenu() {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  if (!profile) return null;

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  // VERIFICAÇÃO RÍGIDA: Separando o Admin Real do Titular (Owner) da conta
  const isRealAdmin = profile.role === 'admin';
  const isOwner = profile.role === 'owner';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-tour="user-menu">
        <Button variant="ghost" className="relative h-10 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">{profile.full_name}</span>
            <span className="text-xs text-muted-foreground">{profile.email}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            <Badge 
              variant={isRealAdmin ? 'default' : (isOwner ? 'outline' : 'secondary')} 
              className="w-fit mt-1"
            >
              {isRealAdmin ? (
                <><ShieldCheck className="h-3 w-3 mr-1" /> Administrador</>
              ) : isOwner ? (
                <><Crown className="h-3 w-3 mr-1 text-yellow-500" /> Titular</>
              ) : (
                <><User className="h-3 w-3 mr-1" /> Funcionário</>
              )}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/conta')}>
          <UserCircle className="h-4 w-4 mr-2" />
          Minha Conta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/assinatura')}>
          <CreditCard className="h-4 w-4 mr-2" />
          Assinatura
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}