import { useEffect, useState } from 'react';
import { User, Sparkles, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Persona {
  id: string;
  name: string;
  purpose_type: string;
  is_default: boolean;
  tasks: string[];
}

interface PersonaOverviewCardProps {
  brandKitId: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  content_creation: 'Content Creation',
  customer_support: 'Customer Support',
  internal_assistant: 'Internal Assistant',
  creative_brainstorming: 'Creative Brainstorming',
  custom: 'Custom',
};

export function PersonaOverviewCard({ brandKitId }: PersonaOverviewCardProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPersonas = async () => {
      const { data, error } = await supabase
        .from('brand_kit_personas')
        .select('id, name, purpose_type, is_default, tasks')
        .eq('brand_kit_id', brandKitId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (!error && data) {
        setPersonas(data as Persona[]);
      }
      setIsLoading(false);
    };

    fetchPersonas();
  }, [brandKitId]);

  const defaultPersona = personas.find(p => p.is_default) || personas[0];

  if (isLoading) {
    return (
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            AI Personas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (personas.length === 0) {
    return (
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            AI Personas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No personas configured yet. Personas define how AI assistants should behave when representing your brand.
          </p>
          <Button asChild className="w-full">
            <NavLink to={`/brand-kits/${brandKitId}/edit/personas`}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create First Persona
            </NavLink>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            AI Personas
          </CardTitle>
          <Badge variant="secondary">{personas.length} configured</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {personas.map((persona) => (
            <div key={persona.id} className="p-3 border-2 border-border bg-muted/30 rounded-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{persona.name}</span>
                  {persona.is_default && (
                    <Badge variant="outline" className="text-xs">Default</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {PURPOSE_LABELS[persona.purpose_type] || persona.purpose_type}
                </p>
                {Array.isArray(persona.tasks) && persona.tasks.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {persona.tasks.length} task{persona.tasks.length !== 1 ? 's' : ''} defined
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <Button asChild variant="outline" className="w-full justify-between">
          <NavLink to={`/brand-kits/${brandKitId}/edit/personas`}>
            <span>Manage Personas</span>
            <ChevronRight className="h-4 w-4" />
          </NavLink>
        </Button>
      </CardContent>
    </Card>
  );
}
