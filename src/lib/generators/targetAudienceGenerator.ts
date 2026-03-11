interface AudiencePersona {
  persona_name?: string | null;
  persona_title?: string | null;
  persona_type?: string | null;
  is_primary?: boolean | null;
  demographics?: Record<string, unknown> | null;
  professional_context?: Record<string, unknown> | null;
  personal_background?: Record<string, unknown> | null;
  goals_motivations?: string[] | null;
  frustrations_pain_points?: string[] | null;
  values_beliefs?: string[] | null;
  fears?: string[] | null;
  preferred_channels?: string[] | null;
  expertise_level?: string | null;
  core_motivation?: string | null;
  buying_behavior?: string | null;
  content_that_resonates?: string | null;
  representative_quote?: string | null;
}

export function generateTargetAudienceMarkdown(brandName: string, audience: AudiencePersona[]): string {
  const lines: string[] = [];

  lines.push(`# Target Audience Profiles: ${brandName}`);
  lines.push('');
  lines.push(`> Auto-generated audience profiles for **${brandName}** (${audience.length} persona${audience.length !== 1 ? 's' : ''})`);
  lines.push('');

  for (const persona of audience) {
    const name = persona.persona_name || 'Unnamed Persona';
    const primary = persona.is_primary ? ' ⭐ Primary' : '';
    lines.push(`## ${name}${primary}`);
    lines.push('');

    if (persona.persona_title) lines.push(`**Title:** ${persona.persona_title}`);
    if (persona.persona_type) lines.push(`**Type:** ${persona.persona_type.toUpperCase()}`);
    if (persona.expertise_level) lines.push(`**Expertise Level:** ${persona.expertise_level}`);
    lines.push('');

    if (persona.representative_quote) {
      lines.push(`> "${persona.representative_quote}"`);
      lines.push('');
    }

    if (persona.core_motivation) {
      lines.push(`**Core Motivation:** ${persona.core_motivation}`);
      lines.push('');
    }

    const demographics = persona.demographics;
    if (demographics && Object.keys(demographics).length > 0) {
      lines.push('### Demographics');
      for (const [key, val] of Object.entries(demographics)) {
        if (val) lines.push(`- **${key.replace(/_/g, ' ')}:** ${val}`);
      }
      lines.push('');
    }

    if (persona.goals_motivations?.length) {
      lines.push('### Goals & Motivations');
      for (const g of persona.goals_motivations) lines.push(`- ${g}`);
      lines.push('');
    }

    if (persona.frustrations_pain_points?.length) {
      lines.push('### Pain Points');
      for (const p of persona.frustrations_pain_points) lines.push(`- ${p}`);
      lines.push('');
    }

    if (persona.values_beliefs?.length) {
      lines.push('### Values & Beliefs');
      for (const v of persona.values_beliefs) lines.push(`- ${v}`);
      lines.push('');
    }

    if (persona.preferred_channels?.length) {
      lines.push(`**Preferred Channels:** ${persona.preferred_channels.join(', ')}`);
      lines.push('');
    }

    if (persona.buying_behavior) {
      lines.push(`**Buying Behavior:** ${persona.buying_behavior}`);
      lines.push('');
    }

    if (persona.content_that_resonates) {
      lines.push(`**Content That Resonates:** ${persona.content_that_resonates}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  lines.push(`*Last updated: ${new Date().toLocaleDateString()}*`);

  return lines.join('\n');
}
