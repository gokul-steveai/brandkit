import { Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/useToast';

interface BasicInfoCardProps {
  formData: {
    name: string;
    tagline: string;
    description: string;
    website_url: string;
    status: 'draft' | 'active' | 'archived';
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onStatusChange: (value: string) => void;
  onExtractClick: () => void;
  isExtracting: boolean;
  userRole?: 'owner' | 'admin' | 'editor' | 'viewer' | null;
}

export function BasicInfoCard({
  formData,
  onInputChange,
  onStatusChange,
  onExtractClick,
  isExtracting,
  userRole,
}: BasicInfoCardProps) {
  const canChangeStatus = userRole === 'owner' || userRole === 'admin';

  const handleExtract = () => {
    if (!formData.website_url.trim()) {
      toast({ title: 'Please enter a website URL first', variant: 'destructive' });
      return;
    }
    onExtractClick();
  };

  const getStatusDisplayName = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Brand Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            name="tagline"
            placeholder="Your brand's tagline"
            value={formData.tagline}
            onChange={onInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Describe this brand..."
            value={formData.description}
            onChange={onInputChange}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website_url">Website URL</Label>
          <div className="flex gap-2">
            <Input
              id="website_url"
              name="website_url"
              type="url"
              placeholder="https://example.com"
              value={formData.website_url}
              onChange={onInputChange}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleExtract}
              disabled={isExtracting || !formData.website_url.trim()}
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-ai-sparkle" />
              )}
              <span className="ml-2 hidden sm:inline">Extract</span>
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="status">Status</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left">
                <div className="space-y-1">
                  <p><strong>Draft:</strong> Work in progress, not ready for export</p>
                  <p><strong>Active:</strong> Ready for use, can be exported and accessed via MCP API</p>
                  <p><strong>Archived:</strong> Deactivated, hidden from dashboard</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {canChangeStatus ? (
            <Select value={formData.status} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Input 
                    value={getStatusDisplayName(formData.status)} 
                    disabled 
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Only brand kit owners and admins can change the status
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
