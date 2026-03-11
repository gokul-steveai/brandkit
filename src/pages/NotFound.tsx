import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, MessageCircle } from "lucide-react";
import { SEOHead } from "@/components/seo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/useToast";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const brandKitIdMatch = location.pathname.match(/brand-kits\/([a-f0-9-]+)/i);
  const brandKitId = brandKitIdMatch ? brandKitIdMatch[1] : null;

  useEffect(() => {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      attemptedPath: location.pathname,
      searchParams: location.search,
      hash: location.hash,
      referrer: document.referrer || "direct",
      userAgent: navigator.userAgent,
      userId: user?.id || "anonymous",
      brandKitId: brandKitId || "none",
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
    };

    console.error("404 Error - Page Not Found:", errorDetails);
  }, [location.pathname, location.search, location.hash, user?.id, brandKitId]);

  const generateErrorReport = () => {
    const timestamp = new Date().toISOString();
    const subject = encodeURIComponent(`404 Error Report - ${location.pathname}`);
    
    const body = encodeURIComponent(
`404 Error Report
================

Attempted URL: ${window.location.href}
Path: ${location.pathname}
Search Params: ${location.search || "none"}
Timestamp: ${timestamp}

User Details:
- User ID: ${user?.id || "Not logged in"}
- Brand Kit ID: ${brandKitId || "N/A"}

Browser Details:
- User Agent: ${navigator.userAgent}
- Screen Size: ${window.innerWidth}x${window.innerHeight}
- Language: ${navigator.language}
- Referrer: ${document.referrer || "Direct navigation"}

Additional Notes:
[Please describe what you were trying to do when you encountered this error]
`
    );

    return `mailto:support@brandkitos.com?subject=${subject}&body=${body}`;
  };

  const handleReportIssue = async () => {
    // Log to database for authenticated users
    if (user) {
      try {
        const description = `404 Error: ${location.pathname}\nTimestamp: ${new Date().toISOString()}\nReferrer: ${document.referrer || 'direct'}\nScreen: ${window.innerWidth}x${window.innerHeight}\nUA: ${navigator.userAgent}`;
        const { error } = await supabase.from('user_feedback').insert({
          user_id: user.id,
          feedback_type: '404_error',
          description,
          brand_kit_id: brandKitId || null,
        });
        if (!error) {
          toast({ title: "Report logged", description: "We've recorded this issue. Thank you!" });
        }
      } catch {
        // Silently fail DB insert — email flow still works
      }
    }
    // Open mailto for all users
    window.location.href = generateErrorReport();
  };

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(user ? '/dashboard' : '/');
    }
  };

  return (
    <>
      <SEOHead
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
        noindex
      />
      <main className="grid min-h-screen place-items-center bg-background px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          <p className="text-base font-semibold text-primary">404</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-foreground sm:text-7xl">
            Page not found
          </h1>
          <p className="mt-6 text-lg font-medium text-pretty text-muted-foreground sm:text-xl/8">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            {location.pathname}
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild>
              <Link to={user ? "/dashboard" : "/"}>
                <Home className="mr-2 h-4 w-4" />
                {user ? "Go to Dashboard" : "Go to Home"}
              </Link>
            </Button>
            
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            <Button variant="ghost" onClick={handleReportIssue}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Report Issue
              <span className="ml-1" aria-hidden="true">→</span>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};

export default NotFound;
