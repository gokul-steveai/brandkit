import { Edit, Trash2, Star, Quote, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Persona } from './types';

interface AudiencePersonaCardProps {
  persona: Persona;
  onEdit: (persona: Persona) => void;
  onDelete: (id: string) => void;
}

export function AudiencePersonaCard({ persona, onEdit, onDelete }: AudiencePersonaCardProps) {
  const getSourceBadge = () => {
    if (persona.source === 'report') {
      return <Badge variant="secondary" className="text-xs"><FileText className="h-3 w-3 mr-1" />From Report</Badge>;
    }
    if (persona.source === 'ai_generated') {
      return <Badge variant="secondary" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />AI Generated</Badge>;
    }
    return null;
  };

  return (
    <Card className="border-2 border-border group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{persona.persona_name}</CardTitle>
              {persona.is_primary && (
                <Star className="h-4 w-4 text-primary fill-primary" />
              )}
              {getSourceBadge()}
            </div>
            {persona.persona_title && (
              <CardDescription>{persona.persona_title}</CardDescription>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={() => onEdit(persona)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => persona.id && onDelete(persona.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {persona.demographics.age_range && (
          <div className="text-sm">
            <span className="text-muted-foreground">Age: </span>
            {persona.demographics.age_range}
          </div>
        )}
        {persona.demographics.location && (
          <div className="text-sm">
            <span className="text-muted-foreground">Location: </span>
            {persona.demographics.location}
          </div>
        )}
        {persona.professional_context.job_title && (
          <div className="text-sm">
            <span className="text-muted-foreground">Role: </span>
            {persona.professional_context.job_title}
          </div>
        )}
        
        {/* Representative Quote - Phase 5 */}
        {persona.representative_quote && (
          <div className="flex items-start gap-2 p-2 rounded bg-muted/50 text-sm italic">
            <Quote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>"{persona.representative_quote}"</span>
          </div>
        )}
        
        {/* Content that Resonates - Phase 5 */}
        {persona.content_that_resonates && (
          <div className="text-sm">
            <span className="text-muted-foreground">Content that resonates: </span>
            <span className="text-xs">{persona.content_that_resonates.substring(0, 100)}{persona.content_that_resonates.length > 100 ? '...' : ''}</span>
          </div>
        )}
        
        {persona.goals_motivations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.goals_motivations.slice(0, 2).map((goal, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{goal}</Badge>
            ))}
            {persona.goals_motivations.length > 2 && (
              <Badge variant="secondary" className="text-xs">+{persona.goals_motivations.length - 2}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
