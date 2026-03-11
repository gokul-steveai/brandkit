import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { GOOGLE_FONTS, FONT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS } from '@/lib/constants/google-fonts';

interface FontSizes {
  h1?: string;
  h2?: string;
  h3?: string;
  h4?: string;
  body?: string;
  small?: string;
  [key: string]: string | undefined;
}

interface FontWeights {
  regular?: number;
  medium?: number;
  semibold?: number;
  bold?: number;
  [key: string]: number | undefined;
}

interface TypographyCardProps {
  formData: {
    heading_font: string;
    body_font: string;
    paragraph_font: string;
    font_sizes?: FontSizes | Record<string, string>;
    font_weights?: FontWeights | Record<string, number>;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFontSizesChange?: (sizes: FontSizes) => void;
  onFontWeightsChange?: (weights: FontWeights) => void;
}

interface FontComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function FontCombobox({ id, label, value, onChange }: FontComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10"
            style={{ fontFamily: value || undefined }}
          >
            <span className="truncate">{value || `Select ${label.toLowerCase()}...`}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search or type font name..." />
            <CommandList>
              <CommandEmpty>
                <button
                  className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.closest('[cmdk-root]')?.querySelector('input');
                    if (input?.value) {
                      onChange(input.value);
                      setOpen(false);
                    }
                  }}
                >
                  Use custom font name
                </button>
              </CommandEmpty>
              <CommandGroup>
                {GOOGLE_FONTS.map((font) => (
                  <CommandItem
                    key={font}
                    value={font}
                    onSelect={() => {
                      onChange(font);
                      setOpen(false);
                    }}
                    style={{ fontFamily: font }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === font ? 'opacity-100' : 'opacity-0')} />
                    {font}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface SizeComboboxProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function SizeCombobox({ id, label, value, placeholder, onChange }: SizeComboboxProps) {
  // Strip "px" from display/stored value
  const numericValue = value?.replace(/px$/i, '') || '';

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Select
          value={numericValue}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="h-8 flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
            {/* Show current value if custom */}
            {numericValue && !FONT_SIZE_OPTIONS.includes(numericValue as any) && (
              <SelectItem value={numericValue}>{numericValue} (custom)</SelectItem>
            )}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground w-5 shrink-0">px</span>
      </div>
    </div>
  );
}

export function TypographyCard({
  formData,
  onInputChange,
  onFontSizesChange,
  onFontWeightsChange,
}: TypographyCardProps) {
  const [sizesOpen, setSizesOpen] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);

  const fontSizes = formData.font_sizes || {};
  const fontWeights = formData.font_weights || {};

  const handleSizeChange = (key: keyof FontSizes, value: string) => {
    onFontSizesChange?.({ ...fontSizes, [key]: value });
  };

  const handleWeightChange = (key: keyof FontWeights, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) || value === '') {
      onFontWeightsChange?.({ ...fontWeights, [key]: value === '' ? undefined : numValue });
    }
  };

  const handleFontChange = (field: string, value: string) => {
    // Simulate an input change event for the parent handler
    const syntheticEvent = {
      target: { name: field, value },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Typography</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Font Families */}
        <FontCombobox
          id="heading_font"
          label="Heading Font"
          value={formData.heading_font}
          onChange={(v) => handleFontChange('heading_font', v)}
        />
        <FontCombobox
          id="body_font"
          label="Body Font"
          value={formData.body_font}
          onChange={(v) => handleFontChange('body_font', v)}
        />
        <FontCombobox
          id="paragraph_font"
          label="Paragraph/Code Font"
          value={formData.paragraph_font}
          onChange={(v) => handleFontChange('paragraph_font', v)}
        />

        {/* Font Sizes - Collapsible */}
        <Collapsible open={sizesOpen} onOpenChange={setSizesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
              <span className="text-sm font-medium">Font Sizes</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${sizesOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <SizeCombobox id="size_h1" label="H1" value={fontSizes.h1 || ''} placeholder="48" onChange={(v) => handleSizeChange('h1', v)} />
              <SizeCombobox id="size_h2" label="H2" value={fontSizes.h2 || ''} placeholder="36" onChange={(v) => handleSizeChange('h2', v)} />
              <SizeCombobox id="size_h3" label="H3" value={fontSizes.h3 || ''} placeholder="24" onChange={(v) => handleSizeChange('h3', v)} />
              <SizeCombobox id="size_h4" label="H4" value={fontSizes.h4 || ''} placeholder="20" onChange={(v) => handleSizeChange('h4', v)} />
              <SizeCombobox id="size_body" label="Body" value={fontSizes.body || ''} placeholder="16" onChange={(v) => handleSizeChange('body', v)} />
              <SizeCombobox id="size_small" label="Small" value={fontSizes.small || ''} placeholder="14" onChange={(v) => handleSizeChange('small', v)} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Font Weights - Collapsible */}
        <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
              <span className="text-sm font-medium">Font Weights</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${weightsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {(['regular', 'medium', 'semibold', 'bold'] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`weight_${key}`} className="text-xs capitalize">{key}</Label>
                  <Select
                    value={fontWeights[key]?.toString() || ''}
                    onValueChange={(v) => handleWeightChange(key, v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={key === 'regular' ? '400' : key === 'medium' ? '500' : key === 'semibold' ? '600' : '700'} />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
