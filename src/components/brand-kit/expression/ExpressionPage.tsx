import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { BrandKit, useBrandKits } from "@/hooks/useBrandKits";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useWebhookTrigger } from "@/hooks/useWebhookTrigger";
import { SaveStatusHeader } from '../shared';
import { BrandToneCard } from "./BrandToneCard";
import { VerbalStyleCard } from "./VerbalStyleCard";
import { PreferredTerminologyCard } from "./PreferredTerminologyCard";
import { VisualStyleCard } from "./VisualStyleCard";
import { ExpressionExamplesCard } from "./ExpressionExamplesCard";
import { VoiceArchetypesCard, VoiceArchetypes } from "./VoiceArchetypesCard";
import { ContentCategoriesCard, ContentCategory } from "./ContentCategoriesCard";
import { ToneDimensionsCard, ToneDimensions } from "./ToneDimensionsCard";
import { BrandVoiceCard } from "../overview/BrandVoiceCard";
import type { TerminologyItem } from "./types";

interface ToneAttribute {
  attribute: string;
  min_label: string;
  max_label: string;
  value: number;
}

// ToneDimensions is now imported from ToneDimensionsCard

interface ExpressionData {
  id?: string;
  brand_kit_id: string;
  tone_of_voice: {
    description: string;
    attributes: ToneAttribute[];
  };
  verbal_style: {
    sentence_structure: string;
    vocabulary_level: string;
    punctuation_style: string;
  };
  preferred_terminology: TerminologyItem[];
  visual_style: {
    aesthetic: string;
    imagery_guidelines: string;
    color_usage: string;
  };
  voice_archetypes: VoiceArchetypes;
  tone_dimensions: ToneDimensions;
  content_categories: ContentCategory[];
}

const defaultVoiceArchetypes: VoiceArchetypes = {
  primary: null,
  secondary: null,
  antiArchetypes: [],
};

const defaultToneDimensions: ToneDimensions = {
  formality: 50,
  energy: 50,
  warmth: 50,
  confidence: 50,
  complexity: 50,
};

export function ExpressionPage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const { updateBrandKit } = useBrandKits();
  const [brandVoice, setBrandVoice] = useState(brandKit.brand_voice || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [expressionId, setExpressionId] = useState<string | undefined>();

  const [formData, setFormData] = useState<ExpressionData>({
    brand_kit_id: brandKit.id,
    tone_of_voice: {
      description: "",
      attributes: [
        { attribute: "Formality", min_label: "Casual", max_label: "Formal", value: 50 },
        { attribute: "Energy", min_label: "Calm", max_label: "Energetic", value: 50 },
        { attribute: "Humor", min_label: "Serious", max_label: "Playful", value: 50 },
      ],
    },
    verbal_style: {
      sentence_structure: "",
      vocabulary_level: "",
      punctuation_style: "",
    },
    preferred_terminology: [],
    visual_style: {
      aesthetic: "",
      imagery_guidelines: "",
      color_usage: "",
    },
    voice_archetypes: defaultVoiceArchetypes,
    tone_dimensions: defaultToneDimensions,
    content_categories: [],
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("brand_kit_expression")
          .select("*")
          .eq("brand_kit_id", brandKit.id)
          .maybeSingle();

        if (data) {
          setExpressionId(data.id);

          // Migrate old data format if needed
          const terminology = (data.preferred_terminology as any) || [];
          const migratedTerminology = terminology.map((item: any) => {
            // If it's the old format { term, avoid }, convert it
            if (item.avoid !== undefined && !item.instead_of) {
              return {
                term: item.term,
                instead_of: item.avoid ? [item.avoid] : [],
                description: item.description || "",
              };
            }
            // Otherwise, ensure it has the new structure
            return {
              term: item.term || "",
              instead_of: item.instead_of || [],
              description: item.description || "",
            };
          });

          setFormData({
            id: data.id,
            brand_kit_id: data.brand_kit_id,
            tone_of_voice: (data.tone_of_voice as any) || formData.tone_of_voice,
            verbal_style: (data.verbal_style as any) || formData.verbal_style,
            preferred_terminology: migratedTerminology,
            visual_style: (data.visual_style as any) || formData.visual_style,
            voice_archetypes: (data.voice_archetypes as any) || defaultVoiceArchetypes,
            tone_dimensions: (data.tone_dimensions as any) || defaultToneDimensions,
            content_categories: (data.content_categories as any) || [],
          });
        }
      } finally {
        setIsLoading(false);
        setIsInitialLoadComplete(true);
      }
    };

    loadData();
  }, [brandKit.id]);

  const performSave = useCallback(async () => {
    const dataToSave = {
      brand_kit_id: formData.brand_kit_id,
      tone_of_voice: formData.tone_of_voice as unknown as any,
      verbal_style: formData.verbal_style as unknown as any,
      preferred_terminology: formData.preferred_terminology as unknown as any,
      visual_style: formData.visual_style as unknown as any,
      voice_archetypes: formData.voice_archetypes as unknown as any,
      tone_dimensions: formData.tone_dimensions as unknown as any,
      content_categories: formData.content_categories as unknown as any,
    };

    if (expressionId) {
      const { error } = await supabase.from("brand_kit_expression").update(dataToSave).eq("id", expressionId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("brand_kit_expression").insert(dataToSave).select().single();
      if (error) throw error;
      if (data) setExpressionId(data.id);
    }
  }, [formData, expressionId]);

  const webhookTrigger = useWebhookTrigger(brandKit.id);

  const { autoSaveEnabled, hasUnsavedChanges, isSaving, manualSave, lastError, clearError } = useAutoSave({
    data: formData,
    onSave: performSave,
    onAfterSave: webhookTrigger,
    enabled: isInitialLoadComplete,
  });

  // Warn user about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!autoSaveEnabled && hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoSaveEnabled, hasUnsavedChanges]);

  // Handlers for BrandToneCard
  const handleToneDescriptionChange = (description: string) => {
    setFormData((prev) => ({
      ...prev,
      tone_of_voice: { ...prev.tone_of_voice, description },
    }));
  };

  const handleToneAttributeChange = (index: number, value: number) => {
    setFormData((prev) => ({
      ...prev,
      tone_of_voice: {
        ...prev.tone_of_voice,
        attributes: prev.tone_of_voice.attributes.map((attr, i) => (i === index ? { ...attr, value } : attr)),
      },
    }));
  };

  // Handler for VerbalStyleCard
  const handleVerbalStyleChange = (field: keyof typeof formData.verbal_style, value: string) => {
    setFormData((prev) => ({
      ...prev,
      verbal_style: { ...prev.verbal_style, [field]: value },
    }));
  };

  // Handlers for PreferredTerminologyCard
  const handleAddTerminology = (item: TerminologyItem) => {
    setFormData((prev) => ({
      ...prev,
      preferred_terminology: [...prev.preferred_terminology, item],
    }));
  };

  const handleRemoveTerminology = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      preferred_terminology: prev.preferred_terminology.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateTerminology = (index: number, updated: TerminologyItem) => {
    setFormData((prev) => ({
      ...prev,
      preferred_terminology: prev.preferred_terminology.map((item, i) => (i === index ? updated : item)),
    }));
  };

  // Handler for VisualStyleCard
  const handleVisualStyleChange = (field: keyof typeof formData.visual_style, value: string) => {
    setFormData((prev) => ({
      ...prev,
      visual_style: { ...prev.visual_style, [field]: value },
    }));
  };

  // Handler for VoiceArchetypesCard
  const handleVoiceArchetypesChange = (voiceArchetypes: VoiceArchetypes) => {
    setFormData((prev) => ({
      ...prev,
      voice_archetypes: voiceArchetypes,
    }));
  };

  // Handler for ContentCategoriesCard
  const handleContentCategoriesChange = (contentCategories: ContentCategory[]) => {
    setFormData((prev) => ({
      ...prev,
      content_categories: contentCategories,
    }));
  };

  // Handler for ToneDimensionsCard
  const handleToneDimensionsChange = (toneDimensions: ToneDimensions) => {
    setFormData((prev) => ({
      ...prev,
      tone_dimensions: toneDimensions,
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        {/* Save button skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        {/* Tone of Voice skeleton */}
        <Card className="border-2 border-border">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Verbal Style skeleton */}
        <Card className="border-2 border-border">
          <CardHeader>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Preferred Terminology skeleton */}
        <Card className="border-2 border-border">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
        {/* Visual Style skeleton */}
        <Card className="border-2 border-border">
          <CardHeader>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to save</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{lastError}</span>
            <Button variant="outline" size="sm" onClick={clearError}>
              Dismiss
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

      {/* Voice Archetypes - Full width at top */}
      <VoiceArchetypesCard
        voiceArchetypes={formData.voice_archetypes}
        onChange={handleVoiceArchetypesChange}
      />

      {/* Brand Voice - between archetypes and dimensions */}
      <BrandVoiceCard
        value={brandVoice}
        onChange={(value) => {
          setBrandVoice(value);
          updateBrandKit({ id: brandKit.id, brand_voice: value || null });
        }}
      />

      {/* Voice Dimensions + Brand Tone side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <ToneDimensionsCard
          dimensions={formData.tone_dimensions}
          onChange={handleToneDimensionsChange}
        />

        <BrandToneCard
          toneOfVoice={formData.tone_of_voice}
          onDescriptionChange={handleToneDescriptionChange}
          onAttributeChange={handleToneAttributeChange}
        />
      </div>

      {/* 2-column grid for other expression cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <VerbalStyleCard
          verbalStyle={formData.verbal_style}
          onChange={handleVerbalStyleChange}
        />

        <PreferredTerminologyCard
          terminology={formData.preferred_terminology}
          onAdd={handleAddTerminology}
          onRemove={handleRemoveTerminology}
          onUpdate={handleUpdateTerminology}
        />

        <VisualStyleCard
          visualStyle={formData.visual_style}
          onChange={handleVisualStyleChange}
        />
      </div>

      {/* Content Categories - Full width */}
      <ContentCategoriesCard
        categories={formData.content_categories}
        onChange={handleContentCategoriesChange}
      />

      {/* Expression Examples - Full width at bottom */}
      <ExpressionExamplesCard brandKitId={brandKit.id} />
    </div>
  );
}
