import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { BrandKit } from '@/hooks/useBrandKits';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useWebhookTrigger } from '@/hooks/useWebhookTrigger';
import { PersonalityTraitsCard, LibraryTrait } from './PersonalityTraitsCard';
import { BrandValuesCard, LibraryValue } from './BrandValuesCard';
import { BrandPrinciplesCard, LibraryPrinciple } from './BrandPrinciplesCard';
import { BrandMoodsCard, LibraryMood } from './BrandMoodsCard';
import { SaveStatusHeader } from '../shared';
import { 
  PersonalityTraitData, 
  BrandValueData, 
  BrandPrincipleData, 
  BrandMoodData 
} from './shared/types';

export function PersonalityEditor() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const [isLoading, setIsLoading] = useState(true);

  // Library items (for dropdown selection)
  const [libraryTraits, setLibraryTraits] = useState<LibraryTrait[]>([]);
  const [libraryValues, setLibraryValues] = useState<LibraryValue[]>([]);
  const [libraryPrinciples, setLibraryPrinciples] = useState<LibraryPrinciple[]>([]);
  const [libraryMoods, setLibraryMoods] = useState<LibraryMood[]>([]);

  // Selected items (simplified JSON objects without id/is_library)
  const [selectedTraits, setSelectedTraits] = useState<PersonalityTraitData[]>([]);
  const [selectedValues, setSelectedValues] = useState<BrandValueData[]>([]);
  const [selectedPrinciples, setSelectedPrinciples] = useState<BrandPrincipleData[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<BrandMoodData[]>([]);

  const [personalityId, setPersonalityId] = useState<string | null>(null);

  // Combine personality data for auto-save change detection
  const personalityData = useMemo(() => ({
    traits: selectedTraits,
    values: selectedValues,
    principles: selectedPrinciples,
    moods: selectedMoods
  }), [selectedTraits, selectedValues, selectedPrinciples, selectedMoods]);

  // Save function for auto-save hook
  const savePersonality = useCallback(async () => {
    const payload = {
      brand_kit_id: brandKit.id,
      personality_traits: selectedTraits as unknown as Json,
      brand_values: selectedValues as unknown as Json,
      brand_principles: selectedPrinciples as unknown as Json,
      brand_moods: selectedMoods as unknown as Json
    };

    if (personalityId) {
      const { error } = await supabase
        .from('brand_kit_personality')
        .update(payload)
        .eq('id', personalityId);
      if (error) throw error;
    } else {
      const { data: newRow, error } = await supabase
        .from('brand_kit_personality')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      if (newRow) setPersonalityId(newRow.id);
    }
  }, [brandKit.id, personalityId, selectedTraits, selectedValues, selectedPrinciples, selectedMoods]);

  const webhookTrigger = useWebhookTrigger(brandKit.id);

  // Auto-save hook
  const { autoSaveEnabled, hasUnsavedChanges, isSaving, lastError, clearError, manualSave } = useAutoSave({
    data: personalityData,
    onSave: savePersonality,
    onAfterSave: webhookTrigger,
    enabled: !isLoading,
    debounceMs: 2000
  });

  const handleRetry = useCallback(() => {
    clearError();
    manualSave();
  }, [clearError, manualSave]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load library items
        const [traitsRes, valuesRes, principlesRes, moodsRes] = await Promise.all([
          supabase.from('library_personality_traits').select('id, title, description, tags, is_library').order('title'),
          supabase.from('library_brand_values').select('id, name, description, is_library').order('name'),
          supabase.from('library_brand_principles').select('id, name, action, tags, use_case, is_library').order('name'),
          supabase.from('library_brand_moods').select('id, name, emotional_description, visual_descriptor, associated_tone, is_library').order('name')
        ]);

        if (traitsRes.data) setLibraryTraits(traitsRes.data);
        if (valuesRes.data) setLibraryValues(valuesRes.data);
        if (principlesRes.data) setLibraryPrinciples(principlesRes.data);
        if (moodsRes.data) setLibraryMoods(moodsRes.data);

        // Load saved personality data
        const { data: personalityData } = await supabase
          .from('brand_kit_personality')
          .select('*')
          .eq('brand_kit_id', brandKit.id)
          .maybeSingle();

        if (personalityData) {
          setPersonalityId(personalityData.id);
          
          // Parse and transform loaded data to simplified format (strip id/is_library)
          const rawTraits = (personalityData.personality_traits as unknown as any[]) || [];
          const traits: PersonalityTraitData[] = rawTraits.map((t) => ({
            title: t.title,
            description: t.description ?? null,
            tags: t.tags ?? null,
          }));

          const rawValues = (personalityData.brand_values as unknown as any[]) || [];
          const values: BrandValueData[] = rawValues.map((v) => ({
            name: v.name,
            description: v.description ?? null,
          }));

          const rawPrinciples = (personalityData.brand_principles as unknown as any[]) || [];
          const principles: BrandPrincipleData[] = rawPrinciples.map((p) => ({
            name: p.name,
            action: p.action ?? null,
            tags: p.tags ?? null,
            use_case: p.use_case ?? null,
          }));

          const rawMoods = (personalityData.brand_moods as unknown as any[]) || [];
          const moods: BrandMoodData[] = rawMoods.map((m) => ({
            name: m.name,
            emotional_description: m.emotional_description ?? null,
            visual_descriptor: m.visual_descriptor ?? null,
            associated_tone: m.associated_tone ?? null,
          }));

          setSelectedTraits(traits);
          setSelectedValues(values);
          setSelectedPrinciples(principles);
          setSelectedMoods(moods);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [brandKit.id]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{lastError}</span>
            <Button size="sm" variant="outline" onClick={handleRetry} className="ml-4">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <SaveStatusHeader
        autoSaveEnabled={autoSaveEnabled}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={manualSave}
      />

      {/* 2-column grid for personality cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <PersonalityTraitsCard
          libraryTraits={libraryTraits}
          selectedTraits={selectedTraits}
          onSelectionChange={setSelectedTraits}
          onTraitCreated={(trait) => setLibraryTraits((prev) => [...prev, trait])}
        />

        <BrandValuesCard
          libraryValues={libraryValues}
          selectedValues={selectedValues}
          onSelectionChange={setSelectedValues}
          onValueCreated={(value) => setLibraryValues((prev) => [...prev, value])}
        />

        <BrandPrinciplesCard
          libraryPrinciples={libraryPrinciples}
          selectedPrinciples={selectedPrinciples}
          onSelectionChange={setSelectedPrinciples}
          onPrincipleCreated={(principle) => setLibraryPrinciples((prev) => [...prev, principle])}
        />

        <BrandMoodsCard
          libraryMoods={libraryMoods}
          selectedMoods={selectedMoods}
          onSelectionChange={setSelectedMoods}
          onMoodCreated={(mood) => setLibraryMoods((prev) => [...prev, mood])}
        />
      </div>
    </div>
  );
}
