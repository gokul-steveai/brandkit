import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Check, FileArchive, FileText, FolderOpen } from 'lucide-react';
import { MarkdownExportResult } from './types';
import { useToast } from '@/hooks/useToast';

interface MarkdownExportResultsProps {
  result: MarkdownExportResult;
  brandKitId: string;
  onClose: () => void;
}

export function MarkdownExportResults({ result, brandKitId, onClose }: MarkdownExportResultsProps) {
  const { toast } = useToast();
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>(result.metadata.filesIncluded[0] || 'README.md');

  const copyToClipboard = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      toast({
        title: 'Copied to clipboard',
        description: `${fileName} copied successfully.`,
      });
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again or use manual selection.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadZip = () => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(result.zipBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.metadata.brandName.toLowerCase().replace(/\s+/g, '-')}-brand-kit.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: 'Your brand kit ZIP is downloading.',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download the ZIP file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadSingleFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.split('/').pop() || fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileContent = (fileName: string): string => {
    return result.files[fileName] || '';
  };

  // Group files by folder
  const groupedFiles: Record<string, string[]> = {};
  result.metadata.filesIncluded.forEach(file => {
    const parts = file.split('/');
    const folder = parts.length > 1 ? parts[0] : 'root';
    if (!groupedFiles[folder]) {
      groupedFiles[folder] = [];
    }
    groupedFiles[folder].push(file);
  });

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <h3 className="font-medium text-green-700 dark:text-green-400 mb-2">
          Markdown export generated successfully!
        </h3>
        <p className="text-sm text-muted-foreground">
          {result.metadata.filesIncluded.length} files ready for download.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileArchive className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{result.metadata.brandName} Brand Kit</h4>
              <p className="text-xs text-muted-foreground">
                {result.metadata.filesIncluded.length} markdown files
              </p>
            </div>
          </div>
          <Button onClick={handleDownloadZip} size="lg">
            <Download className="h-4 w-4 mr-2" />
            Download ZIP
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Preview Files</TabsTrigger>
          <TabsTrigger value="structure">Folder Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <div className="flex gap-4">
            <Card className="w-1/3 p-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {Object.entries(groupedFiles).map(([folder, files]) => (
                    <div key={folder}>
                      {folder !== 'root' && (
                        <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                          <FolderOpen className="h-3 w-3" />
                          {folder}/
                        </div>
                      )}
                      {files.map((file) => (
                        <button
                          key={file}
                          onClick={() => setSelectedFile(file)}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                            selectedFile === file 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted'
                          } ${folder !== 'root' ? 'ml-4' : ''}`}
                        >
                          <FileText className="h-3 w-3 inline mr-2" />
                          {file.split('/').pop()}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <Card className="flex-1 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{selectedFile}</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getFileContent(selectedFile), selectedFile)}
                  >
                    {copiedFile === selectedFile ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadSingleFile(selectedFile, getFileContent(selectedFile))}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[250px] w-full rounded-md border p-3">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {getFileContent(selectedFile)}
                </pre>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="structure">
          <Card className="p-4">
            <ScrollArea className="h-[300px]">
              <pre className="text-sm font-mono">
{`${result.metadata.brandName.toLowerCase().replace(/\s+/g, '-')}/
${result.metadata.filesIncluded.map((f, i) => 
  `${i === result.metadata.filesIncluded.length - 1 ? '└──' : '├──'} ${f}`
).join('\n')}`}
              </pre>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
