import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import CotizadorPage from "@/pages/Cotizador";
import LoginPage from "@/pages/Login";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { useInactivity } from "@/lib/useInactivity";
import InactivityWarning from "@/components/InactivityWarning";

function InactivityGuard({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const { showWarning, secondsLeft, continueSession } = useInactivity(handleLogout);

  return (
    <>
      {children}
      {showWarning && (
        <InactivityWarning
          secondsLeft={secondsLeft}
          onContinue={continueSession}
        />
      )}
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;
  return (
    <InactivityGuard>
      <Component />
    </InactivityGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={CotizadorPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
