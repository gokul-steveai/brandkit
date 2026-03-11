import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

const FooterSection = () => {
  const location = useLocation();
  const hideCTA = location.pathname.startsWith('/documentation') || location.pathname.startsWith('/changelog');

  return (
    <>
      {!hideCTA && (
      <section className="py-20" aria-label="Call to action">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Ready to Supercharge Your Brand?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Join 67+ AI-first businesses who've already transformed their brand management. 
            Start your free trial today.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/signup">
              Start Free Trial - No Credit Card Required
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-chart-2" />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-chart-2" />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>
      )}

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/images/logo-icon.png" 
                alt="Brand Kit OS" 
                className="h-8 w-8 object-contain"
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
              />
              <span className="text-lg font-bold">Brand Kit OS</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-sm text-muted-foreground" aria-label="Footer navigation">
              <Link to="/signin" className="py-2 transition-colors hover:text-foreground">
                Sign In
              </Link>
              <a href="#features" className="py-2 transition-colors hover:text-foreground">
                Features
              </a>
              <a href="#pricing" className="py-2 transition-colors hover:text-foreground">
                Pricing
              </a>
              <a href="#faq" className="py-2 transition-colors hover:text-foreground">
                FAQ
              </a>
              <Link to="/blogs" className="py-2 transition-colors hover:text-foreground">
                Blog
              </Link>
              <Link to="/documentation" className="py-2 transition-colors hover:text-foreground">
                Docs
              </Link>
              <Link to="/changelog" className="py-2 transition-colors hover:text-foreground">
                Changelog
              </Link>
              <a href="https://insights.brandkitos.com/" target="_blank" rel="noopener noreferrer" className="py-2 transition-colors hover:text-foreground">
                Insights
              </a>
              <Link to="/privacy" className="py-2 transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link to="/terms" className="py-2 transition-colors hover:text-foreground">
                Terms
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Brand Kit OS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterSection;
