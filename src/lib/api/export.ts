import { supabase } from '@/integrations/supabase/client';
import type { GPTExportConfig, GPTExportResult, GapQuestion, ClaudeSkillExportConfig, ClaudeSkillExportResult, MarkdownExportConfig, MarkdownExportResult } from '@/components/brand-kit/export/types';

export const exportApi = {
  // Generate GPT export
  async generateGPTExport(brandKitId: string, config: GPTExportConfig): Promise<GPTExportResult> {
    const { data, error } = await supabase.functions.invoke('export-gpt', {
      body: { brandKitId, config }
    });
    if (error) throw error;
    return data;
  },

  // Generate Claude Skill export
  async generateClaudeSkill(brandKitId: string, config: ClaudeSkillExportConfig): Promise<ClaudeSkillExportResult> {
    const { data, error } = await supabase.functions.invoke('export-claude-skill', {
      body: { brandKitId, config }
    });
    if (error) throw error;
    return data;
  },

  // Generate Markdown export
  async generateMarkdownExport(brandKitId: string, config: MarkdownExportConfig): Promise<MarkdownExportResult> {
    const { data, error } = await supabase.functions.invoke('export-markdown', {
      body: { brandKitId, config }
    });
    if (error) throw error;
    return data;
  },

  // AI auto-fill gaps
  async fillGapsWithAI(brandKitId: string, sectionsToFill: string[]): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.functions.invoke('fill-brand-gaps', {
      body: { brandKitId, sectionsToFill }
    });
    if (error) throw error;
    return data;
  },

  // Generate questions for guided Q&A
  async generateGapQuestions(brandKitId: string, missingFields: string[]): Promise<GapQuestion[]> {
    const { data, error } = await supabase.functions.invoke('generate-gap-questions', {
      body: { brandKitId, missingFields }
    });
    if (error) throw error;
    return data.questions;
  },
};

// Copy to clipboard helper
export async function copyToClipboard(content: string): Promise<void> {
  return navigator.clipboard.writeText(content);
}

// Download as markdown
export function downloadAsMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download as JSON
export function downloadAsJson(content: object, filename: string): void {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
