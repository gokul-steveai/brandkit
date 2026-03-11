import { Link, useNavigate } from "react-router-dom";

export function AuthNavbar() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    navigate('/');
    // Delay to allow navigation to complete
    setTimeout(() => {
      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/images/logo-icon.png"
            alt="Brand Kit OS Logo"
            className="h-12 w-auto"
          />
          <span className="text-xl font-bold">Brand Kit OS</span>
        </Link>

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
            onClick={() => scrollToSection("faq")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </button>
        </div>

        {/* No sign in/signup buttons on auth pages */}
        <div className="w-[200px]" /> {/* Spacer to maintain layout balance */}
      </div>
    </nav>
  );
}
