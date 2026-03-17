import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ExpenseProvider } from "@/contexts/ExpenseContext";
import { EntityProvider } from "@/contexts/EntityContext";
import { RecurringProvider } from "@/contexts/RecurringContext";
import { MonthlyBillsProvider } from "@/contexts/MonthlyBillsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LaunchExpense = lazy(() => import("./pages/LaunchExpense"));
const AIUpload = lazy(() => import("./pages/AIUpload"));
const WhatsAppPending = lazy(() => import("./pages/WhatsAppPending"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const WhatsAppNumberSettings = lazy(() => import("./pages/WhatsAppNumberSettings"));
const ExpenseList = lazy(() => import("./pages/ExpenseList"));
const Settings = lazy(() => import("./pages/Settings"));
const Users = lazy(() => import("./pages/Users"));
const Bills = lazy(() => import("./pages/Bills"));
const Billing = lazy(() => import("./pages/Billing"));
const Auth = lazy(() => import("./pages/Auth"));
const ChoosePlan = lazy(() => import("./pages/ChoosePlan"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
// Admin pages
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminEntities = lazy(() => import("./pages/admin/AdminEntities"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes  
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EntityProvider>
          <RecurringProvider>
            <MonthlyBillsProvider>
              <ExpenseProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/esqueci-senha" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route
                        path="/plano"
                        element={
                          <ProtectedRoute>
                            <ChoosePlan />
                          </ProtectedRoute>
                        }
                      />
                      {/* Admin routes */}
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                      <Route path="/admin/clientes" element={<AdminGuard><AdminClients /></AdminGuard>} />
                      <Route path="/admin/empresas" element={<AdminGuard><AdminEntities /></AdminGuard>} />
                      <Route path="/admin/assinaturas" element={<AdminGuard><AdminSubscriptions /></AdminGuard>} />
                      <Route path="/admin/pagamentos" element={<AdminGuard><AdminPayments /></AdminGuard>} />
                      <Route path="/admin/logs" element={<AdminGuard><AdminLogs /></AdminGuard>} />
                      <Route path="/admin/configuracoes" element={<AdminGuard><AdminSettings /></AdminGuard>} />
                      {/* Client routes */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Dashboard />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/contas"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Bills />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/lancar"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <LaunchExpense />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/upload"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <AIUpload />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/whatsapp"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <WhatsAppPending />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/whatsapp/config"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <WhatsAppSettings />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settings/whatsapp"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <WhatsAppNumberSettings />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/despesas"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <ExpenseList />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/usuarios"
                        element={
                          <ProtectedRoute requireAdmin>
                            <SubscriptionGuard>
                              <Users />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/configuracoes"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Settings />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/conta"
                        element={
                          <ProtectedRoute>
                            <AccountSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/assinatura"
                        element={
                          <ProtectedRoute>
                            <Billing />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </ExpenseProvider>
            </MonthlyBillsProvider>
          </RecurringProvider>
        </EntityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
