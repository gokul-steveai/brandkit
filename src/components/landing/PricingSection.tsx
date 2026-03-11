import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Coins, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ============================================
// PRICING CARD COMPONENT
// ============================================

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  tokens: string;
  features: string[];
  limitations: string[];
  buttonText: string;
  buttonVariant: "default" | "outline";
  buttonLink: string;
  isPopular?: boolean;
}

function PricingCard({
  name,
  description,
  price,
  tokens,
  features,
  limitations,
  buttonText,
  buttonVariant,
  buttonLink,
  isPopular = false,
}: PricingCardProps) {
  return (
    <div className="relative pt-4 h-full flex flex-col">
      {isPopular && (
        <Badge
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10
            bg-[hsl(173,58%,39%)] text-white 
            border-2 border-[hsl(173,58%,30%)]
            hover:bg-[hsl(173,58%,35%)] 
            shadow-md transition-all duration-200 cursor-default"
        >
          <Star className="h-3 w-3 mr-1 fill-current" />
          Most Popular
        </Badge>
      )}

      <Card
        className={`flex-1 flex flex-col border-2 bg-card ${
          isPopular ? "border-[hsl(173,58%,39%)]" : "border-border"
        }`}
      >
        <CardHeader>
          <CardTitle className="text-xl">{name}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="mt-4">
            <span className="text-4xl font-bold">{price}</span>
            {price !== "$0" && <span className="text-muted-foreground">/month</span>}
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-chart-2">
            <Coins className="h-4 w-4" />
            <span>{tokens}</span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-chart-2" />
                <span>{feature}</span>
              </li>
            ))}
            {limitations.map((limitation) => (
              <li key={limitation} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="h-4 w-4 shrink-0 text-center">—</span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-4">
            <Button asChild className="w-full" variant={buttonVariant}>
              <Link to={buttonLink}>{buttonText}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PRICING SECTION
// ============================================

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Start free, upgrade as you grow. All plans include core features.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
          {/* FREE PLAN */}
          <PricingCard
            name="Free"
            description="Perfect for trying out BrandKitOS"
            price="$0"
            tokens="10 tokens"
            features={[
              "1 brand kit",
              "1 AI persona",
              "1 target audience",
              "1 website scrape",
              "Core, Personality & Expression",
              "Basic export",
            ]}
            limitations={[
              "No Products section",
              "No Governance",
              "No Knowledge Files",
              "No Visual Assets",
              "No Social Profiles",
              "No team collaboration",
            ]}
            buttonText="Get Started Free"
            buttonVariant="outline"
            buttonLink="/signup"
          />

          {/* BASE PLAN */}
          <PricingCard
            name="Base"
            description="Full Brand Kit OS ecosystem"
            price="$19"
            tokens="50 tokens/month"
            features={[
              "3 brand kits",
              "2 AI personas per kit",
              "3 target audiences",
              "3 website scrapes/month",
              "All sections unlocked",
              "Visual Assets & Social Profiles",
              "5 knowledge files",
              "Team: 1 editor, 10 viewers",
            ]}
            limitations={[]}
            buttonText="Start Free Trial"
            buttonVariant="default"
            buttonLink="/signup"
            isPopular={true}
          />

          {/* PREMIUM PLAN */}
          <PricingCard
            name="Premium"
            description="Unlimited everything for growing brands"
            price="$59"
            tokens="150 tokens/month"
            features={[
              "Unlimited brand kits",
              "Unlimited AI personas",
              "Unlimited target audiences",
              "Unlimited scrapes",
              "Unlimited knowledge files",
              "All sections unlocked",
              "Team: 5 editors, 2 admins, 25 viewers",
              "MCP API Access",
            ]}
            limitations={[]}
            buttonText="Upgrade to Premium"
            buttonVariant="default"
            buttonLink="/signup"
          />
        </div>

        {/* Token Pricing Explanation */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-chart-2" />
                How Tokens Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Tokens are used for AI-powered features. Each action consumes tokens based on complexity:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Website Scrape</p>
                  <p className="text-muted-foreground">1 token</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Generate Persona</p>
                  <p className="text-muted-foreground">1 token</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Fill Brand Gaps</p>
                  <p className="text-muted-foreground">1 token</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Export GPT</p>
                  <p className="text-muted-foreground">1 token</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Unused tokens don't roll over. 10% overage allowed before hard cutoff. Tokens reset on your signup
                anniversary date.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Compare Enterprise Competitors</p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href="https://brandkit.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border bg-card px-4 sm:px-6 py-3 text-sm transition-colors hover:bg-secondary min-h-[44px] flex items-center"
            >
              Brandkit.com — $999+/month
            </a>
            <a
              href="https://business.adobe.com/products/experience-manager/sites/pricing.html"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border bg-card px-4 sm:px-6 py-3 text-sm transition-colors hover:bg-secondary min-h-[44px] flex items-center"
            >
              Adobe Experience Manager — $5,000+/month
            </a>
            <a
              href="https://www.bynder.com/en/pricing/"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border bg-card px-4 sm:px-6 py-3 text-sm transition-colors hover:bg-secondary min-h-[44px] flex items-center"
            >
              Bynder — $2,700+/month
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
