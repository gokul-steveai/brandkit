import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { User, PenTool, HeadphonesIcon, Building2, Lightbulb } from 'lucide-react';

interface PersonaSelectionStepProps {
  selectedPersonaId: string | null;
  onPersonaChange: (personaId: string | null) => void;
}

interface Persona {
  id: string;
  name: string;
  purpose_type: string;
  role_definition?: string | null;
  function_description?: string | null;
  tasks?: string[];
  is_default?: boolean;
  source: 'brand_kit' | 'library';
}

const purposeIcons: Record<string, React.ReactNode> = {
  content_creation: <PenTool className="h-5 w-5" />,
  customer_support: <HeadphonesIcon className="h-5 w-5" />,
  internal_assistant: <Building2 className="h-5 w-5" />,
  creative_brainstorming: <Lightbulb className="h-5 w-5" />,
};

const purposeLabels: Record<string, string> = {
  content_creation: 'Content',
  customer_support: 'Support',
  internal_assistant: 'Internal',
  creative_brainstorming: 'Creative',
};

export function PersonaSelectionStep({
  selectedPersonaId,
  onPersonaChange,
}: PersonaSelectionStepProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPersonas() {
      if (!brandKitId) return;
      
      setIsLoading(true);
      try {
        // Fetch brand kit personas
        const { data: brandKitPersonas, error: bkError } = await supabase
          .from('brand_kit_personas')
          .select('*')
          .eq('brand_kit_id', brandKitId)
          .eq('is_active', true);

        if (bkError) throw bkError;

        // If no brand kit personas, fetch library personas as templates
        if (!brandKitPersonas || brandKitPersonas.length === 0) {
          const { data: libraryPersonas, error: libError } = await supabase
            .from('library_personas')
            .select('*')
            .eq('is_library', true);

          if (libError) throw libError;

          const mapped: Persona[] = (libraryPersonas || []).map(p => ({
            id: p.id,
            name: p.name,
            purpose_type: p.purpose_type,
            role_definition: p.role_definition_template,
            function_description: p.function_description_template,
            tasks: p.tasks as string[] || [],
            is_default: false,
            source: 'library' as const,
          }));
          setPersonas(mapped);
        } else {
          const mapped: Persona[] = brandKitPersonas.map(p => ({
            id: p.id,
            name: p.name,
            purpose_type: p.purpose_type,
            role_definition: p.role_definition,
            function_description: p.function_description,
            tasks: p.tasks as string[] || [],
            is_default: p.is_default || false,
            source: 'brand_kit' as const,
          }));
          setPersonas(mapped);

          // Auto-select default persona
          const defaultPersona = mapped.find(p => p.is_default);
          if (defaultPersona && !selectedPersonaId) {
            onPersonaChange(defaultPersona.id);
          }
        }
      } catch (error) {
        console.error('Error fetching personas:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPersonas();
  }, [brandKitId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const hasPersonas = personas.length > 0;
  const selectedValue = selectedPersonaId || 'none';

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Select a Persona</Label>
        <p className="text-sm text-muted-foreground mb-4">
          {hasPersonas 
            ? 'Choose how your AI assistant will communicate and behave'
            : 'No personas configured yet. Export with brand guidelines only, or create personas first.'}
        </p>
        
        <RadioGroup 
          value={selectedValue} 
          onValueChange={(v) => onPersonaChange(v === 'none' ? null : v)}
        >
          <div className="grid gap-3">
            {personas.map((persona) => (
              <Card 
                key={persona.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedPersonaId === persona.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => onPersonaChange(persona.id)}
              >
                <div className="flex items-start gap-4">
                  <RadioGroupItem value={persona.id} id={persona.id} className="mt-1" />
                  <div className="p-2 bg-muted rounded-lg">
                    {purposeIcons[persona.purpose_type] || <User className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label htmlFor={persona.id} className="font-medium cursor-pointer">
                        {persona.name}
                      </label>
                      <Badge variant="secondary" className="text-xs">
                        {purposeLabels[persona.purpose_type] || persona.purpose_type}
                      </Badge>
                      {persona.is_default && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                      {persona.source === 'library' && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Template
                        </Badge>
                      )}
                    </div>
                    {persona.function_description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {persona.function_description}
                      </p>
                    )}
                    {persona.tasks && persona.tasks.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {persona.tasks.length} task{persona.tasks.length !== 1 ? 's' : ''} defined
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {/* No persona option */}
            <Card 
              className={`p-4 cursor-pointer transition-all ${
                selectedPersonaId === null 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => onPersonaChange(null)}
            >
              <div className="flex items-center gap-4">
                <RadioGroupItem value="none" id="none" />
                <div className="p-2 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <label htmlFor="none" className="font-medium cursor-pointer">
                    No persona (brand guidelines only)
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Export system instructions with brand identity only
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </RadioGroup>
      </div>

      {selectedPersonaId && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">What you'll get:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>System Instructions:</strong> Brand identity and guidelines</li>
            <li>• <strong>User Prompt Template:</strong> Persona role and behavior</li>
            <li>• <strong>Knowledge Files:</strong> Recommended files to upload</li>
            <li>• <strong>Conversation Starters:</strong> Example prompts</li>
          </ul>
        </div>
      )}
    </div>
  );
}
