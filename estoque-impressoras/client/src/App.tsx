import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardLayout from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import PrintersPage from "./pages/PrintersPage";
import SuppliesPage from "./pages/SuppliesPage";
import EntryPage from "./pages/EntryPage";
import ExitPage from "./pages/ExitPage";
import SearchPage from "./pages/SearchPage";
import HistoryPage from "./pages/HistoryPage";
import AlertsPage from "./pages/AlertsPage";
import OrdersPage from "./pages/OrdersPage";
import UsersPage from "./pages/UsersPage";
import EmailSettingsPage from "./pages/EmailSettingsPage";
import PermissionsPage from "./pages/PermissionsPage";
import AuditPage from "./pages/AuditPage";
import LoginPage from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ReportsPage from "./pages/ReportsPage";
import { DispatchPage } from "./pages/DispatchPage";


function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route>
        <ProtectedRoute>
          <DashboardLayout>
            <Switch>
            <Route path="/" component={PrintersPage} />
            <Route path="/impressoras" component={PrintersPage} />
            <Route path="/insumos" component={SuppliesPage} />
            <Route path="/entrada" component={EntryPage} />
            <Route path="/saida" component={ExitPage} />
            <Route path="/pedidos" component={OrdersPage} />
            <Route path="/consultas" component={SearchPage} />
            <Route path="/relatorios" component={ReportsPage} />
            <Route path="/despacho" component={DispatchPage} />
            <Route path="/historico" component={HistoryPage} />
            <Route path="/alertas" component={AlertsPage} />
            <Route path="/usuarios" component={UsersPage} />
            <Route path="/configuracoes/emails" component={EmailSettingsPage} />
            <Route path="/configuracoes/permissoes" component={PermissionsPage} />
            <Route path="/auditoria" component={AuditPage} />
            <Route component={() => <div>Página não encontrada</div>} />
          </Switch>
        </DashboardLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
