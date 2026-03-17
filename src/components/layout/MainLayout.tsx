import { ReactNode, useState } from 'react';
import { Sidebar, MobileSidebar, MobileMenuButton } from './Sidebar';
import { UserMenu } from './UserMenu';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      
      {/* Main content - responsive margin */}
      <div className="md:ml-64 transition-all duration-300">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Mobile menu button */}
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <UserMenu />
        </header>
        
        {/* Main Content */}
        <main className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] p-3 md:p-6 overflow-x-hidden">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
