import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: "How is Brand Kit OS different from Canva's brand kit?",
    answer: "Canva's brand kit is limited to their platform. Brand Kit OS works across 50+ platforms and includes AI agent integration, automated compliance checking, and developer APIs that Canva doesn't offer.",
  },
  {
    question: 'What is an MCP server and why do I need it?',
    answer: 'MCP (Model Context Protocol) is the new standard for AI agent integration. Our MCP server means your brand automatically works with ChatGPT, Claude, and other AI tools without manual setup.',
  },
  {
    question: 'Can I integrate Brand Kit OS with my existing tools?',
    answer: 'Yes! We have native integrations with 50+ platforms and comprehensive APIs for custom integrations. Our developer team can help with complex setups.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most teams are up and running in under 30 minutes. Our AI-powered setup wizard guides you through brand kit creation and platform connections.',
  },
  {
    question: 'What is an AI-native brand kit?',
    answer: 'An AI-native brand kit is a structured set of brand guidelines specifically designed to be consumed by AI tools like ChatGPT, Claude, and Midjourney. Unlike traditional PDF brand guides, it includes machine-readable voice, tone, personality, and visual identity data that AI agents can use to generate on-brand content automatically.',
  },
  {
    question: 'How does Brand Kit OS integrate with ChatGPT and Claude?',
    answer: 'Brand Kit OS exports your brand kit as custom GPT instructions, Claude project files, or via MCP (Model Context Protocol). This means every response from your AI tools automatically follows your brand voice, terminology, and guidelines without manual prompting.',
  },
  {
    question: 'How much does Brand Kit OS cost?',
    answer: 'Brand Kit OS offers a free plan with 1 brand kit and core features. The Base plan is $19/month with 3 brand kits and advanced features like social profiles and visual assets. The Premium plan is $59/month with unlimited brand kits, team collaboration, and MCP API access.',
  },
  {
    question: 'Is my brand data secure?',
    answer: 'Yes. Brand Kit OS uses enterprise-grade encryption for all data at rest and in transit. Your brand assets are stored securely and never shared with third parties. We are SOC 2 compliant and offer role-based access control for team collaboration.',
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-20 bg-secondary/30" aria-label="Frequently asked questions">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mx-auto max-w-2xl">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-2 border-border bg-card px-6"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
