import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { User, Users, Sparkles, MoreVertical, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { useToast } from '@/hooks/useToast';
import { BrandKit } from '@/hooks/useBrandKits';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { useUpgradePrompt } from '@/components/subscription/UpgradeModal';
import { PREMIUM_SOFT_CAP } from '@/lib/subscription/constants';
import { AddNewCard } from '@/components/brand-kit/shared';
import { SupportTicketDialog } from '@/components/support';

// Persona imports
import { CreatePersonaDialog } from '@/components/brand-kit/personas';
import { ViewPersonaDialog } from '@/components/brand-kit/personas';

// Audience imports
import { AudiencePersonaCard } from '@/components/brand-kit/audience';
import { AudiencePersonaDialog } from '@/components/brand-kit/audience';
import { AudienceEmptyState } from '@/components/brand-kit/audience';
import { 
  type Persona as AudiencePersona, 
  type Demographics, 
  type ProfessionalContext, 
  type PersonalBackground, 
  emptyPersona, 
  asPersonaType 
} from '@/components/brand-kit/audience/types';

interface AIPersona {
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

export function PersonasAudiencePage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const { toast: showToast } = useToast();
  const { ownerTier, getLimit, canCreateMore } = useBrandKitSubscription(brandKit.id);
  const { promptUpgrade, UpgradePromptModal } = useUpgradePrompt();
  const [searchParams] = useSearchParams();
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  // AI Personas state
  const [personas, setPersonas] = useState<AIPersona[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [isCreatePersonaOpen, setIsCreatePersonaOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);
  const [isViewPersonaOpen, setIsViewPersonaOpen] = useState(false);

  // Target Audience state
  const [audiences, setAudiences] = useState<AudiencePersona[]>([]);
  const [isLoadingAudiences, setIsLoadingAudiences] = useState(true);
  const [editingAudience, setEditingAudience] = useState<AudiencePersona | null>(null);
  const [showAudienceDialog, setShowAudienceDialog] = useState(false);
  const [isSavingAudience, setIsSavingAudience] = useState(false);

  // List input state for audience dialog
  const [newGoal, setNewGoal] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newFear, setNewFear] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newInfluencer, setNewInfluencer] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newBarrier, setNewBarrier] = useState('');

  const personaLimit = getLimit('personas');
  const audienceLimit = getLimit('targetAudiences');

  // Open create dialog if ?create=true
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreatePersonaOpen(true);
    }
  }, [searchParams]);

  // Fetch AI personas
  const fetchPersonas = async () => {
    const { data, error } = await supabase
      .from('brand_kit_personas')
      .select('*')
      .eq('brand_kit_id', brandKit.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setPersonas(data as AIPersona[]);
    setIsLoadingPersonas(false);
  };

  // Fetch target audiences
  const fetchAudiences = async () => {
    setIsLoadingAudiences(true);
    const { data, error } = await supabase
      .from('brand_kit_target_audience')
      .select('*')
      .eq('brand_kit_id', brandKit.id)
      .order('is_primary', { ascending: false })
      .order('created_at');
    if (!error && data) {
      setAudiences(data.map(p => ({
        ...p,
        persona_type: asPersonaType(p.persona_type),
        demographics: (p.demographics as Demographics) || {},
        professional_context: (p.professional_context as ProfessionalContext) || {},
        personal_background: (p.personal_background as PersonalBackground) || {},
        goals_motivations: Array.isArray(p.goals_motivations) ? p.goals_motivations as string[] : [],
        frustrations_pain_points: Array.isArray(p.frustrations_pain_points) ? p.frustrations_pain_points as string[] : [],
        values_beliefs: Array.isArray(p.values_beliefs) ? p.values_beliefs as string[] : [],
        fears: Array.isArray(p.fears) ? p.fears as string[] : [],
        information_sources: Array.isArray(p.information_sources) ? p.information_sources as string[] : [],
        influencers: Array.isArray(p.influencers) ? p.influencers as string[] : [],
        tech_usage: Array.isArray(p.tech_usage) ? p.tech_usage as string[] : [],
        barriers_to_sale: Array.isArray(p.barriers_to_sale) ? p.barriers_to_sale as string[] : [],
        product_fit: p.product_fit || '',
        buying_behavior: p.buying_behavior || '',
        current_perception: p.current_perception || ''
      })));
    }
    setIsLoadingAudiences(false);
  };

  useEffect(() => {
    fetchPersonas();
    fetchAudiences();
  }, [brandKit.id]);

  // Persona actions
  const handleSetDefault = async (personaId: string) => {
    await supabase.from('brand_kit_personas').update({ is_default: false }).eq('brand_kit_id', brandKit.id);
    const { error } = await supabase.from('brand_kit_personas').update({ is_default: true }).eq('id', personaId);
    if (error) showToast({ title: 'Failed to set default', variant: 'destructive' });
    else { showToast({ title: 'Default persona updated' }); fetchPersonas(); }
  };

  const handleDeletePersona = async (personaId: string) => {
    const { error } = await supabase.from('brand_kit_personas').delete().eq('id', personaId);
    if (error) showToast({ title: 'Failed to delete persona', variant: 'destructive' });
    else { showToast({ title: 'Persona deleted' }); fetchPersonas(); }
  };

  const handleAddPersona = () => {
    const canAdd = canCreateMore('personas', personas.length);
    if (!canAdd) {
      if (ownerTier === 'premium' && personas.length >= PREMIUM_SOFT_CAP) {
        setShowSupportDialog(true);
      } else {
        promptUpgrade({ reason: 'limit', limitType: 'AI Personas' });
      }
      return;
    }
    setIsCreatePersonaOpen(true);
  };

  // Audience actions
  const resetListInputs = () => {
    setNewGoal(''); setNewPainPoint(''); setNewValue(''); setNewFear('');
    setNewSource(''); setNewInfluencer(''); setNewTech(''); setNewBarrier('');
  };

  const openNewAudience = () => {
    setEditingAudience({ ...emptyPersona, brand_kit_id: brandKit.id });
    resetListInputs();
    setShowAudienceDialog(true);
  };

  const openEditAudience = (persona: AudiencePersona) => {
    setEditingAudience({ ...persona });
    resetListInputs();
    setShowAudienceDialog(true);
  };

  const handleAddAudience = () => {
    const canAdd = canCreateMore('targetAudiences', audiences.length);
    if (!canAdd) {
      if (ownerTier === 'premium' && audiences.length >= PREMIUM_SOFT_CAP) {
        setShowSupportDialog(true);
      } else {
        promptUpgrade({ reason: 'limit', limitType: 'Target Audience' });
      }
      return;
    }
    openNewAudience();
  };

  const addListItem = (field: keyof AudiencePersona, value: string, setter: (v: string) => void) => {
    if (value.trim() && editingAudience) {
      const currentList = editingAudience[field] as string[];
      setEditingAudience({ ...editingAudience, [field]: [...currentList, value.trim()] });
      setter('');
    }
  };

  const removeListItem = (field: keyof AudiencePersona, index: number) => {
    if (editingAudience) {
      const currentList = editingAudience[field] as string[];
      setEditingAudience({ ...editingAudience, [field]: currentList.filter((_, i) => i !== index) });
    }
  };

  const handleSaveAudience = async () => {
    if (!editingAudience || !editingAudience.persona_name.trim()) return;
    setIsSavingAudience(true);
    try {
      const { id, ...rest } = editingAudience;
      const dataToSave = {
        brand_kit_id: rest.brand_kit_id,
        persona_type: rest.persona_type || 'b2b',
        persona_name: rest.persona_name,
        persona_title: rest.persona_title,
        is_primary: rest.is_primary,
        demographics: rest.demographics as unknown as any,
        professional_context: rest.professional_context as unknown as any,
        personal_background: rest.personal_background as unknown as any,
        goals_motivations: rest.goals_motivations as unknown as any,
        frustrations_pain_points: rest.frustrations_pain_points as unknown as any,
        values_beliefs: rest.values_beliefs as unknown as any,
        fears: rest.fears as unknown as any,
        information_sources: rest.information_sources as unknown as any,
        influencers: rest.influencers as unknown as any,
        tech_usage: rest.tech_usage as unknown as any,
        product_fit: rest.product_fit,
        barriers_to_sale: rest.barriers_to_sale as unknown as any,
        buying_behavior: rest.buying_behavior,
        current_perception: rest.current_perception
      };

      if (id) {
        const { error } = await supabase.from('brand_kit_target_audience').update(dataToSave).eq('id', id);
        if (error) throw error;
        setAudiences(prev => prev.map(p => p.id === id ? editingAudience : p));
      } else {
        const { data, error } = await supabase.from('brand_kit_target_audience').insert(dataToSave).select().single();
        if (error) throw error;
        if (data) {
          const newAudience: AudiencePersona = {
            ...data,
            persona_type: asPersonaType(data.persona_type),
            demographics: (data.demographics as Demographics) || {},
            professional_context: (data.professional_context as ProfessionalContext) || {},
            personal_background: (data.personal_background as PersonalBackground) || {},
            goals_motivations: Array.isArray(data.goals_motivations) ? data.goals_motivations as string[] : [],
            frustrations_pain_points: Array.isArray(data.frustrations_pain_points) ? data.frustrations_pain_points as string[] : [],
            values_beliefs: Array.isArray(data.values_beliefs) ? data.values_beliefs as string[] : [],
            fears: Array.isArray(data.fears) ? data.fears as string[] : [],
            information_sources: Array.isArray(data.information_sources) ? data.information_sources as string[] : [],
            influencers: Array.isArray(data.influencers) ? data.influencers as string[] : [],
            tech_usage: Array.isArray(data.tech_usage) ? data.tech_usage as string[] : [],
            barriers_to_sale: Array.isArray(data.barriers_to_sale) ? data.barriers_to_sale as string[] : [],
            product_fit: data.product_fit || '',
            buying_behavior: data.buying_behavior || '',
            current_perception: data.current_perception || ''
          };
          setAudiences(prev => [...prev, newAudience]);
        }
      }
      showToast({ title: 'Persona saved successfully' });
      setShowAudienceDialog(false);
      setEditingAudience(null);
    } catch (error: any) {
      showToast({ title: 'Failed to save persona', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingAudience(false);
    }
  };

  const handleDeleteAudience = async (id: string) => {
    try {
      const { error } = await supabase.from('brand_kit_target_audience').delete().eq('id', id);
      if (error) throw error;
      setAudiences(prev => prev.filter(p => p.id !== id));
      showToast({ title: 'Persona deleted' });
    } catch (error: any) {
      showToast({ title: 'Failed to delete persona', description: error.message, variant: 'destructive' });
    }
  };

  const isLoading = isLoadingPersonas || isLoadingAudiences;

  // Determine add card state for personas
  const personaCanAdd = canCreateMore('personas', personas.length);
  const personaAtSoftCap = ownerTier === 'premium' && personas.length >= PREMIUM_SOFT_CAP;
  const personaAddDisabled = !personaCanAdd || personaAtSoftCap;
  const personaDisabledReason = personaAtSoftCap
    ? `Soft cap of ${PREMIUM_SOFT_CAP} reached. File a support ticket to request more.`
    : personaLimit !== -1 ? `Upgrade to add more than ${personaLimit} personas` : undefined;

  // Determine add card state for audiences
  const audienceCanAdd = canCreateMore('targetAudiences', audiences.length);
  const audienceAtSoftCap = ownerTier === 'premium' && audiences.length >= PREMIUM_SOFT_CAP;
  const audienceAddDisabled = !audienceCanAdd || audienceAtSoftCap;
  const audienceDisabledReason = audienceAtSoftCap
    ? `Soft cap of ${PREMIUM_SOFT_CAP} reached. File a support ticket to request more.`
    : audienceLimit !== -1 ? `Upgrade to add more than ${audienceLimit} personas` : undefined;

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl">
        {[1, 2].map(section => (
          <div key={section} className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map(i => (
                <Card key={i} className="border-2 border-border">
                  <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                  <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const listInputState = {
    newGoal, setNewGoal, newPainPoint, setNewPainPoint, newValue, setNewValue,
    newFear, setNewFear, newSource, setNewSource, newInfluencer, setNewInfluencer,
    newTech, setNewTech, newBarrier, setNewBarrier,
  };

  return (
    <>
      <UpgradePromptModal />
      <SupportTicketDialog open={showSupportDialog} onOpenChange={setShowSupportDialog} />
      <div className="space-y-10 max-w-5xl animate-fade-in">
        {/* AI Personas Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                AI Personas
              </h2>
              <p className="text-sm text-muted-foreground">
                Define how AI assistants communicate and behave for your brand
              </p>
            </div>
            {personas.length > 0 && personaLimit !== -1 && (
              <Badge variant="outline">{personas.length} / {personaLimit} used</Badge>
            )}
          </div>

          <CreatePersonaDialog
            open={isCreatePersonaOpen}
            onOpenChange={setIsCreatePersonaOpen}
            brandKitId={brandKit.id}
            onPersonaCreated={fetchPersonas}
          />

          {personas.length === 0 ? (
            <Card className="border-2 border-dashed border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No AI Personas Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Personas define how AI assistants should communicate and behave when representing your brand.
                </p>
                <Button onClick={() => setIsCreatePersonaOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create with AI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personas.map((persona) => (
                <Card
                  key={persona.id}
                  className="border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => { setSelectedPersona(persona); setIsViewPersonaOpen(true); }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{persona.name}</CardTitle>
                          {persona.is_default && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="mr-1 h-3 w-3" />Default
                            </Badge>
                          )}
                        </div>
                        <Badge className={PURPOSE_COLORS[persona.purpose_type] || PURPOSE_COLORS.custom}>
                          {PURPOSE_LABELS[persona.purpose_type] || persona.purpose_type}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!persona.is_default && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetDefault(persona.id); }}>
                              <Star className="mr-2 h-4 w-4" />Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeletePersona(persona.id); }} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {persona.function_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{persona.function_description}</p>
                    )}
                    {Array.isArray(persona.tasks) && persona.tasks.length > 0 && (
                      <p className="text-xs text-muted-foreground">{persona.tasks.length} task{persona.tasks.length !== 1 ? 's' : ''} defined</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              <AddNewCard
                title="Add AI Persona"
                description="Create a new AI persona"
                onClick={handleAddPersona}
                disabled={personaAddDisabled}
                disabledReason={personaDisabledReason}
              />
            </div>
          )}

          <ViewPersonaDialog
            open={isViewPersonaOpen}
            onOpenChange={setIsViewPersonaOpen}
            persona={selectedPersona}
            onPersonaUpdated={fetchPersonas}
          />
        </section>

        {/* Target Audience Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Target Audience
              </h2>
              <p className="text-sm text-muted-foreground">
                Define your ideal customer profiles and target demographics
              </p>
            </div>
            {audiences.length > 0 && audienceLimit !== -1 && (
              <Badge variant="outline">{audiences.length} / {audienceLimit} used</Badge>
            )}
          </div>

          {audiences.length === 0 ? (
            <AudienceEmptyState onAddFirst={handleAddAudience} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {audiences.map((persona) => (
                <AudiencePersonaCard
                  key={persona.id}
                  persona={persona}
                  onEdit={openEditAudience}
                  onDelete={handleDeleteAudience}
                />
              ))}
              <AddNewCard
                title="Add Target Audience"
                description="Create a new target audience persona"
                onClick={handleAddAudience}
                disabled={audienceAddDisabled}
                disabledReason={audienceDisabledReason}
              />
            </div>
          )}

          <AudiencePersonaDialog
            open={showAudienceDialog}
            onOpenChange={setShowAudienceDialog}
            persona={editingAudience}
            onPersonaChange={setEditingAudience}
            onSave={handleSaveAudience}
            isSaving={isSavingAudience}
            listInputState={listInputState}
            onAddListItem={addListItem}
            onRemoveListItem={removeListItem}
          />
        </section>
      </div>
    </>
  );
}
