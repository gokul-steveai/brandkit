import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Sparkles, 
  User, 
  UserX, 
  MessageSquare, 
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';

interface ExtractedData {
  voiceArchetypes?: {
    primary?: { name: string; description: string; characteristics: string[] };
    secondary?: { name: string; description: string; characteristics: string[] };
    antiArchetypes?: { name: string; description: string }[];
  };
  toneDimensions?: {
    formality?: number;
    energy?: number;
    warmth?: number;
    confidence?: number;
    complexity?: number;
  };
  signaturePhrases?: string[];
  vocabularyRules?: {
    preferredTerms?: { term: string; context?: string }[];
    avoidTerms?: { term: string; reason?: string }[];
    brandSpecificTerms?: { term: string; definition?: string }[];
  };
  writingConstraints?: {
    hardConstraints?: string[];
    softGuidelines?: string[];
  };
  contentCategories?: {
    name: string;
    description: string;
    typicalStructure?: string;
    toneShift?: string;
  }[];
  audiencePersonas?: {
    name: string;
    title?: string;
    description?: string;
    demographics?: Record<string, string>;
    painPoints?: string[];
    goals?: string[];
    contentPreferences?: string[];
  }[];
  communityInsights?: {
    sentimentBreakdown?: Record<string, number>;
    topThemes?: string[];
    engagementPatterns?: string[];
  };
  driftPreventionPrompts?: string[];
}

interface BrandKitData {
  expression?: {
    voice_archetypes?: any;
    tone_dimensions?: any;
    preferred_terminology?: any[];
    content_categories?: any[];
  };
  governance?: {
    negative_directory?: any;
    drift_prevention_prompts?: any[];
    writing_constraints?: any;
  };
  audience?: any[];
}

interface AnalysisReportComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileContent: string;
  category: string;
  platformContext: string;
  brandKitId: string;
  onImportComplete: () => void;
}

interface ImportSelection {
  voiceArchetypes: boolean;
  toneDimensions: boolean;
  signaturePhrases: boolean;
  vocabularyRules: boolean;
  writingConstraints: boolean;
  contentCategories: boolean;
  audiencePersonas: boolean;
  driftPreventionPrompts: boolean;
}

export function AnalysisReportComparisonDialog({
  open,
  onOpenChange,
  fileId,
  fileContent,
  category,
  platformContext,
  brandKitId,
  onImportComplete,
}: AnalysisReportComparisonDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [brandKitData, setBrandKitData] = useState<BrandKitData | null>(null);
  const [selection, setSelection] = useState<ImportSelection>({
    voiceArchetypes: false,
    toneDimensions: false,
    signaturePhrases: false,
    vocabularyRules: false,
    writingConstraints: false,
    contentCategories: false,
    audiencePersonas: false,
    driftPreventionPrompts: false,
  });
  const [error, setError] = useState<string | null>(null);

  const processReport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Fetch current brand kit data for comparison
      const [expressionRes, governanceRes, audienceRes] = await Promise.all([
        supabase
          .from('brand_kit_expression')
          .select('voice_archetypes, tone_dimensions, preferred_terminology, content_categories')
          .eq('brand_kit_id', brandKitId)
          .maybeSingle(),
        supabase
          .from('brand_kit_governance')
          .select('negative_directory, drift_prevention_prompts, writing_constraints')
          .eq('brand_kit_id', brandKitId)
          .maybeSingle(),
        supabase
          .from('brand_kit_target_audience')
          .select('*')
          .eq('brand_kit_id', brandKitId),
      ]);

      const expressionData = expressionRes.data as any || {};
      const governanceData = governanceRes.data as any || {};

      setBrandKitData({
        expression: expressionData,
        governance: governanceData,
        audience: audienceRes.data || [],
      });

      // Process report via edge function
      const { data, error: funcError } = await supabase.functions.invoke('process-analysis-report', {
        body: {
          fileContent,
          category,
          platformContext,
          fileId,
        },
      });

      if (funcError) throw funcError;

      if (data?.extractedData) {
        setExtractedData(data.extractedData);
        
        // Auto-select items that have data but brand kit is missing
        const autoSelect: Partial<ImportSelection> = {};
        if (data.extractedData.voiceArchetypes?.primary && !expressionData?.voice_archetypes?.primary) {
          autoSelect.voiceArchetypes = true;
        }
        if (data.extractedData.toneDimensions && !expressionData?.tone_dimensions) {
          autoSelect.toneDimensions = true;
        }
        if (data.extractedData.signaturePhrases?.length > 0) {
          autoSelect.signaturePhrases = true;
        }
        if (data.extractedData.vocabularyRules?.preferredTerms?.length > 0) {
          autoSelect.vocabularyRules = true;
        }
        if (data.extractedData.contentCategories?.length > 0 && (!expressionData?.content_categories || (expressionData.content_categories as any[]).length === 0)) {
          autoSelect.contentCategories = true;
        }
        if (data.extractedData.audiencePersonas?.length > 0 && (!audienceRes.data || audienceRes.data.length === 0)) {
          autoSelect.audiencePersonas = true;
        }
        if (data.extractedData.driftPreventionPrompts?.length > 0) {
          autoSelect.driftPreventionPrompts = true;
        }
        if (data.extractedData.writingConstraints?.hardConstraints?.length > 0) {
          autoSelect.writingConstraints = true;
        }

        setSelection(prev => ({ ...prev, ...autoSelect }));
      }
    } catch (err) {
      console.error('Error processing report:', err);
      setError(err instanceof Error ? err.message : 'Failed to process report');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!extractedData) return;

    setIsImporting(true);
    try {
      const updates: Promise<any>[] = [];

      // Import to brand_kit_expression
      if (selection.voiceArchetypes || selection.toneDimensions || selection.signaturePhrases || selection.vocabularyRules || selection.contentCategories) {
        const expressionUpdates: Record<string, any> = {};

        if (selection.voiceArchetypes && extractedData.voiceArchetypes) {
          expressionUpdates.voice_archetypes = extractedData.voiceArchetypes;
        }

        if (selection.toneDimensions && extractedData.toneDimensions) {
          expressionUpdates.tone_dimensions = extractedData.toneDimensions;
        }

        if (selection.signaturePhrases && extractedData.signaturePhrases) {
          // Merge with existing terminology
          const existingTerms = (brandKitData?.expression?.preferred_terminology as any[]) || [];
          const newTerms = extractedData.signaturePhrases.map(phrase => ({
            term: phrase,
            instead_of: [],
            description: `Signature phrase from ${platformContext} analysis`,
          }));
          expressionUpdates.preferred_terminology = [...existingTerms, ...newTerms];
        }

        if (selection.vocabularyRules && extractedData.vocabularyRules?.preferredTerms) {
          const existingTerms = (brandKitData?.expression?.preferred_terminology as any[]) || [];
          const newTerms = extractedData.vocabularyRules.preferredTerms.map(t => ({
            term: t.term,
            instead_of: [],
            description: t.context || '',
          }));
          expressionUpdates.preferred_terminology = [...(expressionUpdates.preferred_terminology || existingTerms), ...newTerms];
        }

        if (selection.contentCategories && extractedData.contentCategories) {
          expressionUpdates.content_categories = extractedData.contentCategories.map(cat => ({
            name: cat.name,
            description: cat.description,
            typicalStructure: cat.typicalStructure || '',
            toneShift: cat.toneShift || '',
            keyPhrases: [],
            lengthGuidance: '',
          }));
        }

        if (Object.keys(expressionUpdates).length > 0) {
          updates.push(
            (async () => {
              const res = await supabase
                .from('brand_kit_expression')
                .upsert({
                  brand_kit_id: brandKitId,
                  ...expressionUpdates,
                }, { onConflict: 'brand_kit_id' });
              if (res.error) throw res.error;
              return res;
            })()
          );
        }
      }

      // Import to brand_kit_governance
      if (selection.driftPreventionPrompts || selection.writingConstraints) {
        const governanceUpdates: Record<string, any> = {};

        if (selection.driftPreventionPrompts && extractedData.driftPreventionPrompts) {
          governanceUpdates.drift_prevention_prompts = extractedData.driftPreventionPrompts;
        }

        if (selection.writingConstraints && extractedData.writingConstraints) {
          governanceUpdates.writing_constraints = extractedData.writingConstraints;
        }

        // Add avoid terms to negative directory
        if (selection.vocabularyRules && extractedData.vocabularyRules?.avoidTerms) {
          const existingNegative = (brandKitData?.governance?.negative_directory as any) || { words: [], topics: [], phrases: [] };
          governanceUpdates.negative_directory = {
            ...existingNegative,
            words: [
              ...(existingNegative.words || []),
              ...extractedData.vocabularyRules.avoidTerms.map(t => t.term),
            ],
          };
        }

        if (Object.keys(governanceUpdates).length > 0) {
          updates.push(
            (async () => {
              const res = await supabase
                .from('brand_kit_governance')
                .upsert({
                  brand_kit_id: brandKitId,
                  ...governanceUpdates,
                }, { onConflict: 'brand_kit_id' });
              if (res.error) throw res.error;
              return res;
            })()
          );
        }
      }

      // Import audience personas
      if (selection.audiencePersonas && extractedData.audiencePersonas) {
        for (const persona of extractedData.audiencePersonas) {
          updates.push(
            (async () => {
              const res = await supabase
                .from('brand_kit_target_audience')
                .insert({
                  brand_kit_id: brandKitId,
                  persona_name: persona.name,
                  persona_title: persona.title,
                  persona_type: 'customer',
                  demographics: persona.demographics,
                  frustrations_pain_points: persona.painPoints,
                  goals_motivations: persona.goals,
                  information_sources: persona.contentPreferences,
                });
              if (res.error) throw res.error;
              return res;
            })()
          );
        }
      }

      await Promise.all(updates);

      toast({ 
        title: 'Import successful', 
        description: 'Selected insights have been added to your brand kit' 
      });
      
      onImportComplete();
      onOpenChange(false);
    } catch (err) {
      console.error('Error importing data:', err);
      toast({ 
        title: 'Import failed', 
        description: err instanceof Error ? err.message : 'Could not import data',
        variant: 'destructive' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  const hasSelections = Object.values(selection).some(v => v);

  const renderComparisonItem = (
    label: string,
    icon: React.ReactNode,
    reportData: any,
    brandKitHas: boolean,
    selectionKey: keyof ImportSelection
  ) => {
    if (!reportData) return null;

    return (
      <div className="p-4 rounded-lg border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-3">
            {brandKitHas ? (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Has Data
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Empty
              </Badge>
            )}
            <Checkbox
              checked={selection[selectionKey]}
              onCheckedChange={(checked) => 
                setSelection(prev => ({ ...prev, [selectionKey]: checked as boolean }))
              }
            />
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="p-3 rounded bg-primary/5 border border-primary/20">
            <p className="text-xs font-medium text-primary mb-2">From Report</p>
            <div className="text-sm text-muted-foreground">
              {typeof reportData === 'string' ? reportData : (
                Array.isArray(reportData) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {reportData.slice(0, 3).map((item: any, i: number) => (
                      <li key={i} className="truncate">
                        {typeof item === 'string' ? item : item.name || item.term || JSON.stringify(item)}
                      </li>
                    ))}
                    {reportData.length > 3 && (
                      <li className="text-xs">+{reportData.length - 3} more</li>
                    )}
                  </ul>
                ) : (
                  <pre className="text-xs overflow-hidden">{JSON.stringify(reportData, null, 2).slice(0, 200)}</pre>
                )
              )}
            </div>
          </div>
          <div className="p-3 rounded bg-muted/50 border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Current Brand Kit</p>
            <div className="text-sm text-muted-foreground">
              {brandKitHas ? (
                <span className="text-xs">Existing data will be merged/updated</span>
              ) : (
                <span className="text-xs italic">No data yet - will be added</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analyze & Import Report Data
          </DialogTitle>
          <DialogDescription>
            Extract insights from this report and selectively import them into your brand kit.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pr-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!extractedData && !isProcessing && (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Ready to Analyze</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI will extract structured data from your {category.replace(/_/g, ' ')} and compare it with your brand kit.
                  </p>
                </div>
                <Button onClick={processReport} size="lg">
                  <Sparkles className="mr-2 h-4 w-4 text-ai-sparkle" />
                  Analyze Report
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="text-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Analyzing report and comparing with brand kit...</p>
              </div>
            )}

            {extractedData && (
              <Tabs defaultValue="expression" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="expression">Expression</TabsTrigger>
                  <TabsTrigger value="governance">Governance</TabsTrigger>
                  <TabsTrigger value="audience">Audience</TabsTrigger>
                </TabsList>

                <TabsContent value="expression" className="space-y-4 mt-4">
                  {renderComparisonItem(
                    'Voice Archetypes',
                    <User className="h-4 w-4 text-primary" />,
                    extractedData.voiceArchetypes,
                    !!brandKitData?.expression?.voice_archetypes?.primary,
                    'voiceArchetypes'
                  )}
                  {renderComparisonItem(
                    'Tone Dimensions',
                    <MessageSquare className="h-4 w-4 text-blue-500" />,
                    extractedData.toneDimensions,
                    !!brandKitData?.expression?.tone_dimensions,
                    'toneDimensions'
                  )}
                  {renderComparisonItem(
                    'Signature Phrases',
                    <MessageSquare className="h-4 w-4 text-green-500" />,
                    extractedData.signaturePhrases,
                    (brandKitData?.expression?.preferred_terminology?.length || 0) > 0,
                    'signaturePhrases'
                  )}
                  {renderComparisonItem(
                    'Vocabulary Rules',
                    <MessageSquare className="h-4 w-4 text-orange-500" />,
                    extractedData.vocabularyRules?.preferredTerms,
                    (brandKitData?.expression?.preferred_terminology?.length || 0) > 0,
                    'vocabularyRules'
                  )}
                  {renderComparisonItem(
                    'Content Categories',
                    <Layers className="h-4 w-4 text-purple-500" />,
                    extractedData.contentCategories,
                    (brandKitData?.expression?.content_categories?.length || 0) > 0,
                    'contentCategories'
                  )}
                </TabsContent>

                <TabsContent value="governance" className="space-y-4 mt-4">
                  {renderComparisonItem(
                    'Writing Constraints',
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />,
                    extractedData.writingConstraints,
                    !!brandKitData?.governance?.writing_constraints,
                    'writingConstraints'
                  )}
                  {renderComparisonItem(
                    'Drift Prevention Prompts',
                    <UserX className="h-4 w-4 text-destructive" />,
                    extractedData.driftPreventionPrompts,
                    (brandKitData?.governance?.drift_prevention_prompts?.length || 0) > 0,
                    'driftPreventionPrompts'
                  )}
                  {extractedData.vocabularyRules?.avoidTerms && (
                    <div className="p-4 rounded-lg border bg-destructive/5">
                      <div className="flex items-center gap-2 mb-2">
                        <UserX className="h-4 w-4 text-destructive" />
                        <span className="font-medium">Terms to Avoid</span>
                        <Badge variant="outline" className="text-xs">
                          {extractedData.vocabularyRules.avoidTerms.length} terms
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These will be added to your Negative Directory when you import Vocabulary Rules.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="audience" className="space-y-4 mt-4">
                  {renderComparisonItem(
                    'Audience Personas',
                    <Target className="h-4 w-4 text-primary" />,
                    extractedData.audiencePersonas,
                    (brandKitData?.audience?.length || 0) > 0,
                    'audiencePersonas'
                  )}
                  {extractedData.communityInsights && (
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Community Insights</span>
                        <Badge variant="secondary" className="text-xs">Preview</Badge>
                      </div>
                      {extractedData.communityInsights.topThemes && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {extractedData.communityInsights.topThemes.slice(0, 5).map((theme, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {extractedData && (
            <Button 
              onClick={handleImport} 
              disabled={!hasSelections || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Import Selected ({Object.values(selection).filter(Boolean).length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}