import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { ArchetypeSelector } from '../expression/ArchetypeSelector';
import type { LibraryArchetype } from '@/hooks/useLibraryArchetypes';

interface CreatePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  onPersonaCreated: () => void;
}

const PURPOSE_OPTIONS = [
  { value: 'content_creation', label: 'Content Creation', description: 'Writing, editing, and content generation' },
  { value: 'customer_support', label: 'Customer Support', description: 'Handling inquiries and support tickets' },
  { value: 'internal_assistant', label: 'Internal Assistant', description: 'Team productivity and internal tasks' },
  { value: 'creative_brainstorming', label: 'Creative Brainstorming', description: 'Ideation and creative development' },
  { value: 'custom', label: 'Custom', description: 'Define your own purpose' },
];

const INTERACTION_CONTEXT_OPTIONS = [
  { value: 'formal_meeting', label: 'Formal Meeting' },
  { value: 'casual_chat', label: 'Casual Chat' },
  { value: 'support_ticket', label: 'Support Ticket' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email', label: 'Email' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'documentation', label: 'Documentation' },
];

export function CreatePersonaDialog({
  open,
  onOpenChange,
  brandKitId,
  onPersonaCreated,
}: CreatePersonaDialogProps) {
  const [name, setName] = useState('');
  const [purposeType, setPurposeType] = useState('');
  const [description, setDescription] = useState('');
  const [baseArchetype, setBaseArchetype] = useState<LibraryArchetype | null>(null);
  const [baseArchetypeDisplay, setBaseArchetypeDisplay] = useState<{ name: string; description: string; characteristics: string[] } | null>(null);
  const [targetAudienceContext, setTargetAudienceContext] = useState('');
  const [interactionContext, setInteractionContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedXml, setGeneratedXml] = useState('');
  const [parsedData, setParsedData] = useState<{
    role?: string;
    primeDirective?: string;
    tasks?: string[];
    behavioralRules?: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!name || !purposeType) {
      toast({ title: 'Please fill in name and purpose', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setGeneratedXml('');
    setParsedData(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-persona', {
        body: { 
          brandKitId, 
          name, 
          purposeType, 
          description,
          // Pass new archetype and context fields
          baseArchetypeId: baseArchetype?.id || null,
          baseArchetypeName: baseArchetype?.name || null,
          baseArchetypeTraits: baseArchetype?.key_traits || [],
          baseArchetypeLlmInstruction: baseArchetype?.llm_instruction || null,
          targetAudienceContext: targetAudienceContext || null,
          interactionContext: interactionContext || null,
        },
      });

      if (error) throw error;

      setGeneratedXml(data.xml);
      setParsedData(data.parsed);
      toast({ title: 'Persona generated successfully!' });
    } catch (error) {
      console.error('Error generating persona:', error);
      toast({
        title: 'Failed to generate persona',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedXml);
    setCopied(true);
    toast({ title: 'XML copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!parsedData) return;

    setIsSaving(true);

    try {
      const { error } = await supabase.from('brand_kit_personas').insert({
        brand_kit_id: brandKitId,
        name,
        purpose_type: purposeType,
        role_definition: parsedData.role || null,
        function_description: parsedData.primeDirective || description || null,
        personality_description: generatedXml,
        tasks: parsedData.tasks || [],
        behavioral_rules: parsedData.behavioralRules || [],
        is_active: true,
        is_default: false,
        // Save new context fields to database
        base_archetype_id: baseArchetype?.id || null,
        target_audience_context: targetAudienceContext || null,
        interaction_context: interactionContext || null,
      });

      if (error) throw error;

      toast({ title: 'Persona saved successfully!' });
      onPersonaCreated();
      handleClose();
    } catch (error) {
      console.error('Error saving persona:', error);
      toast({
        title: 'Failed to save persona',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setPurposeType('');
    setDescription('');
    setBaseArchetype(null);
    setBaseArchetypeDisplay(null);
    setTargetAudienceContext('');
    setInteractionContext('');
    setGeneratedXml('');
    setParsedData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-ai-sparkle" />
            Create AI Persona
          </DialogTitle>
          <DialogDescription>
            Generate a detailed persona configuration using AI based on your brand kit
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] -mx-6 px-6">
          <div className="space-y-4 pb-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Persona Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Brand Ambassador"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose Type</Label>
                  <Select value={purposeType} onValueChange={setPurposeType} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Base Archetype - NEW */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Base Archetype (Optional)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">Start from a proven archetype pattern to guide the AI persona generation</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <ArchetypeSelector
                  value={baseArchetypeDisplay}
                  onChange={setBaseArchetypeDisplay}
                  onSelectFull={setBaseArchetype}
                  placeholder="Optionally select a base archetype..."
                  disabled={isGenerating}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Target Audience Context */}
                <div className="space-y-2">
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <Input
                    id="target-audience"
                    placeholder="e.g., Skeptical CFO, Creative freelancer"
                    value={targetAudienceContext}
                    onChange={(e) => setTargetAudienceContext(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* Interaction Context */}
                <div className="space-y-2">
                  <Label htmlFor="interaction-context">Interaction Context</Label>
                  <Select value={interactionContext} onValueChange={setInteractionContext} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Where will this persona communicate?" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERACTION_CONTEXT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Additional Context (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe any specific requirements or behaviors for this persona..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isGenerating}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!name || !purposeType || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Persona...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 text-ai-sparkle" />
                    Generate with AI
                  </>
                )}
              </Button>

              {generatedXml && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Generated XML Configuration</Label>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy XML
                        </>
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="h-[200px] rounded-md border bg-muted/50 p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{generatedXml}</pre>
                  </ScrollArea>

                  {parsedData && (
                    <div className="rounded-md border bg-card p-4 space-y-2">
                      <h4 className="font-semibold text-sm">Extracted Fields</h4>
                      {parsedData.role && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Role:</span> {parsedData.role}
                        </p>
                      )}
                      {parsedData.tasks && parsedData.tasks.length > 0 && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Tasks:</span> {parsedData.tasks.length} defined
                        </p>
                      )}
                      {parsedData.behavioralRules && parsedData.behavioralRules.length > 0 && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Behavioral Rules:</span>{' '}
                          {parsedData.behavioralRules.length} defined
                        </p>
                      )}
                    </div>
                  )}

                  <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Persona
                      </>
                    )}
                  </Button>
                </div>
              )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
