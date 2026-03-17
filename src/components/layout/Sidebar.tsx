import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Upload, 
  List, 
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  Receipt,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tourId: 'sidebar-dashboard' },
  { to: '/contas', icon: Receipt, label: 'Contas a Pagar', tourId: 'sidebar-contas' },
  { to: '/lancar', icon: PlusCircle, label: 'Lançar Despesa', tourId: 'sidebar-lancar' },
  { to: '/upload', icon: Upload, label: 'Upload IA', tourId: 'sidebar-upload' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp', tourId: 'sidebar-whatsapp' },
  { to: '/settings/whatsapp', icon: MessageSquare, label: 'Config WhatsApp' },
  { to: '/despesas', icon: List, label: 'Todas Despesas' },
  { to: '/usuarios', icon: Users, label: 'Usuários' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', tourId: 'sidebar-config' },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-tour={item.tourId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

// Desktop Sidebar
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 hidden md:block",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Logo collapsed={collapsed} />
        </div>

        {/* Navigation */}
        <SidebarContent collapsed={collapsed} />

        {/* Collapse button */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

// Mobile Sidebar Overlay
export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 md:hidden"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Sidebar Panel */}
      <aside className="fixed left-0 top-0 z-50 h-full w-[280px] max-w-[80vw] bg-sidebar border-r border-sidebar-border md:hidden animate-slide-in-left">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            <Logo collapsed={false} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <SidebarContent collapsed={false} onNavigate={() => onOpenChange(false)} />
        </div>
      </aside>
    </>
  );
}

// Mobile Menu Button
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="md:hidden h-10 w-10"
      aria-label="Abrir menu"
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
}
