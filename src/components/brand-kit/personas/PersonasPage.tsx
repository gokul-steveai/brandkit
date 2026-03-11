import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { User, Sparkles, MoreVertical, Star, Trash2 } from 'lucide-react';
import { BrandKit } from '@/hooks/useBrandKits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { CreatePersonaDialog } from './CreatePersonaDialog';
import { ViewPersonaDialog } from './ViewPersonaDialog';

interface Persona {
  id: string;
  name: string;
  purpose_type: string;
  role_definition: string | null;
  function_description: string | null;
  personality_description: string | null;
  is_default: boolean;
  is_active: boolean;
  tasks: string[];
  behavioral_rules: string[];
  tone_overrides: Record<string, unknown> | null;
}

const PURPOSE_LABELS: Record<string, string> = {
  content_creation: 'Content Creation',
  customer_support: 'Customer Support',
  internal_assistant: 'Internal Assistant',
  creative_brainstorming: 'Creative Brainstorming',
  custom: 'Custom',
};

const PURPOSE_COLORS: Record<string, string> = {
  content_creation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  customer_support: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  internal_assistant: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  creative_brainstorming: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function PersonasPage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const [searchParams] = useSearchParams();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Open dialog if ?create=true is in URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const fetchPersonas = async () => {
    const { data, error } = await supabase
      .from('brand_kit_personas')
      .select('*')
      .eq('brand_kit_id', brandKit.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPersonas(data as Persona[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPersonas();
  }, [brandKit.id]);

  const handleSetDefault = async (personaId: string) => {
    // First, unset all defaults
    await supabase
      .from('brand_kit_personas')
      .update({ is_default: false })
      .eq('brand_kit_id', brandKit.id);

    // Then set the new default
    const { error } = await supabase
      .from('brand_kit_personas')
      .update({ is_default: true })
      .eq('id', personaId);

    if (error) {
      toast({ title: 'Failed to set default', variant: 'destructive' });
    } else {
      toast({ title: 'Default persona updated' });
      fetchPersonas();
    }
  };

  const handleDelete = async (personaId: string) => {
    const { error } = await supabase
      .from('brand_kit_personas')
      .delete()
      .eq('id', personaId);

    if (error) {
      toast({ title: 'Failed to delete persona', variant: 'destructive' });
    } else {
      toast({ title: 'Persona deleted' });
      fetchPersonas();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <CreatePersonaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        brandKitId={brandKit.id}
        onPersonaCreated={fetchPersonas}
      />

      {personas.length === 0 ? (
        <Card className="border-2 border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Personas Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Personas define how AI assistants should communicate and behave when representing your brand. 
              Create your first persona to get started.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4 text-ai-sparkle" />
              Create with AI
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => (
              <Card 
                key={persona.id} 
                className="border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedPersona(persona);
                  setIsViewDialogOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{persona.name}</CardTitle>
                        {persona.is_default && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <Badge className={PURPOSE_COLORS[persona.purpose_type] || PURPOSE_COLORS.custom}>
                        {PURPOSE_LABELS[persona.purpose_type] || persona.purpose_type}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!persona.is_default && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(persona.id);
                          }}>
                            <Star className="mr-2 h-4 w-4" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(persona.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {persona.function_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {persona.function_description}
                    </p>
                  )}
                  {Array.isArray(persona.tasks) && persona.tasks.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {persona.tasks.length} task{persona.tasks.length !== 1 ? 's' : ''} defined
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <ViewPersonaDialog
            open={isViewDialogOpen}
            onOpenChange={setIsViewDialogOpen}
            persona={selectedPersona}
            onPersonaUpdated={fetchPersonas}
          />
        </>
      )}
    </div>
  );
}
