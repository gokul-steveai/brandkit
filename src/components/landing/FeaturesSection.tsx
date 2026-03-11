import { Cpu, Zap, Shield, FileDown, Layers, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Cpu,
    title: "RAG Ready Knowledge",
    description:
      "Our curated Knowledge gives you the guidelines and guardrails you need to make your brand AI compatible ",
  },
  {
    icon: Zap,
    title: "Platform Automation",
    description: "One-click AI-assisted brand creation and content generation. Never start from scratch again.",
  },
  {
    icon: Shield,
    title: "Smart Brand Compliance",
    description:
      "Set your own rules and guidelines for brand consistency. Never worry about brand messaging inconsistency.",
  },
  {
    icon: FileDown,
    title: "Export",
    description:
      "Export polished PDFs or Markdown for your preferred LLM. Share beautifully designed reports with stakeholders.",
  },
  {
    icon: Layers,
    title: "Dynamic Brand Adaptation",
    description:
      "Your brand should adapt to different contexts while maintaining consistency across social, email, and AI content.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite team members or freelancers to help with building content in an environment that ensures brand consistency.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-medium text-chart-1">One Brand Kit. Every Element. Perfect Consistency.</p>
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Everything You Need for Modern Brand Management in the AI era
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Built specifically for AI workflows with features that traditional brand kits can't match.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 border-border bg-card transition-all hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center bg-chart-1/10 text-chart-1">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
