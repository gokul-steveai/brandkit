import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Link, FileText, FileJson, FileCode, X, FileEdit, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { 
  UploadedFile, 
  FileType, 
  getFileTypeFromMime, 
  getFileTypeFromExtension,
  MAX_FILE_SIZE 
} from './types';

interface SelectFileStepProps {
  onFileSelected: (file: UploadedFile) => void;
}

export function SelectFileStep({ onFileSelected }: SelectFileStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Detect if running in iframe (embedded preview)
  const [isEmbedded, setIsEmbedded] = useState(false);
  
  useEffect(() => {
    try {
      setIsEmbedded(window.self !== window.top);
    } catch {
      // If we can't access window.top due to cross-origin, we're likely embedded
      setIsEmbedded(true);
    }
  }, []);
  
  // Paste text state
  const [pastedContent, setPastedContent] = useState('');
  const [pastedFileName, setPastedFileName] = useState('');
  const [pastedType, setPastedType] = useState<'markdown' | 'json'>('markdown');
  
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    } else if (isEmbedded) {
      // File selection was cancelled or blocked - show helpful message if embedded
      toast({
        title: 'File selection may be blocked',
        description: 'Try opening the app in a new tab if uploads aren\'t working.',
        variant: 'destructive',
      });
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };
  
  const openInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  const validateFile = (file: File): FileType | null => {
    // Check size
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
      return null;
    }

    // Check type
    let fileType = getFileTypeFromMime(file.type);
    if (!fileType) {
      fileType = getFileTypeFromExtension(file.name);
    }

    if (!fileType) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload a PDF, JSON, or Markdown file', 
        variant: 'destructive' 
      });
      return null;
    }

    return fileType;
  };

  const readFileContent = async (file: File): Promise<string | null> => {
    const fileType = getFileTypeFromMime(file.type) || getFileTypeFromExtension(file.name);
    
    if (fileType === 'pdf') {
      // For PDFs, we'll handle content extraction differently
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    const fileType = validateFile(file);
    if (!fileType) return;

    setSelectedFile(file);
    const content = await readFileContent(file);

    onFileSelected({
      file,
      url: null,
      content,
      fileType,
      originalFileName: file.name,
    });
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast({ title: 'Please enter a URL', variant: 'destructive' });
      return;
    }

    const fileType = getFileTypeFromExtension(urlInput);
    if (!fileType) {
      toast({ 
        title: 'Invalid file type', 
        description: 'URL must point to a PDF, JSON, or Markdown file', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoadingUrl(true);
    try {
      const response = await fetch(urlInput);
      if (!response.ok) throw new Error('Failed to fetch file');

      const blob = await response.blob();
      if (blob.size > MAX_FILE_SIZE) {
        toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
        return;
      }

      let content: string | null = null;
      if (fileType !== 'pdf') {
        content = await blob.text();
      }

      const fileName = urlInput.split('/').pop() || 'document';

      onFileSelected({
        file: new File([blob], fileName, { type: blob.type }),
        url: urlInput,
        content,
        fileType,
        originalFileName: fileName,
      });
    } catch (error) {
      console.error('Error fetching URL:', error);
      toast({ title: 'Failed to fetch file', description: 'Could not download the file from the URL', variant: 'destructive' });
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handlePastedContentChange = (value: string) => {
    setPastedContent(value);
    // Auto-detect if it looks like JSON
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      try {
        JSON.parse(value);
        setPastedType('json');
      } catch {
        // Keep current type if not valid JSON
      }
    }
  };

  const handlePastedSubmit = () => {
    if (!pastedContent.trim() || !pastedFileName.trim()) {
      toast({ title: 'Please enter content and a document name', variant: 'destructive' });
      return;
    }

    // Validate JSON if that type is selected
    if (pastedType === 'json') {
      try {
        JSON.parse(pastedContent);
      } catch {
        toast({ title: 'Invalid JSON', description: 'Please check your JSON syntax', variant: 'destructive' });
        return;
      }
    }

    const ext = pastedType === 'json' ? '.json' : '.md';
    const cleanName = pastedFileName.replace(/\.(json|md|markdown)$/i, '');
    const fileName = `${cleanName}${ext}`;
    const mimeType = pastedType === 'json' ? 'application/json' : 'text/markdown';
    
    const blob = new Blob([pastedContent], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    onFileSelected({
      file,
      url: null,
      content: pastedContent,
      fileType: pastedType,
      originalFileName: fileName,
    });
  };

  const getFileIcon = (fileType: FileType) => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-8 w-8 text-destructive" />;
      case 'json': return <FileJson className="h-8 w-8 text-primary" />;
      case 'markdown': return <FileCode className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link className="mr-2 h-4 w-4" />
            From URL
          </TabsTrigger>
          <TabsTrigger value="paste">
            <FileEdit className="mr-2 h-4 w-4" />
            Paste Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4 space-y-4">
          {isEmbedded && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">
                  File uploads may be blocked in embedded preview.
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openInNewTab}
                  className="ml-2 shrink-0"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open in new tab
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                {getFileIcon(getFileTypeFromExtension(selectedFile.name) || 'markdown')}
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Drag and drop your file here
                </p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={handleBrowseClick}
                  type="button"
                >
                  Browse files
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Supports PDF, JSON, and Markdown files (max 5MB)
                </p>
              </>
            )}
            {/* Hidden file input - triggered by button click for better browser compatibility */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="application/pdf,.pdf,application/json,.json,text/plain,.txt,text/markdown,.md,.markdown"
              onChange={handleFileInputChange}
            />
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter a URL to a PDF, JSON, or Markdown file
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/document.pdf"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoadingUrl}
              />
              <Button onClick={handleUrlSubmit} disabled={isLoadingUrl || !urlInput.trim()}>
                {isLoadingUrl ? 'Loading...' : 'Fetch'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="paste" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paste-filename">Document Name</Label>
              <Input
                id="paste-filename"
                placeholder="e.g., brand-guidelines"
                value={pastedFileName}
                onChange={(e) => setPastedFileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <RadioGroup 
                value={pastedType} 
                onValueChange={(v) => setPastedType(v as 'markdown' | 'json')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="markdown" id="markdown" />
                  <Label htmlFor="markdown" className="cursor-pointer font-normal">Markdown</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="cursor-pointer font-normal">JSON</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paste-content">Content</Label>
              <Textarea
                id="paste-content"
                placeholder={pastedType === 'json' 
                  ? '{\n  "key": "value"\n}' 
                  : '# Document Title\n\nYour content here...'
                }
                value={pastedContent}
                onChange={(e) => handlePastedContentChange(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {pastedContent.length} characters
              </p>
            </div>

            <Button 
              onClick={handlePastedSubmit} 
              disabled={!pastedContent.trim() || !pastedFileName.trim()}
              className="w-full"
            >
              Continue with Pasted Content
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
