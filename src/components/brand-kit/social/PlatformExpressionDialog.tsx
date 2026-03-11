import { useState, useEffect } from 'react';
import { Palette, RotateCcw, Lightbulb, X, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import type { SocialProfile, SocialPlatform } from './types';

interface ExpressionOverrides {
  verbal_style?: {
    sentence_structure?: string[];
    vocabulary_level?: string[];
    punctuation_style?: string[];
    emoji_usage?: string[];
    hashtag_style?: string[];
  };
  tone_dimensions?: {
    energy?: number;
    formality?: number;
    warmth?: number;
    confidence?: number;
    complexity?: number;
  };
  preferred_terminology?: Array<{
    term: string;
    instead_of: string[];
    description?: string;
  }>;
  is_override_active?: boolean;
  ai_suggestions?: Array<{
    field: string;
    suggested_value: string;
    reason: string;
  }>;
  last_analyzed_at?: string;
}

interface GlobalExpression {
  verbal_style?: {
    sentence_structure?: string;
    vocabulary_level?: string;
    punctuation_style?: string;
  };
  tone_dimensions?: {
    energy?: number;
    formality?: number;
    warmth?: number;
    confidence?: number;
    complexity?: number;
  };
  preferred_terminology?: Array<{
    term: string;
    instead_of?: string[];
    description?: string;
  }>;
}

interface PlatformExpressionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SocialProfile | null;
  globalExpression: GlobalExpression | null;
  onSave: (overrides: ExpressionOverrides) => Promise<void>;
  platform: SocialPlatform;
}

const VERBAL_STYLE_OPTIONS = {
  sentence_structure: [
    'Short and punchy',
    'Long and flowing',
    'Varied rhythm',
    'Question-led',
    'List-heavy',
  ],
  vocabulary_level: [
    'Simple and accessible',
    'Technical and sophisticated',
    'Industry jargon',
    'Conversational',
    'Academic',
  ],
  punctuation_style: [
    'Minimal punctuation',
    'Em dash enthusiast',
    'Exclamation-heavy',
    'Oxford comma always',
    'Ellipsis for effect',
  ],
  emoji_usage: ['Never', 'Sparingly', 'Frequently', 'Platform-dependent'],
  hashtag_style: ['None', 'Minimal (1-3)', 'Moderate (4-6)', 'Heavy (7+)'],
};

const TONE_DIMENSIONS = [
  { key: 'energy', label: 'Energy', lowLabel: 'Calm', highLabel: 'Energetic' },
  { key: 'formality', label: 'Formality', lowLabel: 'Casual', highLabel: 'Formal' },
  { key: 'warmth', label: 'Warmth', lowLabel: 'Reserved', highLabel: 'Warm' },
  { key: 'confidence', label: 'Confidence', lowLabel: 'Humble', highLabel: 'Bold' },
  { key: 'complexity', label: 'Complexity', lowLabel: 'Simple', highLabel: 'Complex' },
];

export function PlatformExpressionDialog({
  open,
  onOpenChange,
  profile,
  globalExpression,
  onSave,
  platform,
}: PlatformExpressionDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('verbal');

  // Initialize with existing overrides or defaults from global
  const [overrides, setOverrides] = useState<ExpressionOverrides>({
    is_override_active: false,
    verbal_style: {},
    tone_dimensions: {},
    preferred_terminology: [],
  });

  // Field-level override toggles
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, boolean>>({});

  // Custom text input state for each verbal style field
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open && profile) {
      const existingOverrides = (profile.expression_overrides as ExpressionOverrides) || {};
      setOverrides({
        is_override_active: existingOverrides.is_override_active || false,
        verbal_style: existingOverrides.verbal_style || {},
        tone_dimensions: existingOverrides.tone_dimensions || {},
        preferred_terminology: existingOverrides.preferred_terminology || [],
        ai_suggestions: existingOverrides.ai_suggestions || [],
        last_analyzed_at: existingOverrides.last_analyzed_at,
      });

      // Determine which fields have overrides
      const fieldStates: Record<string, boolean> = {};
      if (existingOverrides.verbal_style) {
        Object.keys(existingOverrides.verbal_style).forEach((key) => {
          if (existingOverrides.verbal_style?.[key as keyof typeof existingOverrides.verbal_style]) {
            fieldStates[`verbal_${key}`] = true;
          }
        });
      }
      if (existingOverrides.tone_dimensions) {
        Object.keys(existingOverrides.tone_dimensions).forEach((key) => {
          if (existingOverrides.tone_dimensions?.[key as keyof typeof existingOverrides.tone_dimensions] !== undefined) {
            fieldStates[`tone_${key}`] = true;
          }
        });
      }
      setFieldOverrides(fieldStates);
    }
  }, [open, profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(overrides);
      toast({
        title: 'Expression settings saved',
        description: `Platform-specific settings for ${platform} have been saved.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save expression settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToGlobal = () => {
    setOverrides({
      is_override_active: false,
      verbal_style: {},
      tone_dimensions: {},
      preferred_terminology: [],
    });
    setFieldOverrides({});
    toast({
      title: 'Reset to global',
      description: 'All platform-specific overrides have been cleared.',
    });
  };

  const toggleFieldOverride = (fieldKey: string, enabled: boolean) => {
    setFieldOverrides((prev) => ({ ...prev, [fieldKey]: enabled }));
    
    // Extract section and field from fieldKey (e.g., "verbal_sentence_structure" -> "verbal", "sentence_structure")
    const parts = fieldKey.split('_');
    const section = parts[0];
    const field = parts.slice(1).join('_');
    
    if (enabled) {
      // Populate with global value when enabling override
      if (section === 'verbal' && globalExpression?.verbal_style) {
        const globalValue = globalExpression.verbal_style[field as keyof typeof globalExpression.verbal_style];
        if (globalValue) {
          setOverrides((prev) => ({
            ...prev,
            is_override_active: true,
            verbal_style: {
              ...prev.verbal_style,
              [field]: Array.isArray(globalValue) ? globalValue : [globalValue],
            },
          }));
        }
      } else if (section === 'tone' && globalExpression?.tone_dimensions) {
        const globalValue = globalExpression.tone_dimensions[field as keyof typeof globalExpression.tone_dimensions];
        if (globalValue !== undefined) {
          setOverrides((prev) => ({
            ...prev,
            is_override_active: true,
            tone_dimensions: {
              ...prev.tone_dimensions,
              [field]: globalValue,
            },
          }));
        }
      }
    } else {
      // Clear the override value when disabled
      if (section === 'verbal') {
        setOverrides((prev) => ({
          ...prev,
          verbal_style: {
            ...prev.verbal_style,
            [field]: undefined,
          },
        }));
      } else if (section === 'tone') {
        setOverrides((prev) => ({
          ...prev,
          tone_dimensions: {
            ...prev.tone_dimensions,
            [field]: undefined,
          },
        }));
      }
    }
    // Mark that overrides are active
    setOverrides((prev) => ({ ...prev, is_override_active: true }));
  };

  const toggleVerbalStyleOption = (field: string, option: string) => {
    setOverrides((prev) => {
      const rawValues = prev.verbal_style?.[field as keyof typeof prev.verbal_style];
      const currentValues: string[] = Array.isArray(rawValues) ? rawValues : (rawValues ? [rawValues] : []);
      const newValues = currentValues.includes(option)
        ? currentValues.filter((v) => v !== option)
        : [...currentValues, option];
      
      return {
        ...prev,
        is_override_active: true,
        verbal_style: {
          ...prev.verbal_style,
          [field]: newValues,
        },
      };
    });
  };

  const removeVerbalStyleOption = (field: string, option: string) => {
    setOverrides((prev) => {
      const rawValues = prev.verbal_style?.[field as keyof typeof prev.verbal_style];
      const currentValues: string[] = Array.isArray(rawValues) ? rawValues : (rawValues ? [rawValues] : []);
      return {
        ...prev,
        verbal_style: {
          ...prev.verbal_style,
          [field]: currentValues.filter((v) => v !== option),
        },
      };
    });
  };

  const updateToneDimension = (field: string, value: number) => {
    setOverrides((prev) => ({
      ...prev,
      is_override_active: true,
      tone_dimensions: {
        ...prev.tone_dimensions,
        [field]: value,
      },
    }));
  };

  const getGlobalValue = (section: 'verbal_style' | 'tone_dimensions', field: string) => {
    if (!globalExpression) return undefined;
    if (section === 'verbal_style') {
      return globalExpression.verbal_style?.[field as keyof typeof globalExpression.verbal_style];
    }
    return globalExpression.tone_dimensions?.[field as keyof typeof globalExpression.tone_dimensions];
  };

  const aiSuggestions = overrides.ai_suggestions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Platform Expression - {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </DialogTitle>
          <DialogDescription>
            Customize expression settings for this platform. Leave fields unchanged to use global defaults.
          </DialogDescription>
        </DialogHeader>

        {aiSuggestions.length > 0 && (
          <Alert className="border-info bg-info/10">
            <Lightbulb className="h-4 w-4 text-info" />
            <AlertDescription>
              <strong>AI Suggestions:</strong> Based on your post analysis, we have {aiSuggestions.length} recommendation(s)
              to improve your platform expression.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="verbal">Verbal Style</TabsTrigger>
            <TabsTrigger value="tone">Tone Dimensions</TabsTrigger>
          </TabsList>

          <TabsContent value="verbal" className="space-y-4 mt-4">
            {Object.entries(VERBAL_STYLE_OPTIONS).map(([field, options]) => {
              const fieldKey = `verbal_${field}`;
              const isOverridden = fieldOverrides[fieldKey] || false;
              const globalValue = getGlobalValue('verbal_style', field) as string | undefined;
              const rawValues = overrides.verbal_style?.[field as keyof typeof overrides.verbal_style];
              // Ensure currentValues is always an array (handle legacy string data)
              const currentValues: string[] = Array.isArray(rawValues) ? rawValues : (rawValues ? [rawValues] : []);
              const suggestion = aiSuggestions.find((s) => s.field === fieldKey);

              return (
                <Card key={field} className={isOverridden ? 'border-primary' : 'border-border'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium capitalize">
                        {field.replace(/_/g, ' ')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={fieldKey} className="text-xs text-muted-foreground">
                          Override
                        </Label>
                        <Switch
                          id={fieldKey}
                          checked={isOverridden}
                          onCheckedChange={(checked) => toggleFieldOverride(fieldKey, checked)}
                        />
                      </div>
                    </div>
                    {globalValue && (
                      <CardDescription className="text-xs">
                        Global: {globalValue}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isOverridden ? (
                      <div className="space-y-3">
                        {/* Selected options as removable tags */}
                        {currentValues.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {currentValues.map((value) => (
                              <Badge
                                key={value}
                                variant="secondary"
                                className="flex items-center gap-1 pr-1"
                              >
                                {value}
                                <button
                                  type="button"
                                  onClick={() => removeVerbalStyleOption(field, value)}
                                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Multi-select checkboxes */}
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-popover">
                          {options.map((opt) => (
                            <div key={opt} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${fieldKey}-${opt}`}
                                checked={currentValues.includes(opt)}
                                onCheckedChange={() => toggleVerbalStyleOption(field, opt)}
                              />
                              <Label
                                htmlFor={`${fieldKey}-${opt}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </div>

                        {/* Custom text input */}
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Add custom option..."
                            value={customInputs[field] || ''}
                            onChange={(e) => setCustomInputs(prev => ({
                              ...prev,
                              [field]: e.target.value
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customInputs[field]?.trim()) {
                                toggleVerbalStyleOption(field, customInputs[field].trim());
                                setCustomInputs(prev => ({ ...prev, [field]: '' }));
                                e.preventDefault();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (customInputs[field]?.trim()) {
                                toggleVerbalStyleOption(field, customInputs[field].trim());
                                setCustomInputs(prev => ({ ...prev, [field]: '' }));
                              }
                            }}
                            disabled={!customInputs[field]?.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {suggestion && (
                          <div className="flex items-center gap-2 text-xs text-info">
                            <Lightbulb className="h-3 w-3" />
                            <span>Suggested: {suggestion.suggested_value}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => toggleVerbalStyleOption(field, suggestion.suggested_value)}
                            >
                              Apply
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Using global default: {globalValue || 'Not set'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="tone" className="space-y-4 mt-4">
            {TONE_DIMENSIONS.map(({ key, label, lowLabel, highLabel }) => {
              const fieldKey = `tone_${key}`;
              const isOverridden = fieldOverrides[fieldKey] || false;
              const globalValue = getGlobalValue('tone_dimensions', key) as number | undefined;
              const currentValue = overrides.tone_dimensions?.[key as keyof typeof overrides.tone_dimensions] ?? globalValue ?? 50;
              const suggestion = aiSuggestions.find((s) => s.field === fieldKey);

              return (
                <Card key={key} className={isOverridden ? 'border-primary' : 'border-border'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{label}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={fieldKey} className="text-xs text-muted-foreground">
                          Override
                        </Label>
                        <Switch
                          id={fieldKey}
                          checked={isOverridden}
                          onCheckedChange={(checked) => toggleFieldOverride(fieldKey, checked)}
                        />
                      </div>
                    </div>
                    {globalValue !== undefined && (
                      <CardDescription className="text-xs">
                        Global: {globalValue}%
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isOverridden ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{lowLabel}</span>
                          <span>{currentValue}%</span>
                          <span>{highLabel}</span>
                        </div>
                        <Slider
                          value={[currentValue]}
                          onValueChange={([val]) => updateToneDimension(key, val)}
                          max={100}
                          step={1}
                        />
                        {suggestion && (
                          <div className="flex items-center gap-2 text-xs text-info">
                            <Lightbulb className="h-3 w-3" />
                            <span>Suggested: {suggestion.suggested_value}%</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateToneDimension(key, parseInt(suggestion.suggested_value))}
                            >
                              Apply
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{lowLabel}</span>
                          <span>{globalValue ?? 50}%</span>
                          <span>{highLabel}</span>
                        </div>
                        <Slider
                          value={[globalValue ?? 50]}
                          max={100}
                          step={1}
                          disabled
                          className="opacity-50"
                        />
                        <p className="text-xs text-muted-foreground">Using global default</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleResetToGlobal} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Global
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Save Overrides'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
