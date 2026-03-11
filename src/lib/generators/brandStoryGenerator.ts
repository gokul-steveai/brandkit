interface BrandStoryData {
  name: string;
  tagline?: string | null;
  description?: string | null;
}

interface CoreData {
  mission?: string | null;
  vision?: string | null;
  brand_story?: string | null;
  brand_promises?: Array<{ title?: string; description?: string }> | null;
}

export function generateBrandStoryMarkdown(brand: BrandStoryData, core: CoreData | null): string {
  const lines: string[] = [];

  lines.push(`# Brand Story: ${brand.name}`);
  lines.push('');
  lines.push(`> Auto-generated brand story document for **${brand.name}**`);
  lines.push('');

  if (brand.tagline) {
    lines.push(`**Tagline:** ${brand.tagline}`);
    lines.push('');
  }

  if (brand.description) {
    lines.push('## About');
    lines.push('');
    lines.push(brand.description);
    lines.push('');
  }

  if (core?.mission) {
    lines.push('## Our Mission');
    lines.push('');
    lines.push(core.mission);
    lines.push('');
  }

  if (core?.vision) {
    lines.push('## Our Vision');
    lines.push('');
    lines.push(core.vision);
    lines.push('');
  }

  if (core?.brand_story) {
    lines.push('## Our Story');
    lines.push('');
    lines.push(core.brand_story);
    lines.push('');
  }

  if (core?.brand_promises && Array.isArray(core.brand_promises) && core.brand_promises.length > 0) {
    lines.push('## Brand Promises');
    lines.push('');
    for (const p of core.brand_promises) {
      const title = p.title || (typeof p === 'string' ? p : '');
      const desc = p.description || '';
      lines.push(`- **${title}**${desc ? `: ${desc}` : ''}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Last updated: ${new Date().toLocaleDateString()}*`);

  return lines.join('\n');
}

export function hasBrandStoryData(core: CoreData | null): boolean {
  if (!core) return false;
  return !!(core.brand_story || core.mission || core.vision);
}
