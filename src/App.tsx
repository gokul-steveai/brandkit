import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Blogs } from "./pages/Blogs";
import { BlogPost } from "./pages/BlogPost";

// Eager load landing page and auth (critical path)
import Index from "./pages/Index";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { ResetPassword } from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import InstagramAnalysisWizard from "./pages/InstagramAnalysisWizard";
import { MCPDocumentation } from "./pages/MCPDocumentation";
import DocumentationLayout from "./pages/DocumentationLayout";
import Changelog from "./pages/Changelog";
import ChangelogEntry from "./pages/ChangelogEntry";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import { OAuthAuthorize } from "./pages/OAuthAuthorize";

// Lazy load authenticated routes (reduces initial bundle size)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BrandKitDetail = lazy(() => import("./pages/BrandKitDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Security = lazy(() => import("./pages/Security"));
const DashboardLayout = lazy(() => import("@/components/layout/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const BrandKitEditLayout = lazy(() => import("@/components/brand-kit/shared").then(m => ({ default: m.EditLayout })));

// Lazy load brand kit pages - each page loads separately for better code splitting
const CorePage = lazy(() => import("./components/brand-kit/core").then(m => ({ default: m.CorePage })));
const PersonalityPage = lazy(() => import("./components/brand-kit/personality").then(m => ({ default: m.PersonalityEditor })));
const ExpressionPage = lazy(() => import("./components/brand-kit/expression").then(m => ({ default: m.ExpressionPage })));
const AudiencePage = lazy(() => import("./components/brand-kit/audience").then(m => ({ default: m.AudiencePage })));
const GovernancePage = lazy(() => import("./components/brand-kit/governance").then(m => ({ default: m.GovernancePage })));
const OverviewPage = lazy(() => import("./components/brand-kit/overview").then(m => ({ default: m.OverviewPage })));
const ExportPage = lazy(() => import("./components/brand-kit/export").then(m => ({ default: m.ExportPage })));
const PersonasAudiencePage = lazy(() => import("./components/brand-kit/personas-audience").then(m => ({ default: m.PersonasAudiencePage })));
const KnowledgeFilesPage = lazy(() => import("./components/brand-kit/knowledge").then(m => ({ default: m.KnowledgeFilesPage })));
const WebPage = lazy(() => import("./components/brand-kit/web").then(m => ({ default: m.WebPage })));
const VisualAssetsPage = lazy(() => import("./components/brand-kit/visual-assets").then(m => ({ default: m.VisualAssetsPage })));

const queryClient = new QueryClient();

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes - eagerly loaded */}
                <Route path="/" element={<Index />} />
                <Route path="/blogs" element={<Blogs />} />
                <Route path="/blogs/:slug" element={<BlogPost />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
              <Route path="/docs/templates" element={<Navigate to="/documentation/reference/templates" replace />} />
              <Route path="/free-tools/instagram-analysis-wizard" element={<InstagramAnalysisWizard />} />
              <Route path="/help/mcp" element={<Navigate to="/documentation/how-to/mcp-setup" replace />} />
              
              {/* Documentation routes with hierarchical URLs */}
              <Route path="/documentation" element={<DocumentationLayout />} />
              <Route path="/documentation/:section/:slug" element={<DocumentationLayout />} />
              
              {/* Backward compatibility redirects for old hash-based URLs */}
              <Route path="/documentation/introduction" element={<Navigate to="/documentation/tutorials/introduction" replace />} />
              <Route path="/documentation/first-brand-kit" element={<Navigate to="/documentation/tutorials/creating-your-first-brand-kit" replace />} />
              <Route path="/documentation/export-gpt" element={<Navigate to="/documentation/how-to/export-to-chatgpt" replace />} />
              <Route path="/documentation/export-claude" element={<Navigate to="/documentation/how-to/export-to-claude" replace />} />
              <Route path="/documentation/mcp-setup" element={<Navigate to="/documentation/how-to/mcp-setup" replace />} />
              <Route path="/documentation/api-keys" element={<Navigate to="/documentation/reference/api-keys" replace />} />
              <Route path="/documentation/mcp-tools" element={<Navigate to="/documentation/reference/mcp-tools" replace />} />
              
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/changelog/:slug" element={<ChangelogEntry />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/oauth/authorize" element= {<OAuthAuthorize />}/>

              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth" element={<Navigate to="/signin" replace />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-canceled" element={<PaymentCanceled />} />
              
              {/* Authenticated routes - lazily loaded */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/security" element={<Security />} />
                <Route path="/brand-kits" element={<Navigate to="/dashboard" replace />} />
                <Route path="/brand-kits/:id" element={<BrandKitDetail />} />
                <Route path="/brand-kits/:id/edit" element={<BrandKitEditLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<OverviewPage />} />
                  <Route path="core" element={<CorePage />} />
                  <Route path="personality" element={<PersonalityPage />} />
                  <Route path="expression" element={<ExpressionPage />} />
                  <Route path="audience" element={<PersonasAudiencePage />} />
                  <Route path="governance" element={<GovernancePage />} />
                  <Route path="personas" element={<Navigate to="../audience" replace />} />
                  <Route path="knowledge" element={<KnowledgeFilesPage />} />
                  <Route path="visual-assets" element={<VisualAssetsPage />} />
                  <Route path="web" element={<WebPage />} />
                  <Route path="social" element={<Navigate to="../web" replace />} />
                  <Route path="export" element={<ExportPage />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
