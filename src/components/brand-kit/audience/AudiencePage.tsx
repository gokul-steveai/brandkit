import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { BrandKit } from '@/hooks/useBrandKits';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradePrompt } from '@/components/subscription/UpgradeModal';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Persona, Demographics, ProfessionalContext, PersonalBackground, emptyPersona, asPersonaType } from './types';
import { AudienceEmptyState } from './AudienceEmptyState';
import { AudiencePersonaCard } from './AudiencePersonaCard';
import { AudiencePersonaDialog } from './AudiencePersonaDialog';
import { CommunityAnalysisCard } from './CommunityAnalysisCard';
import { AddNewCard } from '@/components/brand-kit/shared';

export function AudiencePage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const { toast } = useToast();
  const { getLimit, canCreateMore } = useSubscription();
  const { promptUpgrade, UpgradePromptModal } = useUpgradePrompt();
  const { setHeaderInfo } = usePageHeader();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  
  const audienceLimit = getLimit('targetAudiences');
  const canAddMore = canCreateMore('targetAudiences', personas.length);

  // Set page header info
  useEffect(() => {
    if (!isLoading) {
      setHeaderInfo({
        subtitle: `${personas.length} persona${personas.length !== 1 ? 's' : ''} defined`,
        badge: audienceLimit !== -1 ? {
          text: `${personas.length} / ${audienceLimit} used`,
          variant: 'outline'
        } : undefined
      });
    }
    return () => setHeaderInfo(null);
  }, [personas.length, audienceLimit, isLoading, setHeaderInfo]);
  
  // For list inputs
  const [newGoal, setNewGoal] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newFear, setNewFear] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newInfluencer, setNewInfluencer] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newBarrier, setNewBarrier] = useState('');

  useEffect(() => {
    const loadPersonas = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('brand_kit_target_audience')
          .select('*')
          .eq('brand_kit_id', brandKit.id)
          .order('is_primary', { ascending: false })
          .order('created_at');

        if (error) throw error;
        if (data) {
          setPersonas(data.map(p => ({
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
      } finally {
        setIsLoading(false);
      }
    };

    loadPersonas();
  }, [brandKit.id]);

  const openNewPersona = () => {
    setEditingPersona({ ...emptyPersona, brand_kit_id: brandKit.id });
    resetListInputs();
    setShowDialog(true);
  };

  const openEditPersona = (persona: Persona) => {
    setEditingPersona({ ...persona });
    resetListInputs();
    setShowDialog(true);
  };

  const resetListInputs = () => {
    setNewGoal('');
    setNewPainPoint('');
    setNewValue('');
    setNewFear('');
    setNewSource('');
    setNewInfluencer('');
    setNewTech('');
    setNewBarrier('');
  };

  const addListItem = (field: keyof Persona, value: string, setter: (v: string) => void) => {
    if (value.trim() && editingPersona) {
      const currentList = editingPersona[field] as string[];
      setEditingPersona({ ...editingPersona, [field]: [...currentList, value.trim()] });
      setter('');
    }
  };

  const removeListItem = (field: keyof Persona, index: number) => {
    if (editingPersona) {
      const currentList = editingPersona[field] as string[];
      setEditingPersona({ ...editingPersona, [field]: currentList.filter((_, i) => i !== index) });
    }
  };

  const handleSave = async () => {
    if (!editingPersona || !editingPersona.persona_name.trim()) return;
    setIsSaving(true);

    try {
      const { id, ...rest } = editingPersona;
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
        const { error } = await supabase
          .from('brand_kit_target_audience')
          .update(dataToSave)
          .eq('id', id);
        if (error) throw error;
        setPersonas(prev => prev.map(p => p.id === id ? editingPersona : p));
      } else {
        const { data, error } = await supabase
          .from('brand_kit_target_audience')
          .insert(dataToSave)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          const newPersona: Persona = {
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
          setPersonas(prev => [...prev, newPersona]);
        }
      }

      toast({ title: 'Persona saved successfully' });
      setShowDialog(false);
      setEditingPersona(null);
    } catch (error: any) {
      toast({
        title: 'Failed to save persona',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('brand_kit_target_audience')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setPersonas(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Persona deleted' });
    } catch (error: any) {
      toast({
        title: 'Failed to delete persona',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="border-2 border-border">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleAddPersona = () => {
    if (!canAddMore) {
      promptUpgrade({ reason: 'limit', limitType: 'Target Audience' });
      return;
    }
    openNewPersona();
  };

  const listInputState = {
    newGoal,
    setNewGoal,
    newPainPoint,
    setNewPainPoint,
    newValue,
    setNewValue,
    newFear,
    setNewFear,
    newSource,
    setNewSource,
    newInfluencer,
    setNewInfluencer,
    newTech,
    setNewTech,
    newBarrier,
    setNewBarrier
  };

  return (
    <>
      <UpgradePromptModal />
      <div className="space-y-6 max-w-5xl animate-fade-in">
        {personas.length === 0 ? (
          <AudienceEmptyState onAddFirst={handleAddPersona} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {personas.map((persona) => (
              <AudiencePersonaCard
                key={persona.id}
                persona={persona}
                onEdit={openEditPersona}
                onDelete={handleDelete}
              />
            ))}
            <AddNewCard
              title="Add Persona"
              description="Create a new target audience persona"
              onClick={handleAddPersona}
              disabled={!canAddMore}
              disabledReason={audienceLimit !== -1 ? `Upgrade to add more than ${audienceLimit} personas` : undefined}
            />
          </div>
        )}

        {/* Community Analysis Card - Phase 5 */}
        <CommunityAnalysisCard brandKitId={brandKit.id} />

        <AudiencePersonaDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          persona={editingPersona}
          onPersonaChange={setEditingPersona}
          onSave={handleSave}
          isSaving={isSaving}
          listInputState={listInputState}
          onAddListItem={addListItem}
          onRemoveListItem={removeListItem}
        />
      </div>
    </>
  );
}
