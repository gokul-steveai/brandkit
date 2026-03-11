import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle, AlertCircle, User, Palette } from 'lucide-react';
import { GPTExportConfig, EXPORT_SECTIONS, GPT_RESTRICTION_OPTIONS } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface ReviewGenerateStepProps {
  config: GPTExportConfig;
  isGenerating: boolean;
  onGenerate: () => void;
}

interface PersonaPreview {
  name: string;
  purpose_type: string;
  role_definition?: string | null;
  tasks?: string[];
}

const purposeLabels: Record<string, string> = {
  content_creation: 'Content Creation',
  customer_support: 'Customer Support',
  internal_assistant: 'Internal Assistant',
  creative_brainstorming: 'Creative Brainstorming',
};

const visualIdentityLabels: Record<string, string> = {
  full: 'Full Visual Identity',
  core_colors_only: 'Core Color Palette Only',
  none: 'Not included',
};

export function ReviewGenerateStep({
  config,
  isGenerating,
  onGenerate,
}: ReviewGenerateStepProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const [persona, setPersona] = useState<PersonaPreview | null>(null);
  const [isLoadingPersona, setIsLoadingPersona] = useState(false);

  useEffect(() => {
    async function fetchPersona() {
      if (!config.selectedPersonaId) {
        setPersona(null);
        return;
      }

      setIsLoadingPersona(true);
      try {
        // Try brand kit personas first
        const { data: bkPersona } = await supabase
          .from('brand_kit_personas')
          .select('name, purpose_type, role_definition, tasks')
          .eq('id', config.selectedPersonaId)
          .single();

        if (bkPersona) {
          setPersona({
            name: bkPersona.name,
            purpose_type: bkPersona.purpose_type,
            role_definition: bkPersona.role_definition,
            tasks: bkPersona.tasks as string[] || [],
          });
        } else {
          // Try library personas
          const { data: libPersona } = await supabase
            .from('library_personas')
            .select('name, purpose_type, role_definition_template, tasks')
            .eq('id', config.selectedPersonaId)
            .single();

          if (libPersona) {
            setPersona({
              name: libPersona.name,
              purpose_type: libPersona.purpose_type,
              role_definition: libPersona.role_definition_template,
              tasks: libPersona.tasks as string[] || [],
            });
          }
        }
      } catch (error) {
        console.error('Error fetching persona:', error);
      } finally {
        setIsLoadingPersona(false);
      }
    }

    fetchPersona();
  }, [config.selectedPersonaId]);

  const selectedSectionNames = config.selectedSections
    .map(id => EXPORT_SECTIONS.find(s => s.id === id)?.name)
    .filter(Boolean);

  const selectedRestrictionNames = config.restrictions
    .map(id => GPT_RESTRICTION_OPTIONS.find(r => r.id === id)?.label)
    .filter(Boolean);

  const hasGaps = (config.sectionCompleteness ?? []).some(
    c => config.selectedSections.includes(c.sectionId) && c.completenessPercent < 100
  );

  return (
    <div className="space-y-6">
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 className="font-medium mb-2">Ready to generate your Custom GPT export</h3>
        <p className="text-sm text-muted-foreground">
          Review your selections below, then click Generate to create your system instructions and user prompt template.
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="p-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Sections Included</h4>
          <div className="flex flex-wrap gap-2">
            {selectedSectionNames.map((name, i) => (
              <Badge key={i} variant="secondary">{name}</Badge>
            ))}
          </div>
          {hasGaps && config.gapFillingMode === 'skip' && (
            <div className="flex items-center gap-2 mt-3 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Some sections have incomplete data</span>
            </div>
          )}
          {config.gapFillingMode === 'ai_auto' && (
            <div className="flex items-center gap-2 mt-3 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>AI enhanced missing content</span>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Selected Persona</h4>
          {isLoadingPersona ? (
            <Skeleton className="h-16 w-full" />
          ) : persona ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{persona.name}</span>
                <Badge variant="secondary">
                  {purposeLabels[persona.purpose_type] || persona.purpose_type}
                </Badge>
              </div>
              {persona.role_definition && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {persona.role_definition}
                </p>
              )}
              {persona.tasks && persona.tasks.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {persona.tasks.length} task{persona.tasks.length !== 1 ? 's' : ''} configured
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>No persona selected - brand guidelines only</span>
            </div>
          )}
        </Card>

        {/* Visual Identity */}
        <Card className="p-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Visual Identity</h4>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className={config.visualIdentityMode === 'none' ? 'text-muted-foreground' : ''}>
              {visualIdentityLabels[config.visualIdentityMode]}
            </span>
          </div>
        </Card>

        {(selectedRestrictionNames.length > 0 || config.restrictionsCustom) && (
          <Card className="p-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Restrictions</h4>
            <div className="flex flex-wrap gap-2">
              {selectedRestrictionNames.map((name, i) => (
                <Badge key={i} variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">
                  {name}
                </Badge>
              ))}
            </div>
            {config.restrictionsCustom && (
              <p className="text-sm text-muted-foreground mt-2">+ {config.restrictionsCustom}</p>
            )}
          </Card>
        )}

        <Card className="p-4 bg-muted/30">
          <h4 className="font-medium text-sm mb-2">What you'll receive:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>System Instructions:</strong> Brand identity for the "Instructions" field</li>
            {persona && (
              <li>• <strong>User Prompt Template:</strong> Persona definition for your first message</li>
            )}
            <li>• <strong>Knowledge Files:</strong> Recommended files to upload</li>
            <li>• <strong>Conversation Starters:</strong> Example prompts for users</li>
          </ul>
        </Card>
      </div>

      <Button 
        onClick={onGenerate} 
        disabled={isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Export'
        )}
      </Button>
    </div>
  );
}
