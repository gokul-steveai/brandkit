import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Sparkles, 
  Copy, 
  Trash2,
  Download,
  Clock,
  Loader2,
  Check,
} from 'lucide-react';
import { VisualAsset, ASSET_TYPES } from './types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VisualAssetCardProps {
  asset: VisualAsset;
  onView: (asset: VisualAsset) => void;
  onAnalyze: (asset: VisualAsset) => void;
  onDelete: (asset: VisualAsset) => void;
  isAnalyzing?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function VisualAssetCard({ asset, onView, onAnalyze, onDelete, isAnalyzing = false }: VisualAssetCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const assetTypeLabel = ASSET_TYPES.find(t => t.value === asset.asset_type)?.label || 'Other';
  const isExpired = asset.expires_at && new Date(asset.expires_at) < new Date();
  const hasAnalysis = !!asset.ai_analysis;

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

  const handleAIButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnalyzing) return;
    
    if (hasAnalysis) {
      onView(asset);
    } else {
      onAnalyze(asset);
    }
  };

  return (
    <Card className="group relative overflow-hidden">
      {/* Image Preview */}
      <div 
        className="aspect-square bg-muted cursor-pointer relative"
        onClick={() => onView(asset)}
      >
        {!imageError && asset.public_url ? (
          <img
            src={asset.public_url}
            alt={asset.title || asset.file_name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-xs">No preview</span>
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => onView(asset)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>

        {/* AI Status Button */}
        <button
          onClick={handleAIButtonClick}
          disabled={isAnalyzing}
          className={cn(
            "absolute top-2 left-2 p-1.5 rounded-md flex items-center gap-1 text-xs font-medium transition-colors",
            hasAnalysis 
              ? "bg-success text-success-foreground"
              : isAnalyzing 
                ? "bg-warning text-warning-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          aria-label={hasAnalysis ? "View AI analysis" : isAnalyzing ? "Analyzing..." : "Generate AI analysis"}
          title={hasAnalysis ? "View AI analysis" : isAnalyzing ? "Analyzing..." : "Click to analyze"}
        >
          {isAnalyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : hasAnalysis ? (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <Check className="h-3 w-3" />
            </>
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Expired Badge */}
        {isExpired && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Expired
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate" title={asset.title || asset.file_name}>
              {asset.title || asset.file_name}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="text-xs">
                {assetTypeLabel}
              </Badge>
              <span>{formatBytes(asset.file_size_bytes)}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(asset)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onAnalyze(asset)}
                disabled={isAnalyzing}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {hasAnalysis ? 'Re-analyze Image' : 'Generate AI Description'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(asset)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Expiration info */}
        {asset.expires_at && !isExpired && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Expires {format(new Date(asset.expires_at), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
