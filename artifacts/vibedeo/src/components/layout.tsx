import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Video, Sparkles, Users, Library, CreditCard } from 'lucide-react';
import { useGetCredits } from '@workspace/api-client-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: Sparkles, label: 'Dashboard', href: '/' },
  { icon: Video, label: 'Create', href: '/create' },
  { icon: Users, label: 'Characters', href: '/characters' },
  { icon: Library, label: 'Library', href: '/library' },
];

export function AppLayout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: creditsData } = useGetCredits();

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 w-64 flex flex-col border-r bg-card px-4 py-6 text-card-foreground">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Video size={24} className="stroke-[2.5]" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Vibedeo</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-xl border bg-secondary/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Credits</span>
              <span className="text-xs font-bold text-primary">{creditsData?.credits ?? '-'}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${Math.min(100, ((creditsData?.credits ?? 0) / 1000) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{creditsData?.plan ?? 'Free'} Plan</p>
            <Link 
              href="/pricing"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-background border px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <CreditCard size={14} />
              Upgrade Plan
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 pl-64">
        <div className="mx-auto max-w-6xl p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
