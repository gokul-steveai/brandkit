import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, ExternalLink } from 'lucide-react';
import { useBrandKit } from '@/hooks/useBrandKits';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 border-2 border-border flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground font-mono">{color}</p>
      </div>
    </div>
  );
}

export default function BrandKitDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: brandKit, isLoading } = useBrandKit(id || '');
  const { canEdit } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!brandKit) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Brand kit not found</p>
        <Button asChild variant="outline">
          <Link to="/brand-kits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Brand Kits
          </Link>
        </Button>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-primary text-primary-foreground',
    archived: 'bg-accent text-accent-foreground'
  };

  const hasColors = brandKit.primary_color || brandKit.secondary_color || brandKit.accent_color || 
                    brandKit.background_color || brandKit.text_primary_color;
  
  const hasTypography = brandKit.heading_font || brandKit.body_font || brandKit.paragraph_font;
  
  const hasFontSizes = brandKit.font_sizes && typeof brandKit.font_sizes === 'object' && Object.keys(brandKit.font_sizes).length > 0;
  
  const hasPersonality = brandKit.personality && typeof brandKit.personality === 'object' && Object.keys(brandKit.personality).length > 0;
  
  const personality = brandKit.personality as { tone?: string; energy?: string; targetAudience?: string } | null;
  const spacing = brandKit.spacing as { baseUnit?: number; borderRadius?: string } | null;
  const fontSizes = brandKit.font_sizes as Record<string, string> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/brand-kits">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{brandKit.name}</h1>
              <Badge className={statusColors[brandKit.status]} variant="secondary">
                {brandKit.status}
              </Badge>
              {brandKit.color_scheme && (
                <Badge variant="outline">{brandKit.color_scheme} mode</Badge>
              )}
            </div>
            {brandKit.tagline && (
              <p className="text-muted-foreground italic">"{brandKit.tagline}"</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {brandKit.website_url && (
            <Button variant="outline" asChild>
              <a href={brandKit.website_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Website
              </a>
            </Button>
          )}
          {canEdit && (
            <Button asChild>
              <Link to={`/brand-kits/${brandKit.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg">Completion Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={brandKit.completion_percentage} className="flex-1 h-3" />
            <span className="font-bold text-lg">{brandKit.completion_percentage}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {brandKit.summary && (
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{brandKit.summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Colors */}
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasColors ? (
              <div className="space-y-3">
                {brandKit.primary_color && <ColorSwatch color={brandKit.primary_color} label="Primary" />}
                {brandKit.secondary_color && <ColorSwatch color={brandKit.secondary_color} label="Secondary" />}
                {brandKit.accent_color && <ColorSwatch color={brandKit.accent_color} label="Accent" />}
                {brandKit.background_color && <ColorSwatch color={brandKit.background_color} label="Background" />}
                {brandKit.text_primary_color && <ColorSwatch color={brandKit.text_primary_color} label="Text Primary" />}
                {brandKit.text_secondary_color && <ColorSwatch color={brandKit.text_secondary_color} label="Text Secondary" />}
                {brandKit.link_color && <ColorSwatch color={brandKit.link_color} label="Link" />}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No colors defined</p>
            )}
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Typography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasTypography ? (
              <div className="space-y-3">
                {brandKit.heading_font && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Heading Font</p>
                    <p className="text-lg" style={{ fontFamily: brandKit.heading_font }}>
                      {brandKit.heading_font}
                    </p>
                  </div>
                )}
                {brandKit.body_font && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Body Font</p>
                    <p className="text-lg" style={{ fontFamily: brandKit.body_font }}>
                      {brandKit.body_font}
                    </p>
                  </div>
                )}
                {brandKit.paragraph_font && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paragraph/Code Font</p>
                    <p className="text-lg" style={{ fontFamily: brandKit.paragraph_font }}>
                      {brandKit.paragraph_font}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No typography defined</p>
            )}
          </CardContent>
        </Card>

        {/* Font Sizes */}
        {hasFontSizes && (
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="text-lg">Font Sizes</CardTitle>
            </CardHeader>
          <CardContent>
              <div className="space-y-2">
                {fontSizes && Object.entries(fontSizes).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm font-medium uppercase">{key}</span>
                    <span className="text-sm font-mono text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personality */}
        {hasPersonality && (
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="text-lg">Brand Personality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {personality?.tone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tone</p>
                    <p className="text-lg capitalize">{personality.tone}</p>
                  </div>
                )}
                {personality?.energy && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Energy</p>
                    <p className="text-lg capitalize">{personality.energy}</p>
                  </div>
                )}
                {personality?.targetAudience && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Target Audience</p>
                    <p className="text-sm">{personality.targetAudience}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logo */}
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Logo</CardTitle>
          </CardHeader>
          <CardContent>
            {brandKit.logo_url ? (
              <div className="flex items-center justify-center p-4 bg-muted">
                <img
                  src={brandKit.logo_url}
                  alt={`${brandKit.name} logo`}
                  className="max-h-24 max-w-full object-contain"
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No logo uploaded</p>
            )}
            {brandKit.favicon_url && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Favicon</p>
                <img
                  src={brandKit.favicon_url}
                  alt="Favicon"
                  className="h-8 w-8 object-contain"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand Voice */}
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Brand Voice</CardTitle>
          </CardHeader>
          <CardContent>
            {brandKit.brand_voice ? (
              <p className="text-sm">{brandKit.brand_voice}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No brand voice defined</p>
            )}
          </CardContent>
        </Card>

        {/* Spacing */}
        {brandKit.spacing && Object.keys(brandKit.spacing).length > 0 && (
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="text-lg">Spacing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {spacing?.baseUnit && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Base Unit</span>
                    <span className="text-sm font-mono text-muted-foreground">{spacing.baseUnit}px</span>
                  </div>
                )}
                {spacing?.borderRadius && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Border Radius</span>
                    <span className="text-sm font-mono text-muted-foreground">{spacing.borderRadius}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description */}
      {brandKit.description && (
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{brandKit.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
