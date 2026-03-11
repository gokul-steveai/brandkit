import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, User, UserX, Sparkles, Info } from 'lucide-react';
import { TagInput } from '../knowledge/upload-wizard/TagInput';
import { ArchetypeSelector } from './ArchetypeSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface VoiceArchetype {
  name: string;
  description: string;
  characteristics: string[];
}

export interface VoiceArchetypes {
  primary: VoiceArchetype | null;
  secondary: VoiceArchetype | null;
  antiArchetypes: VoiceArchetype[];
}

interface VoiceArchetypesCardProps {
  voiceArchetypes: VoiceArchetypes;
  onChange: (voiceArchetypes: VoiceArchetypes) => void;
}

const emptyArchetype: VoiceArchetype = {
  name: '',
  description: '',
  characteristics: [],
};

export function VoiceArchetypesCard({ voiceArchetypes, onChange }: VoiceArchetypesCardProps) {
  const [isAddingAnti, setIsAddingAnti] = useState(false);
  const [newAntiArchetype, setNewAntiArchetype] = useState<VoiceArchetype>({ ...emptyArchetype });

  const updatePrimary = (updates: Partial<VoiceArchetype>) => {
    onChange({
      ...voiceArchetypes,
      primary: { ...(voiceArchetypes.primary || emptyArchetype), ...updates },
    });
  };

  const updateSecondary = (updates: Partial<VoiceArchetype>) => {
    onChange({
      ...voiceArchetypes,
      secondary: { ...(voiceArchetypes.secondary || emptyArchetype), ...updates },
    });
  };

  const addAntiArchetype = () => {
    if (newAntiArchetype.name.trim()) {
      onChange({
        ...voiceArchetypes,
        antiArchetypes: [...voiceArchetypes.antiArchetypes, newAntiArchetype],
      });
      setNewAntiArchetype({ ...emptyArchetype });
      setIsAddingAnti(false);
    }
  };

  const removeAntiArchetype = (index: number) => {
    onChange({
      ...voiceArchetypes,
      antiArchetypes: voiceArchetypes.antiArchetypes.filter((_, i) => i !== index),
    });
  };

  return (
    <Card className="border-2 border-border md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Voice Archetypes</CardTitle>
        </div>
        <CardDescription>
          Define the personality archetypes that shape your brand voice. Think of these as character templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Primary and Secondary Archetypes */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Primary Archetype */}
          <div className="space-y-4 p-4 rounded-lg border bg-primary/5">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <Label className="font-semibold">Primary Archetype</Label>
              <Badge variant="secondary" className="text-xs">Main Voice</Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p className="text-xs">The dominant voice personality that guides most of your brand communications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="primary-name" className="text-sm text-muted-foreground">Select from Library</Label>
                <ArchetypeSelector
                  value={voiceArchetypes.primary}
                  onChange={(archetype) => updatePrimary(archetype)}
                  placeholder="Choose a primary archetype..."
                />
              </div>
              <div>
                <Label htmlFor="primary-desc" className="text-sm text-muted-foreground">LLM Instruction</Label>
                <Textarea
                  id="primary-desc"
                  placeholder="How the AI should embody this archetype..."
                  value={voiceArchetypes.primary?.description || ''}
                  onChange={(e) => updatePrimary({ description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Key Traits</Label>
                <TagInput
                  value={voiceArchetypes.primary?.characteristics || []}
                  onChange={(characteristics) => updatePrimary({ characteristics })}
                  placeholder="Add trait..."
                />
              </div>
            </div>
          </div>

          {/* Secondary Archetype */}
          <div className="space-y-4 p-4 rounded-lg border bg-secondary/20">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Secondary Archetype</Label>
              <Badge variant="outline" className="text-xs">Supporting</Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p className="text-xs">A complementary voice that emerges in specific contexts or content types</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="secondary-name" className="text-sm text-muted-foreground">Select from Library</Label>
                <ArchetypeSelector
                  value={voiceArchetypes.secondary}
                  onChange={(archetype) => updateSecondary(archetype)}
                  placeholder="Choose a secondary archetype..."
                />
              </div>
              <div>
                <Label htmlFor="secondary-desc" className="text-sm text-muted-foreground">LLM Instruction</Label>
                <Textarea
                  id="secondary-desc"
                  placeholder="When this voice emerges..."
                  value={voiceArchetypes.secondary?.description || ''}
                  onChange={(e) => updateSecondary({ description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Key Traits</Label>
                <TagInput
                  value={voiceArchetypes.secondary?.characteristics || []}
                  onChange={(characteristics) => updateSecondary({ characteristics })}
                  placeholder="Add trait..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Archetypes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-destructive" />
              <Label className="font-semibold">Anti-Archetypes</Label>
              <Badge variant="destructive" className="text-xs">Never Be</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingAnti(true)}
              disabled={isAddingAnti}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Anti-Archetype
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Voices your brand should never adopt. These help AI avoid off-brand content.
          </p>

          {/* Existing Anti-Archetypes */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {voiceArchetypes.antiArchetypes.map((anti, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 relative group"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeAntiArchetype(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <p className="font-medium text-sm pr-6">{anti.name}</p>
                {anti.description && (
                  <p className="text-xs text-muted-foreground mt-1">{anti.description}</p>
                )}
                {anti.characteristics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {anti.characteristics.slice(0, 3).map((char, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {char}
                      </Badge>
                    ))}
                    {anti.characteristics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{anti.characteristics.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add New Anti-Archetype Form */}
          {isAddingAnti && (
            <div className="p-4 rounded-lg border border-dashed space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input
                    placeholder="e.g., The Salesman, The Preacher"
                    value={newAntiArchetype.name}
                    onChange={(e) => setNewAntiArchetype(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm">Description</Label>
                  <Input
                    placeholder="Why to avoid this voice"
                    value={newAntiArchetype.description}
                    onChange={(e) => setNewAntiArchetype(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Characteristics to Avoid</Label>
                <TagInput
                  value={newAntiArchetype.characteristics}
                  onChange={(characteristics) => setNewAntiArchetype(prev => ({ ...prev, characteristics }))}
                  placeholder="Add negative trait..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingAnti(false);
                    setNewAntiArchetype({ ...emptyArchetype });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={addAntiArchetype}
                  disabled={!newAntiArchetype.name.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
