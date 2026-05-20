import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppShell from "@/components/layout/AppShell";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Customers from "./pages/Customers";
import CustomerNew from "./pages/CustomerNew";
import Queue from "./pages/Queue";
import Users from "./pages/Users";
import Logs from "./pages/Logs";
import Recap from "./pages/Recap";
import Profile from "./pages/Profile";
import Statistics from "./pages/Statistics";
import Settings from "./pages/admin/Settings";
import PackagesAdmin from "./pages/admin/Packages";
import CustomerTypesAdmin from "./pages/admin/CustomerTypes";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SiteSettingsProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<Index />} />
                <Route path="/index" element={<Index />} />
                <Route path="/pelanggan" element={<Customers />} />
                <Route path="/pelanggan/baru" element={<CustomerNew />} />
                <Route path="/antrian" element={<Queue />} />
                <Route path="/users" element={<Users />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/rekap" element={<Recap />} />
                <Route path="/profil" element={<Profile />} />
                <Route path="/statistik" element={<Statistics />} />
                <Route path="/admin/settings/general" element={<Settings />} />
                <Route path="/admin/packages" element={<PackagesAdmin />} />
                <Route path="/admin/customer-types" element={<CustomerTypesAdmin />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
          </SiteSettingsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
