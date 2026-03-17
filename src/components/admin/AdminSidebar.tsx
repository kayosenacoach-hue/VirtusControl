import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Receipt,
  ScrollText,
  Settings,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
  { to: '/admin/pagamentos', label: 'Pagamentos', icon: Receipt },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card min-h-screen">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold text-foreground text-sm">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">VirtusControl</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {adminLinks.map((link) => {
          const isActive = link.end
            ? location.pathname === link.to
            : location.pathname.startsWith(link.to);

          return (
            <RouterNavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </RouterNavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <RouterNavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao sistema
        </RouterNavLink>
      </div>
    </aside>
  );
}
