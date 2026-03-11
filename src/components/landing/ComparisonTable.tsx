import { Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const comparisons = [
  { feature: "Prompt Building", traditional: "Unstructured and Manual", launch99: "Custom Prompt Building Wizard" },
  { feature: "Platform Dependency", traditional: "In-house Only", launch99: "Platform Agnostic" },
  { feature: "Brand Compliance", traditional: "Manual checking and static", launch99: "AI-Readable" },
  { feature: "Templates", traditional: "Limited/No Customization", launch99: "Comprehensive Growing Template Library" },
  { feature: "Pricing", traditional: "$5K+ annually", launch99: "Starting at $19/month" },
  { feature: "Setup Time", traditional: "Weeks", launch99: "Minutes" },
  { feature: "Future-Proof", traditional: "Legacy architecture", launch99: "AI-native design" },
];

const ComparisonTable = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Why Brand Kit OS Beats Traditional Brand Kits</h2>
        </div>

        {/* Scrollable wrapper for mobile */}
        <div className="mx-auto max-w-4xl overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="border-2 border-border bg-card min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-1/3 font-bold">Feature</TableHead>
                  <TableHead className="w-1/3 text-center font-bold">Traditional Tools</TableHead>
                  <TableHead className="w-1/3 text-center font-bold text-chart-1">Brand Kit OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((row) => (
                  <TableRow key={row.feature} className="border-border">
                    <TableCell className="font-medium">{row.feature}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <X className="h-4 w-4 text-destructive shrink-0" />
                        <span className="text-left">{row.traditional}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-2 text-chart-2">
                        <Check className="h-4 w-4 shrink-0" />
                        <span className="text-left">{row.launch99}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Mobile scroll hint */}
        <p className="text-center text-xs text-muted-foreground mt-2 sm:hidden">
          ← Scroll to see more →
        </p>
      </div>
    </section>
  );
};

export default ComparisonTable;
