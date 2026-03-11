import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 border border-border/40 bg-secondary/50 px-4 py-2 text-sm">
              <span>🚀</span>
              <span>First AI-Native Brand Kit</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your Brand Kit, <span className="text-chart-1">Supercharged by AI</span>
            </h1>

            <p className="max-w-lg text-lg text-muted-foreground">
              The first brand management platform designed for AI-first businesses. Build and share your brand across AI
              platforms, tools, and agents you use.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="https://calendar.app.google/FHJHR5rKrChMB3Hb8" target="_blank" rel="noopener noreferrer">
                  Book a Demo
                </a>
              </Button>
            </div>

            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-chart-4" />
              Trusted by 23+ AI-first startups and branding agencies
            </p>
          </div>

          <div className="relative group">
            <div className="border-2 border-border bg-card shadow-lg rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
              <img
                src="/images/hero-dashboard.webp"
                alt="BrandKitOS Dashboard showing brand management interface with brand identity, voice, and AI persona tools"
                className="w-full h-auto"
                width={1200}
                height={750}
                fetchPriority="high"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
