import { Link } from 'react-router-dom';
import { MoreHorizontal, Trash2, Edit, ExternalLink, Check, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BrandKit } from '@/hooks/useBrandKits';
import { useAuth } from '@/contexts/AuthContext';

interface BrandKitCardProps {
  brandKit: BrandKit;
  onDelete: (id: string) => void;
  onActivate?: (id: string) => void;
  isOwnerOrAdmin?: boolean;
}

export function BrandKitCard({ brandKit, onDelete, onActivate, isOwnerOrAdmin = true }: BrandKitCardProps) {
  const { canEdit, canDelete } = useAuth();

  const statusConfig = {
    draft: { color: 'bg-muted text-muted-foreground', tooltip: 'Work in progress' },
    active: { color: 'bg-primary text-primary-foreground', tooltip: 'Ready for export & MCP' },
    archived: { color: 'bg-accent text-accent-foreground', tooltip: 'Hidden from dashboard' }
  };

  return (
    <Card className="border-2 border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg font-bold truncate">{brandKit.name}</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={statusConfig[brandKit.status].color} variant="secondary">
                {brandKit.status}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {statusConfig[brandKit.status].tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        
        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem asChild>
                  <Link to={`/brand-kits/${brandKit.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {brandKit.website_url && (
                <DropdownMenuItem asChild>
                  <a href={brandKit.website_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visit Website
                  </a>
                </DropdownMenuItem>
              )}
              {isOwnerOrAdmin && brandKit.status === 'draft' && onActivate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onActivate(brandKit.id)}
                    className="text-primary focus:text-primary"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(brandKit.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {brandKit.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {brandKit.description}
          </p>
        )}
        
        {/* Color Preview */}
        <div className="flex gap-1">
          {brandKit.primary_color && (
            <div
              className="h-6 w-6 border-2 border-border"
              style={{ backgroundColor: brandKit.primary_color }}
              title="Primary"
            />
          )}
          {brandKit.secondary_color && (
            <div
              className="h-6 w-6 border-2 border-border"
              style={{ backgroundColor: brandKit.secondary_color }}
              title="Secondary"
            />
          )}
          {brandKit.accent_color && (
            <div
              className="h-6 w-6 border-2 border-border"
              style={{ backgroundColor: brandKit.accent_color }}
              title="Accent"
            />
          )}
        </div>
        
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">{brandKit.completion_percentage}%</span>
          </div>
          <Progress value={brandKit.completion_percentage} className="h-2" />
        </div>
        
        <Button asChild variant="outline" className="w-full">
          <Link to={`/brand-kits/${brandKit.id}/edit/overview`}>View Details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
