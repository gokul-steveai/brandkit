import { Card, CardContent } from '@/components/ui/card';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "Brand Kit OS transformed how we manage our brand across AI tools. Our ChatGPT responses now sound consistently like our brand, and our Midjourney images match our visual style perfectly.",
    name: 'Sarah Chen',
    role: 'Founder, AI Startup',
    initials: 'SC',
  },
  {
    quote: "As a marketing consultant managing 12 different brands, Brand Kit OS saves me 10 hours per week. The AI compliance checking catches brand violations I would have missed.",
    name: 'Marcus Rodriguez',
    role: 'Marketing Consultant, Independent',
    initials: 'MR',
  },
  {
    quote: "Finally, a brand kit that understands our technical workflow. The API integration with our development stack is seamless.",
    name: 'Dr. Emily Watson',
    role: 'CTO, AI-First SaaS',
    initials: 'EW',
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20" aria-label="Customer testimonials">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Trusted by Forward-Thinking Teams
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border-2 border-border bg-card">
              <CardContent className="pt-6">
                <Quote className="mb-4 h-8 w-8 text-chart-1/40" />
                <p className="mb-6 text-muted-foreground">{testimonial.quote}</p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center border-2 border-border bg-muted text-sm font-semibold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
