import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from 'sonner';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout';
import { Dashboard } from '@/pages/dashboard';
import { Create } from '@/pages/create';
import { Characters } from '@/pages/characters';
import { Library } from '@/pages/library';
import { Pricing } from '@/pages/pricing';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/create" component={Create} />
          <Route path="/characters" component={Characters} />
          <Route path="/library" component={Library} />
          <Route path="/pricing" component={Pricing} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
