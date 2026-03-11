export type FileType = 'pdf' | 'json' | 'markdown';

export type ReportCategory = 
  | 'general' 
  | 'writing_style_report' 
  | 'audience_report' 
  | 'performance_report' 
  | 'comment_analysis_report';

export type PlatformContext = 
  | 'universal' 
  | 'instagram' 
  | 'linkedin' 
  | 'twitter' 
  | 'facebook' 
  | 'youtube' 
  | 'tiktok';

export interface FileMetadata {
  title: string;
  description: string | null;
  tags: string[];
  department: string | null;
  version: string;
  source: string | null;
  sensitivity: 'Internal' | 'Public' | 'Confidential';
  attribution: string | null;
  audience: string | null;
  related_projects: string[];
  category: ReportCategory;
  platform_context: PlatformContext;
}

export interface UploadedFile {
  file: File | null;
  url: string | null;
  content: string | null;
  fileType: FileType;
  originalFileName: string;
}

export interface WizardState {
  step: 'select' | 'preview' | 'metadata';
  uploadedFile: UploadedFile | null;
  metadata: FileMetadata;
  isAiGenerated: boolean;
}

export const defaultMetadata: FileMetadata = {
  title: '',
  description: null,
  tags: [],
  department: null,
  version: '1.0',
  source: null,
  sensitivity: 'Internal',
  attribution: null,
  audience: null,
  related_projects: [],
  category: 'general',
  platform_context: 'universal',
};

export const getFileTypeFromMime = (mimeType: string): FileType | null => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/json') return 'json';
  if (mimeType === 'text/markdown' || mimeType === 'text/plain') return 'markdown';
  return null;
};

export const getFileTypeFromExtension = (fileName: string): FileType | null => {
  const lowerName = fileName.toLowerCase();
  
  // Handle double extensions like .md.pdf - treat as PDF since it's a PDF binary
  if (lowerName.endsWith('.md.pdf')) return 'pdf';
  
  const ext = lowerName.split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'json') return 'json';
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') return 'markdown';
  return null;
};

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/json': ['.json'],
  'text/markdown': ['.md', '.markdown'],
  'text/plain': ['.txt', '.md'],
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const REPORT_CATEGORY_OPTIONS: { value: ReportCategory; label: string; description: string }[] = [
  { value: 'general', label: 'General Document', description: 'Standard knowledge file or reference document' },
  { value: 'writing_style_report', label: 'Writing Style Report', description: 'Analysis of tone, voice, and writing patterns' },
  { value: 'audience_report', label: 'Audience Report', description: 'Target audience analysis and personas' },
  { value: 'performance_report', label: 'Performance Report', description: 'Content performance and engagement metrics' },
  { value: 'comment_analysis_report', label: 'Comment Analysis Report', description: 'Community feedback and sentiment analysis' },
];

export const PLATFORM_CONTEXT_OPTIONS: { value: PlatformContext; label: string }[] = [
  { value: 'universal', label: 'Universal (All Platforms)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
];
