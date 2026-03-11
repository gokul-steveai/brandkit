import { Rocket, Zap, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const painPoints = [
  {
    icon: Rocket,
    title: 'For Startup Founders',
    description: "You're building the next big thing, but your brand looks different everywhere. Your team spends hours on brand consistency instead of growth.",
  },
  {
    icon: Zap,
    title: 'For AI-First Businesses',
    description: "Your cutting-edge AI product deserves a cutting-edge brand system. Traditional brand kits weren't built for AI workflows.",
  },
  {
    icon: Users,
    title: 'For Marketing Teams',
    description: "You're managing brand assets across multiple platforms. Every campaign risks brand inconsistency. Every new team member needs training.",
  },
];

const PainPointsSection = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Your Brand Gets Lost in Translation
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Every time you use ChatGPT, Midjourney, or any AI tool, you start from scratch. 
            Your brand guidelines sit in a PDF while your team manually copies brand information 
            into dozens of different platforms.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {painPoints.map((point) => (
            <Card key={point.title} className="border-2 border-border bg-card">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground">
                  <point.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPointsSection;
