import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LandingNavbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <header>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-md" aria-label="Main navigation">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/logo-icon.png"
              alt="Brand Kit OS Logo"
              className="h-12 w-auto"
              width={48}
              height={48}
            />
            <span className="text-xl font-bold">Brand Kit OS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Testimonials
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </button>
            <Link
              to="/blogs"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                Free Tools
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem asChild>
                  <Link to="/free-tools/instagram-analysis-wizard">
                    Instagram Analysis Wizard
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/signin">Sign In</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/signup">Start Free Trial</Link>
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <button
                    onClick={() => scrollToSection("features")}
                    className="w-full text-left py-3 px-4 text-sm hover:bg-accent rounded-md transition-colors"
                  >
                    Features
                  </button>
                  <button
                    onClick={() => scrollToSection("pricing")}
                    className="w-full text-left py-3 px-4 text-sm hover:bg-accent rounded-md transition-colors"
                  >
                    Pricing
                  </button>
                  <button
                    onClick={() => scrollToSection("testimonials")}
                    className="w-full text-left py-3 px-4 text-sm hover:bg-accent rounded-md transition-colors"
                  >
                    Testimonials
                  </button>
                  <button
                    onClick={() => scrollToSection("faq")}
                    className="w-full text-left py-3 px-4 text-sm hover:bg-accent rounded-md transition-colors"
                  >
                    FAQ
                  </button>
                  <Link
                    to="/blogs"
                    className="w-full text-left py-3 px-4 text-sm hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Blog
                  </Link>
                  <Link
                    to="/free-tools/instagram-analysis-wizard"
                    className="w-full text-left py-3 px-4 text-sm hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Instagram Analysis Wizard
                  </Link>
                  <div className="border-t border-border my-2" />
                  <Link
                    to="/signin"
                    className="w-full text-left py-3 px-4 text-sm hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Button asChild className="mx-4">
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                      Start Free Trial
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default LandingNavbar;
