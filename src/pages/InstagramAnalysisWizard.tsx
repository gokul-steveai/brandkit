import { useState } from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import FooterSection from "@/components/landing/FooterSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Instagram, 
  MessageSquare, 
  Video, 
  AtSign, 
  User, 
  Lightbulb, 
  Target, 
  Users, 
  FileText,
  Loader2,
  ArrowRight,
  FileCheck
} from "lucide-react";
import { InstagramProfileResults, InstagramProfileResultsSkeleton, WritingStyleReportDialog } from "@/components/free-tools";
import { SEOHead } from "@/components/seo";

function normalizeInstagramInput(input: string): { handle: string; url: string } | null {
  let handle = input.trim();
  
  if (!handle) return null;
  
  // Remove @ prefix if present
  if (handle.startsWith('@')) {
    handle = handle.substring(1);
  }
  
  // Remove full URL prefix if present
  const urlPatterns = [
    /^https?:\/\/(www\.)?instagram\.com\//,
    /^(www\.)?instagram\.com\//,
  ];
  
  for (const pattern of urlPatterns) {
    handle = handle.replace(pattern, '');
  }
  
  // Remove trailing slash and any query params
  handle = handle.split('/')[0].split('?')[0];
  
  if (!handle) return null;
  
  return {
    handle: handle,
    url: `https://www.instagram.com/${handle}/`
  };
}

// Raw profile data type that matches what we get from n8n
interface RawProfileData {
  "Profile Information "?: string;
  "Latest Posts"?: Array<Record<string, unknown>>;
  "Latest Videos "?: Array<Record<string, unknown>>;
  // Also support normalized format
  inputUrl?: string;
  id?: string;
  username?: string;
  url?: string;
  fullName?: string;
  biography?: string;
  externalUrl?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  isBusinessAccount?: boolean;
  businessCategoryName?: string | null;
  latestPosts?: Array<Record<string, unknown>>;
}

export function InstagramAnalysisWizard() {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<RawProfileData | null>(null);
  const [writingStyleReport, setWritingStyleReport] = useState<Record<string, unknown> | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProfileData(null);
    setWritingStyleReport(null);
    
    const normalized = normalizeInstagramInput(inputValue);
    if (!normalized) {
      setError("Please enter a valid Instagram handle or URL");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            instagramUrl: normalized.url,
            resultsType: 'details',
            timestamp: new Date().toISOString(),
            source: 'brandkitos-wizard'
          }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          throw new Error(`Too many requests. Please wait ${retryAfter} seconds and try again.`);
        }
        throw new Error(data.error || 'Failed to fetch profile data');
      }
      
      // Handle new response structure with profileData and writingStyleReport
      if (data.profileData) {
        setProfileData(data.profileData);
      } else if (Array.isArray(data)) {
        // Legacy: n8n sometimes returns arrays
        setProfileData(data[0]);
      } else {
        // Fallback: assume the whole response is profile data
        setProfileData(data);
      }
      
      if (data.writingStyleReport) {
        setWritingStyleReport(data.writingStyleReport);
      }
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeItems = [
    { icon: Instagram, label: "Posts and captions" },
    { icon: MessageSquare, label: "Comments and replies" },
    { icon: Video, label: "Reels and short-form content" },
    { icon: AtSign, label: "Mentions and interactions" },
    { icon: User, label: "Profile metadata and structure" },
  ];

  const deliverables = [
    {
      icon: Lightbulb,
      title: "Brand Identity Insights",
      description: "A clear breakdown of your brand's personality, voice, and positioning—derived from real posts and real engagement, not assumptions."
    },
    {
      icon: Target,
      title: "Gaps & Quick Wins",
      description: "We identify inconsistencies, missed opportunities, and areas where small changes can create outsized impact."
    },
    {
      icon: Users,
      title: "Competitor Analysis",
      description: "Compare your profile against competitors to understand what's working for them—and what you can adapt without losing your identity.",
      comingSoon: true
    },
    {
      icon: FileText,
      title: "Brand Identity Documents",
      description: "Generate comprehensive brand identity files in PDF, Markdown, and JSON. Use them as knowledge files for your LLMs or living brand documentation."
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Free Instagram Brand Analysis Tool"
        description="Analyze your Instagram profile to discover your brand identity. Get AI-powered insights on voice, tone, and positioning - completely free."
        canonicalUrl="/free-tools/instagram-analysis-wizard"
        keywords={['Instagram analysis', 'brand identity tool', 'Instagram brand', 'free brand tool', 'social media analysis']}
      />
      <LandingNavbar />
      
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <Badge variant="secondary" className="mb-6">
            Free Tool
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
            Turn your Instagram activity into a
            <span className="text-chart-1"> clear picture </span>
            of your brand.
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground md:text-xl">
            We analyze what you've already shared—posts, captions, comments, reels, and engagement—to reveal the identity and personality your audience actually experiences.
          </p>
        </section>

        {/* Input Form Section */}
        <section className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-2xl border-2 border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Enter your Instagram profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      @
                    </span>
                    <Input
                      type="text"
                      placeholder="username or instagram.com/username"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="pl-8"
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Loading Skeleton */}
        {isLoading && (
          <section className="container mx-auto px-4 py-8">
            <InstagramProfileResultsSkeleton />
          </section>
        )}

        {/* Results Section */}
        {profileData && !isLoading && (
          <section className="container mx-auto px-4 py-8">
            <InstagramProfileResults profile={profileData} />
            
            {/* Writing Style Report Button */}
            {writingStyleReport && (
              <div className="mt-8 text-center">
                <Button 
                  size="lg" 
                  onClick={() => setShowReportModal(true)}
                  className="gap-2"
                >
                  <FileCheck className="h-5 w-5" />
                  View Writing Style Report
                </Button>
              </div>
            )}
          </section>
        )}

        {/* What This Is Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold mb-6">What This Is</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Your Instagram profile already contains your brand story.
                Not the one you intended—but the one people respond to.
              </p>
              <p>
                We use Instagram data to extract real signals about your voice, tone, values, and positioning. The result is not guesswork or templates, but insight grounded in how people actually engage with your content.
              </p>
            </div>
          </div>
        </section>

        {/* What We Analyze Section */}
        <section className="container mx-auto px-4 py-16 bg-secondary/30">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold mb-8 text-center">What We Analyze</h2>
            <p className="text-center text-muted-foreground mb-8">
              We securely scrape and analyze:
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {analyzeItems.map((item) => (
                <Card key={item.label} className="border-2 border-border bg-card">
                  <CardContent className="flex items-center gap-3 p-4">
                    <item.icon className="h-5 w-5 text-chart-1" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-8 italic">
              This gives us both sides of the conversation: what you say, and how people respond.
            </p>
          </div>
        </section>

        {/* What You Get Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-semibold mb-8 text-center">What You Get</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {deliverables.map((item) => (
                <Card key={item.title} className="border-2 border-border">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
                        <item.icon className="h-5 w-5 text-chart-1" />
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {item.title}
                        {item.comingSoon && (
                          <Badge variant="outline" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why This Works Section */}
        <section className="container mx-auto px-4 py-16 bg-secondary/30">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold mb-6">Why This Works</h2>
            <p className="text-muted-foreground mb-4">
              Brand identity shouldn't be invented in a vacuum.
              It should be observed, named, and refined.
            </p>
            <p className="text-muted-foreground">
              By grounding insights in existing content and engagement, we help you understand who you already are—and how to be more intentional going forward.
            </p>
          </div>
        </section>

        {/* Closing CTA Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground mb-8">
            You don't need a new brand.<br />
            You need a clearer view of the one you're already showing the world.
          </p>
          <Button size="lg" asChild>
            <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Analyze Your Profile
            </a>
          </Button>
        </section>
      </main>

      <FooterSection />
      
      {/* Writing Style Report Dialog */}
      <WritingStyleReportDialog 
        open={showReportModal}
        onOpenChange={setShowReportModal}
        report={writingStyleReport}
      />
    </div>
  );
}

export default InstagramAnalysisWizard;
