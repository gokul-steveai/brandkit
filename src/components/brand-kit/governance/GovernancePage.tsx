import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { BrandKit } from "@/hooks/useBrandKits";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useWebhookTrigger } from "@/hooks/useWebhookTrigger";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { SaveStatusHeader } from '../shared';
import { BehavioralConstraintsCard } from "./BehavioralConstraintsCard";
import { UsageGuidelinesCard } from "./UsageGuidelinesCard";
import { DisclosurePolicyCard } from "./DisclosurePolicyCard";
import { ComplianceNotesCard } from "./ComplianceNotesCard";
import { WritingConstraintsCard, WritingConstraints, WritingConstraint } from "./WritingConstraintsCard";
import { DriftPreventionCard, DriftPreventionPrompt } from "./DriftPreventionCard";
import { EnhancedNegativeDirectoryCard, NegativeDirectoryItem } from "./EnhancedNegativeDirectoryCard";

interface GovernanceData {
  id?: string;
  brand_kit_id: string;
  behavioral_constraints: string[];
  usage_guidelines: string[];
  negative_directory: NegativeDirectoryItem[];
  disclosure_policy: string;
  compliance_notes: string;
  writing_constraints: WritingConstraints;
  drift_prevention_prompts: DriftPreventionPrompt[];
}

const defaultWritingConstraints: WritingConstraints = {
  constraints: [],
  platformSpecificEnabled: false,
};

export function GovernancePage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [governanceId, setGovernanceId] = useState<string | undefined>();

  const [formData, setFormData] = useState<GovernanceData>({
    brand_kit_id: brandKit.id,
    behavioral_constraints: [],
    usage_guidelines: [],
    negative_directory: [],
    disclosure_policy: "",
    compliance_notes: "",
    writing_constraints: defaultWritingConstraints,
    drift_prevention_prompts: [],
  });

  // Input states for adding new items (legacy simple lists)
  const [newConstraint, setNewConstraint] = useState("");
  const [newGuideline, setNewGuideline] = useState("");

  const performSave = useCallback(async () => {
    const dataToSave = {
      brand_kit_id: formData.brand_kit_id,
      behavioral_constraints: formData.behavioral_constraints as unknown as any,
      usage_guidelines: formData.usage_guidelines as unknown as any,
      negative_directory: formData.negative_directory as unknown as any,
      disclosure_policy: formData.disclosure_policy,
      compliance_notes: formData.compliance_notes,
      writing_constraints: formData.writing_constraints as unknown as any,
      drift_prevention_prompts: formData.drift_prevention_prompts as unknown as any,
    };

    if (governanceId) {
      const { error } = await supabase.from("brand_kit_governance").update(dataToSave).eq("id", governanceId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("brand_kit_governance").insert(dataToSave).select().single();
      if (error) throw error;
      if (data) setGovernanceId(data.id);
    }
  }, [formData, governanceId]);

  const webhookTrigger = useWebhookTrigger(brandKit.id);

  const { autoSaveEnabled, hasUnsavedChanges, isSaving, manualSave, lastError, clearError } = useAutoSave({
    data: formData,
    onSave: performSave,
    onAfterSave: webhookTrigger,
    enabled: isInitialLoadComplete,
  });

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("brand_kit_governance")
          .select("*")
          .eq("brand_kit_id", brandKit.id)
          .maybeSingle();

        if (data) {
          setGovernanceId(data.id);
          
          // Migrate old negative_directory format (string[]) to new format (NegativeDirectoryItem[])
          let negativeDirectory: NegativeDirectoryItem[] = [];
          if (Array.isArray(data.negative_directory)) {
            negativeDirectory = data.negative_directory.map((item: any) => {
              // If it's already the new format
              if (typeof item === 'object' && item.id && item.term) {
                return item as NegativeDirectoryItem;
              }
              // If it's the old format (just a string)
              if (typeof item === 'string') {
                return {
                  id: crypto.randomUUID(),
                  term: item,
                  category: 'other' as const,
                  source: 'manual' as const,
                };
              }
              return null;
            }).filter(Boolean) as NegativeDirectoryItem[];
          }
          
          setFormData({
            id: data.id,
            brand_kit_id: data.brand_kit_id,
            behavioral_constraints: Array.isArray(data.behavioral_constraints)
              ? (data.behavioral_constraints as string[])
              : [],
            usage_guidelines: Array.isArray(data.usage_guidelines) ? (data.usage_guidelines as string[]) : [],
            negative_directory: negativeDirectory,
            disclosure_policy: data.disclosure_policy || "",
            compliance_notes: data.compliance_notes || "",
            writing_constraints: (data.writing_constraints as any) || defaultWritingConstraints,
            drift_prevention_prompts: (data.drift_prevention_prompts as any) || [],
          });
        }
      } finally {
        setIsLoading(false);
        setIsInitialLoadComplete(true);
      }
    };

    loadData();
  }, [brandKit.id]);

  const addItem = (
    field: "behavioral_constraints" | "usage_guidelines",
    value: string,
    setter: (v: string) => void,
  ) => {
    if (value.trim()) {
      setFormData((prev) => ({ ...prev, [field]: [...prev[field], value.trim()] }));
      setter("");
    }
  };

  const removeItem = (field: "behavioral_constraints" | "usage_guidelines", index: number) => {
    setFormData((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  // Handlers for new cards
  const handleWritingConstraintsChange = (writingConstraints: WritingConstraints) => {
    setFormData((prev) => ({ ...prev, writing_constraints: writingConstraints }));
  };

  const handleDriftPreventionChange = (prompts: DriftPreventionPrompt[]) => {
    setFormData((prev) => ({ ...prev, drift_prevention_prompts: prompts }));
  };

  const handleNegativeDirectoryChange = (items: NegativeDirectoryItem[]) => {
    setFormData((prev) => ({ ...prev, negative_directory: items }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-2 border-border">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <FeatureGate feature="governance" brandKitId={brandKit.id}>
      <div className="space-y-6 max-w-5xl animate-fade-in">
        {lastError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to save: {lastError}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
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

        {/* Writing Constraints & Drift Prevention - Side by side */}
        <div className="grid gap-6 md:grid-cols-2">
          <WritingConstraintsCard
            writingConstraints={formData.writing_constraints}
            onChange={handleWritingConstraintsChange}
          />

          <DriftPreventionCard
            prompts={formData.drift_prevention_prompts}
            onChange={handleDriftPreventionChange}
          />
        </div>

        {/* Enhanced Negative Directory - Full width */}
        <EnhancedNegativeDirectoryCard
          items={formData.negative_directory}
          onChange={handleNegativeDirectoryChange}
        />

        {/* 2-column grid for other governance cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <BehavioralConstraintsCard
            items={formData.behavioral_constraints}
            inputValue={newConstraint}
            onInputChange={setNewConstraint}
            onAdd={() => addItem("behavioral_constraints", newConstraint, setNewConstraint)}
            onRemove={(index) => removeItem("behavioral_constraints", index)}
          />

          <UsageGuidelinesCard
            items={formData.usage_guidelines}
            inputValue={newGuideline}
            onInputChange={setNewGuideline}
            onAdd={() => addItem("usage_guidelines", newGuideline, setNewGuideline)}
            onRemove={(index) => removeItem("usage_guidelines", index)}
          />

          <DisclosurePolicyCard
            value={formData.disclosure_policy}
            onChange={(value) => setFormData((prev) => ({ ...prev, disclosure_policy: value }))}
          />
        </div>

        {/* Compliance Notes - Full width at bottom */}
        <ComplianceNotesCard
          value={formData.compliance_notes}
          onChange={(value) => setFormData((prev) => ({ ...prev, compliance_notes: value }))}
        />
      </div>
    </FeatureGate>
  );
}
