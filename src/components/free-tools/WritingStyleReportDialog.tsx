import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Printer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface WritingStyleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Record<string, unknown> | null;
}

function formatSectionTitle(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatObjectAsMarkdown(obj: unknown, depth = 0): string {
  if (obj === null || obj === undefined) return '';
  
  if (typeof obj === 'string') return obj + '\n\n';
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj) + '\n\n';
  
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') return `- ${item}`;
      if (typeof item === 'object') return formatObjectAsMarkdown(item, depth + 1);
      return `- ${String(item)}`;
    }).join('\n') + '\n\n';
  }
  
  if (typeof obj === 'object') {
    let result = '';
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const headerLevel = Math.min(depth + 3, 6);
      const header = '#'.repeat(headerLevel);
      result += `${header} ${formatSectionTitle(key)}\n\n`;
      result += formatObjectAsMarkdown(value, depth + 1);
    }
    return result;
  }
  
  return '';
}

function convertReportToMarkdown(report: Record<string, unknown>): string {
  if (!report) return '';
  
  // Check for common title keys
  const titleKey = Object.keys(report).find(k => 
    k.toLowerCase().includes('title') || k.toLowerCase() === 'name'
  );
  const title = titleKey ? String(report[titleKey]) : 'Writing Style Report';
  
  let markdown = `# ${title}\n\n`;
  
  for (const [key, value] of Object.entries(report)) {
    // Skip title key since we already used it
    if (key === titleKey) continue;
    
    // Skip metadata keys
    if (key.toLowerCase() === 'id' || key.toLowerCase() === 'createdat') continue;
    
    markdown += `## ${formatSectionTitle(key)}\n\n`;
    markdown += formatObjectAsMarkdown(value, 0);
  }
  
  return markdown;
}

function downloadAsMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function WritingStyleReportDialog({ 
  open, 
  onOpenChange, 
  report 
}: WritingStyleReportDialogProps) {
  if (!report) return null;
  
  const markdown = convertReportToMarkdown(report);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] print:max-w-none print:max-h-none print:shadow-none print:border-none">
        <DialogHeader className="flex flex-row items-center justify-between print:hidden">
          <DialogTitle>Writing Style Report</DialogTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadAsMarkdown(markdown, 'writing-style-report.md')}
            >
              <Download className="h-4 w-4 mr-2" />
              Markdown
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4 print:h-auto print:overflow-visible">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}