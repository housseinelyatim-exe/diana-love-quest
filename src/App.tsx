import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LanguageSelection from "./pages/LanguageSelection";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import AccountSettings from "./pages/AccountSettings";
import PreferencesSettings from "./pages/PreferencesSettings";
import NotificationsSettings from "./pages/NotificationsSettings";
import HelpSupport from "./pages/HelpSupport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/language" element={<LanguageSelection />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings/account" element={<AccountSettings />} />
          <Route path="/settings/preferences" element={<PreferencesSettings />} />
          <Route path="/settings/notifications" element={<NotificationsSettings />} />
          <Route path="/settings/help" element={<HelpSupport />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
