import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquareText, 
  Eye, 
  Settings2, 
  Download, 
  AlertCircle,
  History,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessagingFrameworkWizard } from './messaging-framework-wizard';
import { 
  type BrandKitDataCompleteness,
  type MessagingFrameworkSpec
} from '@/lib/messaging-frameworks';

interface MessagingFrameworkCardProps {
  brandKitId: string;
  brandKitName: string;
  dataCompleteness: BrandKitDataCompleteness;
  latestSpec: MessagingFrameworkSpec | null;
  specCount: number;
  onUpdate: () => void;
}

export function MessagingFrameworkCard({ 
  brandKitId,
  brandKitName,
  dataCompleteness,
  latestSpec,
  specCount,
  onUpdate
}: MessagingFrameworkCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleDownload = () => {
    if (!latestSpec) return;
    
    const blob = new Blob([latestSpec.contentMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brandKitName.toLowerCase().replace(/\s+/g, '-')}-messaging-frameworks-v${latestSpec.version}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canGenerate = dataCompleteness.canGenerate;
  const hasExistingSpec = !!latestSpec;

  return (
    <>
      <Card className={`p-4 ${canGenerate ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${canGenerate ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            <MessageSquareText className={`h-5 w-5 ${canGenerate ? 'text-primary' : 'text-destructive'}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium">Messaging Framework Spec</h3>
              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Generated
              </Badge>
              {hasExistingSpec ? (
                <Badge variant="secondary" className="text-xs">
                  v{latestSpec.version}
                </Badge>
              ) : canGenerate ? (
                <Badge variant="outline" className="text-xs">
                  Ready to Generate
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Missing Data
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {canGenerate 
                ? 'Machine-ingestible messaging frameworks populated with your brand data.'
                : 'Complete required brand data to generate your messaging framework specification.'}
            </p>

            {/* Completeness indicator */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Data completeness</span>
                <span className={dataCompleteness.completenessScore >= 62 ? 'text-primary' : 'text-destructive'}>
                  {dataCompleteness.completenessScore}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    dataCompleteness.completenessScore >= 62 ? 'bg-primary' : 'bg-destructive'
                  }`}
                  style={{ width: `${dataCompleteness.completenessScore}%` }}
                />
              </div>
            </div>

            {/* Missing data warnings */}
            {!canGenerate && dataCompleteness.missingRequired.length > 0 && (
              <div className="mb-3 p-2 bg-destructive/10 rounded-md">
                <p className="text-xs font-medium text-destructive mb-1">Required data missing:</p>
                <ul className="text-xs text-destructive/80 list-disc list-inside">
                  {dataCompleteness.missingRequired.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stats when spec exists */}
            {hasExistingSpec && (
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                <span>{latestSpec.selectedFrameworks.length} frameworks</span>
                <span>•</span>
                <span>{latestSpec.selectionMethod === 'ai_recommended' ? 'AI-selected' : 'Manual selection'}</span>
                <span>•</span>
                <span>{specCount} version{specCount !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {hasExistingSpec && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              )}
              <Button 
                variant={hasExistingSpec ? "outline" : "default"} 
                size="sm"
                onClick={() => setWizardOpen(true)}
                disabled={!canGenerate}
              >
                <Settings2 className="h-4 w-4 mr-1" />
                {hasExistingSpec ? 'Regenerate' : 'Generate'}
              </Button>
              {hasExistingSpec && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
              {specCount > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                >
                  <History className="h-4 w-4 mr-1" />
                  History
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Preview Dialog */}
      {latestSpec && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Messaging Framework Specification v{latestSpec.version}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {latestSpec.contentMarkdown}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Generation Wizard */}
      <MessagingFrameworkWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        brandKitId={brandKitId}
        brandKitName={brandKitName}
        onComplete={onUpdate}
      />
    </>
  );
}
