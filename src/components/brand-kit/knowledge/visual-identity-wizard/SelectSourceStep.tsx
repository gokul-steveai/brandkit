import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Palette, FileCode, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { ExtractedColor } from './types';
import { 
  extractColorsFromCSS, 
  extractColorsFromHTML, 
  detectFileType,
  ExtractedColor as ParserExtractedColor,
} from '@/lib/parsers/colorExtractor';
import { supabase } from '@/integrations/supabase/client';

interface SelectSourceStepProps {
  onColorsExtracted: (colors: ExtractedColor[], sourceType: 'file' | 'url', sourceUrl?: string) => void;
  onUseExisting: () => void;
  hasExistingColors: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Convert parser colors to wizard colors with id and isSelected
function toWizardColors(parserColors: ParserExtractedColor[], source: ExtractedColor['source']): ExtractedColor[] {
  return parserColors.map((c, i) => ({
    id: `${source}-${i}-${Date.now()}`,
    hex: c.hex,
    name: c.name,
    source,
    isSelected: true,
  }));
}

export function SelectSourceStep({ 
  onColorsExtracted, 
  onUseExisting,
  hasExistingColors 
}: SelectSourceStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
      return;
    }

    const fileType = detectFileType(file.name, file.type);
    if (fileType !== 'css' && fileType !== 'html') {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload a CSS or HTML file', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    try {
      const content = await file.text();
      let parserColors: ParserExtractedColor[] = [];

      if (fileType === 'css') {
        parserColors = extractColorsFromCSS(content);
      } else if (fileType === 'html') {
        parserColors = extractColorsFromHTML(content);
      }

      if (parserColors.length === 0) {
        toast({ title: 'No colors found', description: 'Could not extract any colors from the file', variant: 'destructive' });
        return;
      }

      const colors = toWizardColors(parserColors, fileType === 'css' ? 'css' : 'html');

      toast({ title: 'Colors extracted', description: `Found ${colors.length} colors` });
      onColorsExtracted(colors, 'file');
    } catch (error) {
      console.error('Error processing file:', error);
      toast({ title: 'Processing failed', description: 'Could not process the file', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUrlExtract = async () => {
    if (!urlInput.trim()) {
      toast({ title: 'Please enter a URL', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Use Firecrawl to scrape the URL with branding format
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { 
          url: urlInput.trim(),
          options: { formats: ['branding', 'html'] }
        },
      });

      if (error) throw error;

      const colors: ExtractedColor[] = [];

      // Extract from branding data
      if (data?.data?.branding?.colors) {
        const brandingColors = data.data.branding.colors;
        Object.entries(brandingColors).forEach(([name, hex], i) => {
          if (typeof hex === 'string' && hex.startsWith('#')) {
            colors.push({
              id: `branding-${name}-${i}-${Date.now()}`,
              hex: hex.toUpperCase(),
              name: name.replace(/([A-Z])/g, ' $1').trim(),
              source: 'branding',
              isSelected: true,
            });
          }
        });
      }

      // Also try to extract from HTML if available
      if (data?.data?.html) {
        const htmlParserColors = extractColorsFromHTML(data.data.html);
        const htmlColors = toWizardColors(htmlParserColors, 'html');
        htmlColors.forEach(c => {
          // Avoid duplicates
          if (!colors.some(existing => existing.hex.toUpperCase() === c.hex.toUpperCase())) {
            colors.push(c);
          }
        });
      }

      if (colors.length === 0) {
        toast({ title: 'No colors found', description: 'Could not extract colors from this URL', variant: 'destructive' });
        return;
      }

      toast({ title: 'Colors extracted', description: `Found ${colors.length} colors from website` });
      onColorsExtracted(colors, 'url', urlInput.trim());
    } catch (error) {
      console.error('Error extracting from URL:', error);
      toast({ title: 'Extraction failed', description: 'Could not extract colors from the URL', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="url" disabled={isLoading}>
            <Link className="mr-2 h-4 w-4" />
            From URL
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </TabsTrigger>
          {hasExistingColors && (
            <TabsTrigger value="existing" disabled={isLoading}>
              <Palette className="mr-2 h-4 w-4" />
              Use Existing
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="url" className="mt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter a website URL to extract brand colors
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={handleUrlExtract} disabled={isLoading || !urlInput.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  'Extract'
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Extracting colors...</p>
              </div>
            ) : (
              <>
                <FileCode className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Drag and drop a CSS or HTML file here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports CSS and HTML files (max 5MB)
                </p>
              </>
            )}
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".css,.html,.htm"
              disabled={isLoading}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </TabsContent>

        {hasExistingColors && (
          <TabsContent value="existing" className="mt-4">
            <div className="text-center py-8 space-y-4">
              <Palette className="mx-auto h-12 w-12 text-primary" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Start with colors already defined in your brand kit
                </p>
                <Button onClick={onUseExisting}>
                  Use Existing Colors
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
