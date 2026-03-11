import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Persona, 
  PersonaType,
  AGE_RANGE_OPTIONS,
  INCOME_LEVEL_OPTIONS,
  EDUCATION_OPTIONS,
  INDUSTRY_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  CORE_MOTIVATION_OPTIONS,
  EXPERTISE_LEVEL_OPTIONS,
  PREFERRED_CHANNEL_OPTIONS,
} from './types';
import { AudienceListInput } from './AudienceListInput';
import { PersonaTypeSelector } from './PersonaTypeSelector';
import { SourceLibrarySelector } from './SourceLibrarySelector';

// Helper component for field labels with tooltips
function FieldLabel({ 
  label, 
  tooltip, 
  htmlFor 
}: { 
  label: string; 
  tooltip: string; 
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Label>
  );
}

interface ListInputState {
  newGoal: string;
  setNewGoal: (v: string) => void;
  newPainPoint: string;
  setNewPainPoint: (v: string) => void;
  newValue: string;
  setNewValue: (v: string) => void;
  newFear: string;
  setNewFear: (v: string) => void;
  newSource: string;
  setNewSource: (v: string) => void;
  newInfluencer: string;
  setNewInfluencer: (v: string) => void;
  newTech: string;
  setNewTech: (v: string) => void;
  newBarrier: string;
  setNewBarrier: (v: string) => void;
}

interface AudiencePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Persona | null;
  onPersonaChange: (persona: Persona) => void;
  onSave: () => void;
  isSaving: boolean;
  listInputState: ListInputState;
  onAddListItem: (field: keyof Persona, value: string, setter: (v: string) => void) => void;
  onRemoveListItem: (field: keyof Persona, index: number) => void;
}

export function AudiencePersonaDialog({
  open,
  onOpenChange,
  persona,
  onPersonaChange,
  onSave,
  isSaving,
  listInputState,
  onAddListItem,
  onRemoveListItem
}: AudiencePersonaDialogProps) {
  if (!persona) return null;

  const isB2B = persona.persona_type === 'b2b';
  const hasPersonaType = !!persona.persona_type;

  const handlePersonaTypeChange = (type: PersonaType) => {
    onPersonaChange({ ...persona, persona_type: type });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{persona.id ? 'Edit Persona' : 'Add Persona'}</DialogTitle>
          <DialogDescription>Define your target audience persona</DialogDescription>
        </DialogHeader>

        {/* Step 1: Persona Type Selection (for new personas) */}
        {!hasPersonaType && !persona.id && (
          <div className="py-6">
            <PersonaTypeSelector
              value={persona.persona_type}
              onChange={handlePersonaTypeChange}
            />
          </div>
        )}

        {/* Step 2: Tabs (only show after persona type is selected or for editing) */}
        {(hasPersonaType || persona.id) && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="psychographics">Psychographics</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="product">Product Fit</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Persona Name *</Label>
                  <Input
                    value={persona.persona_name}
                    onChange={(e) => onPersonaChange({ ...persona, persona_name: e.target.value })}
                    placeholder="e.g., Marketing Mary"
                  />
                </div>
                <div>
                  <Label>Title/Role</Label>
                  <Input
                    value={persona.persona_title}
                    onChange={(e) => onPersonaChange({ ...persona, persona_title: e.target.value })}
                    placeholder="e.g., Marketing Manager"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={persona.is_primary}
                  onCheckedChange={(checked) => onPersonaChange({ ...persona, is_primary: checked })}
                />
                <Label>Primary Persona</Label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Age Range</Label>
                  <Select
                    value={persona.demographics.age_range || ''}
                    onValueChange={(value) => onPersonaChange({ 
                      ...persona, 
                      demographics: { ...persona.demographics, age_range: value } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={persona.demographics.location || ''}
                    onChange={(e) => onPersonaChange({ 
                      ...persona, 
                      demographics: { ...persona.demographics, location: e.target.value } 
                    })}
                    placeholder="e.g., Urban, US"
                  />
                </div>
                <div>
                  <Label>Income Level</Label>
                  <Select
                    value={persona.demographics.income_level || ''}
                    onValueChange={(value) => onPersonaChange({ 
                      ...persona, 
                      demographics: { ...persona.demographics, income_level: value } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income level" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Education</Label>
                  <Select
                    value={persona.demographics.education || ''}
                    onValueChange={(value) => onPersonaChange({ 
                      ...persona, 
                      demographics: { ...persona.demographics, education: value } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select education" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Industry</Label>
                  <Select
                    value={persona.professional_context.industry || ''}
                    onValueChange={(value) => onPersonaChange({ 
                      ...persona, 
                      professional_context: { ...persona.professional_context, industry: value } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* B2B-specific fields */}
                {isB2B && (
                  <>
                    <div>
                      <Label>Company Type</Label>
                      <Select
                        value={persona.professional_context.company_type || ''}
                        onValueChange={(value) => onPersonaChange({ 
                          ...persona, 
                          professional_context: { ...persona.professional_context, company_type: value } 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company type" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Company Size</Label>
                      <Select
                        value={persona.professional_context.company_size || ''}
                        onValueChange={(value) => onPersonaChange({ 
                          ...persona, 
                          professional_context: { ...persona.professional_context, company_size: value } 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {/* B2B: Daily Responsibilities */}
              {isB2B && (
                <div>
                  <Label>Daily Responsibilities</Label>
                  <Textarea
                    value={persona.professional_context.daily_responsibilities || ''}
                    onChange={(e) => onPersonaChange({ 
                      ...persona, 
                      professional_context: { ...persona.professional_context, daily_responsibilities: e.target.value } 
                    })}
                    placeholder="Describe their typical daily tasks and responsibilities..."
                    rows={3}
                  />
                </div>
              )}

              {/* Personal Background (B2B gets enhanced version) */}
              <div>
                <Label>Personal Background</Label>
                <Textarea
                  value={persona.personal_background.background_details || ''}
                  onChange={(e) => onPersonaChange({ 
                    ...persona, 
                    personal_background: { ...persona.personal_background, background_details: e.target.value } 
                  })}
                  placeholder="Include details like living situation, career path history, and interests outside of work to humanize the profile"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include details like living situation, career path history, and interests outside of work to humanize the profile
                </p>
              </div>
            </TabsContent>

            <TabsContent value="psychographics" className="space-y-4 mt-4">
              {/* Core Motivation - NEW */}
              <div>
                <FieldLabel 
                  label="Core Motivation" 
                  tooltip="What fundamentally drives this persona's decisions? This helps AI prioritize information in responses."
                />
                <Select
                  value={persona.core_motivation || ''}
                  onValueChange={(value) => onPersonaChange({ ...persona, core_motivation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select core motivation" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORE_MOTIVATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AudienceListInput
                label="Goals & Motivations"
                items={persona.goals_motivations}
                field="goals_motivations"
                value={listInputState.newGoal}
                setValue={listInputState.setNewGoal}
                placeholder="e.g., Increase team productivity"
                onAdd={onAddListItem}
                onRemove={onRemoveListItem}
              />

              <AudienceListInput
                label="Pain Points & Frustrations"
                items={persona.frustrations_pain_points}
                field="frustrations_pain_points"
                value={listInputState.newPainPoint}
                setValue={listInputState.setNewPainPoint}
                placeholder="e.g., Too many disconnected tools"
                onAdd={onAddListItem}
                onRemove={onRemoveListItem}
              />

              <AudienceListInput
                label="Values & Beliefs"
                items={persona.values_beliefs}
                field="values_beliefs"
                value={listInputState.newValue}
                setValue={listInputState.setNewValue}
                placeholder="e.g., Work-life balance matters"
                onAdd={onAddListItem}
                onRemove={onRemoveListItem}
              />

              <AudienceListInput
                label="Fears"
                items={persona.fears}
                field="fears"
                value={listInputState.newFear}
                setValue={listInputState.setNewFear}
                placeholder="e.g., Falling behind competitors"
                onAdd={onAddListItem}
                onRemove={onRemoveListItem}
              />
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4 mt-4">
              <SourceLibrarySelector
                sourceType="information_source"
                label="Information Sources"
                selectedNames={persona.information_sources}
                onSelectionChange={(names) => onPersonaChange({ ...persona, information_sources: names })}
              />

              <SourceLibrarySelector
                sourceType="influencer"
                label="Influencers"
                selectedNames={persona.influencers}
                onSelectionChange={(names) => onPersonaChange({ ...persona, influencers: names })}
              />

              <SourceLibrarySelector
                sourceType="technology"
                label="Technology Usage"
                selectedNames={persona.tech_usage}
                onSelectionChange={(names) => onPersonaChange({ ...persona, tech_usage: names })}
              />

              <div>
                <FieldLabel 
                  label="Expertise Level" 
                  tooltip="How knowledgeable is this persona in your domain? This helps AI tailor language complexity."
                />
                <Select
                  value={persona.expertise_level || ''}
                  onValueChange={(value) => onPersonaChange({ ...persona, expertise_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expertise level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERTISE_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Channels - Multi-select badges */}
              <div>
                <FieldLabel 
                  label="Preferred Channels" 
                  tooltip="Where does this persona prefer to receive and consume information?"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {PREFERRED_CHANNEL_OPTIONS.map((channel) => {
                    const isSelected = persona.preferred_channels?.includes(channel) || false;
                    return (
                      <Badge
                        key={channel}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          const current = persona.preferred_channels || [];
                          const updated = isSelected
                            ? current.filter(c => c !== channel)
                            : [...current, channel];
                          onPersonaChange({ ...persona, preferred_channels: updated });
                        }}
                      >
                        {channel}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel 
                  label="Buying Behavior" 
                  tooltip="Describe how this persona researches and makes purchasing decisions."
                />
                <Textarea
                  value={persona.buying_behavior}
                  onChange={(e) => onPersonaChange({ ...persona, buying_behavior: e.target.value })}
                  placeholder="e.g., Researches extensively, seeks peer recommendations, requires multiple touchpoints..."
                />
              </div>
            </TabsContent>

            <TabsContent value="product" className="space-y-4 mt-4">
              <div>
                <FieldLabel 
                  label="Product Fit" 
                  tooltip="How does your product/service specifically address this persona's needs and pain points?"
                />
                <Textarea
                  value={persona.product_fit}
                  onChange={(e) => onPersonaChange({ ...persona, product_fit: e.target.value })}
                  placeholder="Describe how your offering solves their specific problems..."
                />
              </div>

              <AudienceListInput
                label="Barriers to Sale"
                items={persona.barriers_to_sale}
                field="barriers_to_sale"
                value={listInputState.newBarrier}
                setValue={listInputState.setNewBarrier}
                placeholder="e.g., Budget constraints, Need approval from..."
                onAdd={onAddListItem}
                onRemove={onRemoveListItem}
              />

              <div>
                <FieldLabel 
                  label="Current Perception" 
                  tooltip="What does this persona currently think about your brand, if anything? Are they aware of you?"
                />
                <Textarea
                  value={persona.current_perception}
                  onChange={(e) => onPersonaChange({ ...persona, current_perception: e.target.value })}
                  placeholder="e.g., Unaware of brand, Sees us as expensive, Views us as industry leader..."
                />
              </div>

              {/* Representative Quote */}
              <div>
                <FieldLabel 
                  label="Representative Quote" 
                  tooltip="A quote that captures this persona's mindset - helps AI understand their voice."
                />
                <Textarea
                  value={persona.representative_quote || ''}
                  onChange={(e) => onPersonaChange({ ...persona, representative_quote: e.target.value })}
                  placeholder='e.g., "I just need something that works without a steep learning curve."'
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onSave} 
            disabled={isSaving || !persona.persona_name.trim() || (!hasPersonaType && !persona.id)}
          >
            {isSaving ? 'Saving...' : 'Save Persona'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
