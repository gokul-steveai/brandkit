import { BrandKit } from '@/hooks/useBrandKits';

interface ColorDefinition {
  role: string;
  hex: string;
  name: string;
  description?: string;
  useWhen?: string;
}

interface FontDefinition {
  role: string;
  family: string;
  sizes?: Record<string, string>;
  weights?: Record<string, string | number>;
}

interface VisualIdentityData {
  coreColors: ColorDefinition[];
  extendedColors: Array<{ hex: string; name: string }>;
  typography: FontDefinition[];
}

export function extractVisualIdentityData(brandKit: BrandKit): VisualIdentityData {
  const coreColors: ColorDefinition[] = [];
  const extendedColors: Array<{ hex: string; name: string }> = [];

  // Core colors
  if (brandKit.primary_color) {
    coreColors.push({
      role: 'Primary',
      hex: brandKit.primary_color,
      name: 'Primary',
      description: 'Main brand color used for primary actions and key elements',
      useWhen: 'CTAs, buttons, links, important highlights',
    });
  }

  if (brandKit.secondary_color) {
    coreColors.push({
      role: 'Secondary',
      hex: brandKit.secondary_color,
      name: 'Secondary',
      description: 'Supporting color that complements the primary',
      useWhen: 'Secondary buttons, backgrounds, supporting elements',
    });
  }

  if (brandKit.accent_color) {
    coreColors.push({
      role: 'Accent',
      hex: brandKit.accent_color,
      name: 'Accent',
      description: 'Eye-catching color for emphasis',
      useWhen: 'Notifications, badges, special highlights',
    });
  }

  if (brandKit.background_color) {
    coreColors.push({
      role: 'Background',
      hex: brandKit.background_color,
      name: 'Background',
      description: 'Base background color',
      useWhen: 'Page backgrounds, card backgrounds',
    });
  }

  // Custom colors
  const customSlots = [
    { color: brandKit.custom_1_color, name: brandKit.custom_1_name },
    { color: brandKit.custom_2_color, name: brandKit.custom_2_name },
    { color: brandKit.custom_3_color, name: brandKit.custom_3_name },
    { color: brandKit.custom_4_color, name: brandKit.custom_4_name },
  ];

  customSlots.forEach((slot, i) => {
    if (slot.color) {
      coreColors.push({
        role: `Custom ${i + 1}`,
        hex: slot.color,
        name: slot.name || `Custom ${i + 1}`,
      });
    }
  });

  // Extended colors from additional_colors
  if (brandKit.additional_colors && Array.isArray(brandKit.additional_colors)) {
    (brandKit.additional_colors as Array<{ hex: string; name: string }>).forEach(c => {
      extendedColors.push({ hex: c.hex, name: c.name });
    });
  }

  // Typography
  const typography: FontDefinition[] = [];
  const fontSizes = (brandKit.font_sizes || {}) as Record<string, string>;
  const fontWeights = (brandKit.font_weights || {}) as Record<string, string | number>;

  if (brandKit.heading_font) {
    typography.push({
      role: 'Heading',
      family: brandKit.heading_font,
      sizes: {
        h1: fontSizes.h1 || '48px',
        h2: fontSizes.h2 || '36px',
        h3: fontSizes.h3 || '24px',
        h4: fontSizes.h4 || '20px',
      },
      weights: {
        bold: fontWeights.bold || 700,
        medium: fontWeights.medium || 500,
      },
    });
  }

  if (brandKit.body_font) {
    typography.push({
      role: 'Body',
      family: brandKit.body_font,
      sizes: {
        body: fontSizes.body || '16px',
        small: fontSizes.small || '14px',
      },
      weights: {
        regular: fontWeights.regular || 400,
        medium: fontWeights.medium || 500,
      },
    });
  }

  if (brandKit.paragraph_font && brandKit.paragraph_font !== brandKit.body_font) {
    typography.push({
      role: 'Paragraph',
      family: brandKit.paragraph_font,
    });
  }

  return { coreColors, extendedColors, typography };
}

export function generateVisualIdentityMarkdown(brandKit: BrandKit): string {
  const data = extractVisualIdentityData(brandKit);
  const lines: string[] = [];

  lines.push('# Visual Identity Guide');
  lines.push('');
  lines.push(`> Auto-generated visual identity document for **${brandKit.name}**`);
  lines.push('');

  // Core Color Palette
  lines.push('## Core Color Palette');
  lines.push('');
  
  if (data.coreColors.length > 0) {
    lines.push('| Color | Hex | Role | Description | Use When |');
    lines.push('|-------|-----|------|-------------|----------|');
    
    data.coreColors.forEach(color => {
      const swatch = `🎨 ${color.name}`;
      lines.push(`| ${swatch} | \`${color.hex}\` | ${color.role} | ${color.description || '-'} | ${color.useWhen || '-'} |`);
    });
  } else {
    lines.push('*No core colors defined yet.*');
  }
  lines.push('');

  // Extended Color Palette
  lines.push('## Extended Color Palette');
  lines.push('');
  
  if (data.extendedColors.length > 0) {
    lines.push('| Color | Hex |');
    lines.push('|-------|-----|');
    
    data.extendedColors.forEach(color => {
      lines.push(`| ${color.name} | \`${color.hex}\` |`);
    });
  } else {
    lines.push('*No extended colors defined.*');
  }
  lines.push('');

  // Typography
  lines.push('## Typography');
  lines.push('');

  if (data.typography.length > 0) {
    data.typography.forEach(font => {
      lines.push(`### ${font.role} Font: ${font.family}`);
      lines.push('');

      if (font.sizes && Object.keys(font.sizes).length > 0) {
        lines.push('**Sizes:**');
        lines.push('| Element | Size |');
        lines.push('|---------|------|');
        Object.entries(font.sizes).forEach(([element, size]) => {
          lines.push(`| ${element.toUpperCase()} | ${size} |`);
        });
        lines.push('');
      }

      if (font.weights && Object.keys(font.weights).length > 0) {
        lines.push('**Weights:**');
        lines.push('| Weight | Value |');
        lines.push('|--------|-------|');
        Object.entries(font.weights).forEach(([weight, value]) => {
          lines.push(`| ${weight.charAt(0).toUpperCase() + weight.slice(1)} | ${value} |`);
        });
        lines.push('');
      }
    });
  } else {
    lines.push('*No typography defined yet.*');
  }
  lines.push('');

  // Brand Style Guide (merged)
  lines.push('## Brand Style Guide');
  lines.push('');

  if (brandKit.logo_url) {
    lines.push('### Logo Usage');
    lines.push('- Always use approved logo files in the correct format');
    lines.push('- Maintain clear space around the logo equal to the height of the logo mark');
    lines.push('- Never stretch, distort, or recolor the logo');
    lines.push(`- Primary logo: ${brandKit.logo_url}`);
    if (brandKit.logo_dark_url) {
      lines.push(`- Dark mode logo: ${brandKit.logo_dark_url}`);
    }
    lines.push('');
  }

  lines.push('### Color Usage');
  lines.push('- Use **Primary** color for main call-to-action buttons and key interactive elements');
  lines.push('- Use **Secondary** color for supporting elements and less prominent actions');
  lines.push('- Use **Accent** color sparingly for emphasis and attention-grabbing elements');
  lines.push('- Maintain sufficient contrast ratios for accessibility (WCAG 2.1 AA minimum)');
  lines.push('');
  lines.push('### Typography Usage');
  lines.push('- Use heading fonts for titles, headers, and display text');
  lines.push('- Use body fonts for paragraphs, descriptions, and general content');
  lines.push('- Maintain consistent sizing hierarchy across all materials');
  lines.push('');

  // Spacing guidelines if available
  const spacing = brandKit.spacing as Record<string, unknown> | null;
  if (spacing && Object.keys(spacing).length > 0) {
    lines.push('### Spacing & Layout');
    for (const [key, val] of Object.entries(spacing)) {
      if (val) lines.push(`- **${key}:** ${val}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Last updated: ${new Date().toLocaleDateString()}*`);

  return lines.join('\n');
}

export function generateCoreColorsMarkdown(brandKit: BrandKit): string {
  const data = extractVisualIdentityData(brandKit);
  const lines: string[] = [];

  lines.push('# Core Color Palette');
  lines.push('');
  lines.push(`> Core brand colors for **${brandKit.name}**`);
  lines.push('');
  
  if (data.coreColors.length > 0) {
    lines.push('| Color | Hex | Role | Description | Use When |');
    lines.push('|-------|-----|------|-------------|----------|');
    
    data.coreColors.forEach(color => {
      const swatch = `🎨 ${color.name}`;
      lines.push(`| ${swatch} | \`${color.hex}\` | ${color.role} | ${color.description || '-'} | ${color.useWhen || '-'} |`);
    });
  } else {
    lines.push('*No core colors defined yet.*');
  }
  lines.push('');

  // Brief usage guidelines
  lines.push('## Quick Usage Guide');
  lines.push('');
  lines.push('- **Primary**: Main CTAs, buttons, key highlights');
  lines.push('- **Secondary**: Supporting elements, secondary actions');
  lines.push('- **Accent**: Notifications, badges, emphasis');
  lines.push('- **Background**: Page and card backgrounds');
  lines.push('');

  lines.push('---');
  lines.push(`*Last updated: ${new Date().toLocaleDateString()}*`);

  return lines.join('\n');
}

export function hasVisualIdentityData(brandKit: BrandKit): boolean {
  const data = extractVisualIdentityData(brandKit);
  return data.coreColors.length > 0 || data.extendedColors.length > 0 || data.typography.length > 0;
}
