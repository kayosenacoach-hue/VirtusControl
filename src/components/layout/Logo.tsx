import { cn } from '@/lib/utils';
import logoImg from '/logo-virtuscontrol.png';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center", className)}>
      <img src={logoImg} alt="VirtusControl" className="h-10 w-10 rounded-xl" />
      
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            Virtus<span className="text-primary">Control</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Gestão Financeira
          </span>
        </div>
      )}
    </div>
  );
}
