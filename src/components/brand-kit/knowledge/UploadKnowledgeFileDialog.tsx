import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Loader2, FileText, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';

interface UploadKnowledgeFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  onUploadComplete: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function UploadKnowledgeFileDialog({
  open,
  onOpenChange,
  brandKitId,
  onUploadComplete,
}: UploadKnowledgeFileDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file type', description: 'Please upload a PDF file', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (pdfUrl: string, fileName: string) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-knowledge-file', {
        body: { brandKitId, pdfUrl, fileName },
      });

      if (error) {
        throw new Error(error.message || 'Failed to process file');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({ title: 'Success', description: 'Document processed and saved successfully' });
      onUploadComplete();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Failed to process document',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast({ title: 'Missing URL', description: 'Please enter a PDF URL', variant: 'destructive' });
      return;
    }

    try {
      const url = new URL(urlInput);
      const fileName = url.pathname.split('/').pop() || 'document.pdf';
      await processFile(urlInput, fileName);
    } catch {
      toast({ title: 'Invalid URL', description: 'Please enter a valid URL', variant: 'destructive' });
    }
  };

  const handleFileSubmit = async () => {
    if (!selectedFile) {
      toast({ title: 'No file selected', description: 'Please select a PDF file', variant: 'destructive' });
      return;
    }

    // Upload to temporary storage first, then process
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a temporary upload path
      const tempPath = `${brandKitId}/${user.id}/temp/${Date.now()}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('knowledge_files')
        .upload(tempPath, selectedFile, {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

      // Get the public URL for processing
      const { data: urlData } = supabase.storage
        .from('knowledge_files')
        .getPublicUrl(tempPath);

      await processFile(urlData.publicUrl, selectedFile.name);

      // Clean up temp file
      await supabase.storage.from('knowledge_files').remove([tempPath]);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setUrlInput('');
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Knowledge Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document to be transcribed and added to your knowledge base.
            Maximum file size: 5MB, maximum pages: 25.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" disabled={isProcessing}>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url" disabled={isProcessing}>
              <Link className="mr-2 h-4 w-4" />
              From URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              } ${selectedFile ? 'border-green-500 bg-green-500/5' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-green-500" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a PDF file here, or click to browse
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </Label>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>PDF files only. Maximum 5MB and 25 pages.</p>
            </div>

            <Button
              onClick={handleFileSubmit}
              disabled={!selectedFile || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Upload & Process'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-url">PDF URL</Label>
              <Input
                id="pdf-url"
                type="url"
                placeholder="https://example.com/document.pdf"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Enter a direct link to a PDF file. The file must be publicly accessible.</p>
            </div>

            <Button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process from URL'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
