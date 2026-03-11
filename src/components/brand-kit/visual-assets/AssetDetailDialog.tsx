import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Sparkles, 
  Copy, 
  Download, 
  Save,
  Loader2,
  Info,
  Palette,
  Camera,
  Sun,
  Layout,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VisualAsset, AssetType, ASSET_TYPES, AIAnalysis } from './types';
import { format } from 'date-fns';

interface AssetDetailDialogProps {
  asset: VisualAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AssetDetailDialog({ 
  asset, 
  open, 
  onOpenChange,
  onUpdate,
}: AssetDetailDialogProps) {
  const [title, setTitle] = useState(asset?.title || '');
  const [description, setDescription] = useState(asset?.description || '');
  const [assetType, setAssetType] = useState<AssetType>(asset?.asset_type as AssetType || 'other');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Update local state when asset changes (including after AI analysis)
  useEffect(() => {
    if (asset) {
      setTitle(asset.title || '');
      setDescription(asset.description || '');
      setAssetType(asset.asset_type as AssetType);
    }
  }, [asset, asset?.ai_analysis, asset?.description]);
  if (!asset) return null;

  const handleCopyUrl = async () => {
    if (asset.public_url) {
      await navigator.clipboard.writeText(asset.public_url);
      toast.success('URL copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (asset.public_url) {
      const link = document.createElement('a');
      link.href = asset.public_url;
      link.download = asset.file_name;
      link.click();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_visual_assets')
        .update({
          title,
          description,
          asset_type: assetType,
        })
        .eq('id', asset.id);

      if (error) throw error;
      toast.success('Asset updated');
      onUpdate();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!asset.public_url) {
      toast.error('No image URL available');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageUrl: asset.public_url,
          includeCharacter: true,
          includeObjects: true,
        },
      });

      if (error) throw error;

      if (data?.success && data?.analysis) {
        // Build a text description from the analysis
        const analysisDescription = [
          data.analysis.subjectAction,
          data.analysis.setting,
          data.analysis.moodStyle,
        ].filter(Boolean).join(' ');

        // Update the asset with AI analysis AND auto-populate description
        const { error: updateError } = await supabase
          .from('user_visual_assets')
          .update({ 
            ai_analysis: data.analysis,
            description: analysisDescription,
          })
          .eq('id', asset.id);

        if (updateError) throw updateError;

        // Update local state so user sees the change immediately
        setDescription(analysisDescription);

        toast.success('AI analysis complete!');
        onUpdate();
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatAnalysisAsMarkdown = (analysis: AIAnalysis): string => {
    const sections: string[] = [];
    
    if (analysis.subjectAction) {
      sections.push(`## Subject & Action\n${analysis.subjectAction}`);
    }
    
    if (analysis.setting) {
      sections.push(`## Setting\n${analysis.setting}`);
    }
    
    if (analysis.lighting) {
      sections.push(`## Lighting\n${analysis.lighting}`);
    }
    
    if (analysis.colorPalette?.topColors?.length) {
      const colors = analysis.colorPalette.topColors
        .map(c => `- **${c.name}**: ${c.hex}`)
        .join('\n');
      let colorSection = `## Color Palette\n${colors}`;
      if (analysis.colorPalette.additionalColors) {
        colorSection += `\n\n${analysis.colorPalette.additionalColors}`;
      }
      sections.push(colorSection);
    }
    
    if (analysis.moodStyle) {
      sections.push(`## Mood & Style\n${analysis.moodStyle}`);
    }
    
    if (analysis.characterDetails) {
      sections.push(`## Character Details\n${analysis.characterDetails}`);
    }
    
    if (analysis.objectInventory) {
      sections.push(`## Objects\n${analysis.objectInventory}`);
    }
    
    return sections.join('\n\n');
  };

  const analysis = asset.ai_analysis as AIAnalysis | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Image Preview */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {asset.public_url ? (
                <img
                  src={asset.public_url}
                  alt={asset.title || asset.file_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyUrl} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {/* File Info */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>File:</strong> {asset.file_name}</p>
              <p><strong>Size:</strong> {(asset.file_size_bytes / 1024).toFixed(1)} KB</p>
              <p><strong>Type:</strong> {asset.mime_type}</p>
              <p><strong>Uploaded:</strong> {format(new Date(asset.created_at), 'MMM d, yyyy h:mm a')}</p>
              {asset.expires_at && (
                <p><strong>Expires:</strong> {format(new Date(asset.expires_at), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>

          {/* Details & AI Analysis */}
          <div className="space-y-4">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="ai">
                  AI Analysis
                  {analysis && <Badge variant="secondary" className="ml-2 h-5">✓</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Asset title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Asset Type</Label>
                  <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                {!analysis ? (
                  <div className="text-center py-8 space-y-4">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h4 className="font-medium mb-2">Generate AI Description</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        AI will analyze your image and extract detailed information including 
                        colors, composition, lighting, and more.
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4 cursor-help">
                              <Info className="h-3 w-3" />
                              Why use AI description?
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              AI description helps Claude and other AI assistants understand 
                              your images without seeing them. The analysis includes color 
                              palette (with hex codes), composition, lighting, and mood - 
                              making it easier for AI to select the right image for any context.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2 text-ai-sparkle" />
                      )}
                      Analyze Image (1 credit)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Copy as Markdown Button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const markdown = formatAnalysisAsMarkdown(analysis);
                        await navigator.clipboard.writeText(markdown);
                        toast.success('AI analysis copied to clipboard');
                      }}
                      className="w-full"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy as Markdown
                    </Button>

                    {/* Subject & Action */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Camera className="h-4 w-4" />
                        Subject & Action
                      </div>
                      <p className="text-sm text-muted-foreground">{analysis.subjectAction}</p>
                    </div>

                    {/* Setting */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Layout className="h-4 w-4" />
                        Setting
                      </div>
                      <p className="text-sm text-muted-foreground">{analysis.setting}</p>
                    </div>

                    {/* Lighting */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sun className="h-4 w-4" />
                        Lighting
                      </div>
                      <p className="text-sm text-muted-foreground">{analysis.lighting}</p>
                    </div>

                    {/* Color Palette */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Palette className="h-4 w-4" />
                        Color Palette
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.colorPalette?.topColors?.map((color, i) => (
                          <div 
                            key={i}
                            className="flex items-center gap-2 px-2 py-1 border rounded text-xs"
                          >
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: color.hex }}
                            />
                            <span>{color.name}</span>
                            <span className="text-muted-foreground">{color.hex}</span>
                          </div>
                        ))}
                      </div>
                      {analysis.colorPalette?.additionalColors && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {analysis.colorPalette.additionalColors}
                        </p>
                      )}
                    </div>

                    {/* Mood & Style */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Mood & Style</div>
                      <p className="text-sm text-muted-foreground">{analysis.moodStyle}</p>
                    </div>

                    {/* Character Details */}
                    {analysis.characterDetails && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Character Details</div>
                        <p className="text-sm text-muted-foreground">{analysis.characterDetails}</p>
                      </div>
                    )}

                    {/* Object Inventory */}
                    {analysis.objectInventory && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Objects</div>
                        <p className="text-sm text-muted-foreground">{analysis.objectInventory}</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
