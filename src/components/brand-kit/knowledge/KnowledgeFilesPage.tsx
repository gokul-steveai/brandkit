import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BrandKit, useBrandKits } from '@/hooks/useBrandKits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { KnowledgeFileCard } from './KnowledgeFileCard';
import { SelectionSummaryCard } from './SelectionSummaryCard';
import { LibraryFilePreviewDialog } from './LibraryFilePreviewDialog';
import { UserFilePreviewDialog } from './UserFilePreviewDialog';
import { EditKnowledgeFileDialog } from './EditKnowledgeFileDialog';
import { KnowledgeFileUploadWizard } from './upload-wizard';
import { VisualIdentityCard } from './VisualIdentityCard';
import { BrandStoryDocCard } from './BrandStoryDocCard';
import { ProductCatalogCard } from './ProductCatalogCard';
import { TargetAudienceCard } from './TargetAudienceCard';
import { MessagingFrameworkCard } from './MessagingFrameworkCard';
import { AnalysisReportComparisonDialog } from './AnalysisReportComparisonDialog';
import { Upload, Info, FileText, FileJson, FileCode, Trash2, Download, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { 
  validateBrandKitData, 
  type MessagingFrameworkSpec,
  type BrandKitDataCompleteness 
} from '@/lib/messaging-frameworks';

interface LibraryKnowledgeFile {
  id: string;
  reference_name: string;
  display_name: string;
  description: string | null;
  file_type: string;
  system_instruction_hint: string | null;
  storage_path?: string | null;
}

interface BrandKitKnowledgeFile {
  id: string;
  library_file_id: string;
  is_included_in_export: boolean;
}

interface UserUploadedFile {
  id: string;
  title: string;
  description: string | null;
  file_type: 'pdf' | 'json' | 'markdown';
  storage_path: string;
  tags: string[];
  department: string | null;
  created_at: string;
  file_size_bytes: number | null;
  version: string | null;
  sensitivity: string | null;
  audience: string | null;
  source: string | null;
  attribution: string | null;
  related_projects: string[] | null;
  category?: string;
  platform_context?: string;
  extracted_data?: any;
}

export function KnowledgeFilesPage() {
  const { brandKit, refetch } = useOutletContext<{ brandKit: BrandKit; refetch: () => void }>();
  const [libraryFiles, setLibraryFiles] = useState<LibraryKnowledgeFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, BrandKitKnowledgeFile>>(new Map());
  const [userUploadedFiles, setUserUploadedFiles] = useState<UserUploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [libraryPreviewDialog, setLibraryPreviewDialog] = useState<{
    open: boolean;
    file: LibraryKnowledgeFile | null;
  }>({ open: false, file: null });
  const [userPreviewDialog, setUserPreviewDialog] = useState<{
    open: boolean;
    file: UserUploadedFile | null;
  }>({ open: false, file: null });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    file: UserUploadedFile | null;
  }>({ open: false, file: null });
  const [comparisonDialog, setComparisonDialog] = useState<{
    open: boolean;
    file: UserUploadedFile | null;
    fileContent: string;
  }>({ open: false, file: null, fileContent: '' });
  
  // Messaging Framework state
  const [messagingSpecs, setMessagingSpecs] = useState<MessagingFrameworkSpec[]>([]);
  const [dataCompleteness, setDataCompleteness] = useState<BrandKitDataCompleteness | null>(null);

  const handleVisualIdentityUpdate = useCallback(() => {
    refetch?.();
  }, [refetch]);

  const fetchUserFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch from user_knowledge_file_uploads table (uses user-knowledge-files bucket)
    const { data: uploads, error: uploadsError } = await supabase
      .from('user_knowledge_file_uploads')
      .select('*')
      .eq('brand_kit_id', brandKit.id)
      .order('created_at', { ascending: false });

    if (uploadsError) {
      console.error('Error fetching user uploads:', uploadsError);
    } else if (uploads) {
      setUserUploadedFiles(uploads as UserUploadedFile[]);
    }
  };

  const fetchMessagingSpecs = async () => {
    const { data: specs } = await supabase
      .from('messaging_framework_specs')
      .select('*')
      .eq('brand_kit_id', brandKit.id)
      .order('version', { ascending: false });

    if (specs) {
      setMessagingSpecs(specs.map(s => ({
        id: s.id,
        brandKitId: s.brand_kit_id,
        userId: s.user_id,
        version: s.version,
        title: s.title,
        selectedFrameworks: s.selected_frameworks as string[],
        selectionMethod: s.selection_method as 'manual' | 'ai_recommended',
        contentMarkdown: s.content_markdown,
        contentJson: s.content_json as Record<string, unknown> | undefined,
        generationConfig: s.generation_config as any,
        tokensUsed: s.tokens_used,
        createdAt: s.created_at
      })));
    }
  };

  const fetchDataCompleteness = async () => {
    // Fetch related data for completeness validation
    const [audienceRes, productsRes, coreRes, expressionRes, personalityRes] = await Promise.all([
      supabase.from('brand_kit_target_audience')
        .select('id, persona_name, frustrations_pain_points, goals_motivations, is_primary')
        .eq('brand_kit_id', brandKit.id),
      supabase.from('brand_kit_products')
        .select('id, name, description, usp')
        .eq('brand_kit_id', brandKit.id),
      supabase.from('brand_kit_core')
        .select('brand_story, mission, vision')
        .eq('brand_kit_id', brandKit.id)
        .maybeSingle(),
      supabase.from('brand_kit_expression')
        .select('tone_of_voice, verbal_style')
        .eq('brand_kit_id', brandKit.id)
        .maybeSingle(),
      supabase.from('brand_kit_personality')
        .select('brand_values, personality_traits')
        .eq('brand_kit_id', brandKit.id)
        .maybeSingle()
    ]);

    const brandKitWithRelations = {
      id: brandKit.id,
      name: brandKit.name,
      audience: audienceRes.data || [],
      products: productsRes.data || [],
      core: coreRes.data,
      expression: expressionRes.data,
      personality: personalityRes.data
    };

    const completeness = validateBrandKitData(brandKitWithRelations);
    setDataCompleteness(completeness);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch library/template knowledge files (developer-curated, read-only)
      const { data: library } = await supabase
        .from('library_knowledge_files')
        .select('*')
        .eq('is_library', true);

      if (library) {
        setLibraryFiles(library as LibraryKnowledgeFile[]);
      }

      // Fetch selected library files for this brand kit
      const { data: selected } = await supabase
        .from('brand_kit_knowledge_files')
        .select('*')
        .eq('brand_kit_id', brandKit.id);

      if (selected) {
        const selectedMap = new Map<string, BrandKitKnowledgeFile>();
        (selected as BrandKitKnowledgeFile[]).forEach(f => {
          selectedMap.set(f.library_file_id, f);
        });
        setSelectedFiles(selectedMap);
      }

      // Fetch messaging framework specs and data completeness
      await Promise.all([
        fetchUserFiles(),
        fetchMessagingSpecs(),
        fetchDataCompleteness()
      ]);
      
      setIsLoading(false);
    };

    fetchData();
  }, [brandKit.id]);

  const handleToggleFile = async (file: LibraryKnowledgeFile) => {
    const existing = selectedFiles.get(file.id);

    if (existing) {
      const { error } = await supabase
        .from('brand_kit_knowledge_files')
        .delete()
        .eq('id', existing.id);

      if (!error) {
        const newMap = new Map(selectedFiles);
        newMap.delete(file.id);
        setSelectedFiles(newMap);
        toast({ title: `${file.display_name} removed` });
      }
    } else {
      const { data, error } = await supabase
        .from('brand_kit_knowledge_files')
        .insert({
          brand_kit_id: brandKit.id,
          library_file_id: file.id,
          is_included_in_export: true,
        })
        .select()
        .single();

      if (!error && data) {
        const newMap = new Map(selectedFiles);
        newMap.set(file.id, data as BrandKitKnowledgeFile);
        setSelectedFiles(newMap);
        toast({ title: `${file.display_name} added` });
      }
    }
  };

  const handleDeleteUploadedFile = async (file: UserUploadedFile) => {
    try {
      // Delete from user-knowledge-files storage bucket
      const { error: storageError } = await supabase.storage
        .from('user-knowledge-files')
        .remove([file.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_knowledge_file_uploads')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      setUserUploadedFiles(prev => prev.filter(f => f.id !== file.id));
      toast({ title: 'File deleted', description: `${file.title} has been removed` });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({ title: 'Delete failed', description: 'Could not delete the file', variant: 'destructive' });
    }
  };

  const handleDownloadFile = async (file: UserUploadedFile) => {
    try {
      // Download the file from storage
      const { data, error } = await supabase.storage
        .from('user-knowledge-files')
        .download(file.storage_path);

      if (error) throw error;

      // Build metadata object
      const metadata = {
        title: file.title,
        description: file.description,
        department: file.department,
        audience: file.audience,
        version: file.version,
        sensitivity: file.sensitivity,
        source: file.source,
        attribution: file.attribution,
        tags: file.tags,
        related_projects: file.related_projects,
        created_at: file.created_at,
        exported_from: 'Brand Kit OS'
      };

      let downloadBlob: Blob;
      let fileName: string;

      if (file.file_type === 'pdf') {
        // PDFs download as-is
        downloadBlob = data;
        fileName = `${file.title}.pdf`;
      } else if (file.file_type === 'json') {
        // JSON: wrap content with metadata
        const content = await data.text();
        let parsedContent;
        try {
          parsedContent = JSON.parse(content);
        } catch {
          parsedContent = content;
        }
        const wrappedContent = {
          _metadata: metadata,
          content: parsedContent
        };
        downloadBlob = new Blob([JSON.stringify(wrappedContent, null, 2)], { type: 'application/json' });
        fileName = `${file.title}.json`;
      } else {
        // Markdown: add YAML front-matter
        const content = await data.text();
        const yamlFrontMatter = `---
title: "${file.title}"
description: "${file.description || ''}"
department: "${file.department || ''}"
audience: "${file.audience || ''}"
version: "${file.version || ''}"
sensitivity: "${file.sensitivity || ''}"
source: "${file.source || ''}"
attribution: "${file.attribution || ''}"
tags: ${JSON.stringify(file.tags || [])}
related_projects: ${JSON.stringify(file.related_projects || [])}
created_at: "${file.created_at}"
exported_from: "Brand Kit OS"
---

`;
        downloadBlob = new Blob([yamlFrontMatter + content], { type: 'text/markdown' });
        fileName = `${file.title}.md`;
      }

      // Trigger download
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Download started', description: fileName });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({ title: 'Download failed', description: 'Could not download the file', variant: 'destructive' });
    }
  };

  const handleAnalyzeReport = async (file: UserUploadedFile) => {
    try {
      // Download file content for analysis
      const { data, error } = await supabase.storage
        .from('user-knowledge-files')
        .download(file.storage_path);

      if (error) throw error;

      const content = await data.text();
      setComparisonDialog({
        open: true,
        file,
        fileContent: content,
      });
    } catch (error) {
      console.error('Error loading file for analysis:', error);
      toast({ 
        title: 'Could not load file', 
        description: 'Unable to read file content for analysis',
        variant: 'destructive' 
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-5 w-5 text-destructive" />;
      case 'json': return <FileJson className="h-5 w-5 text-primary" />;
      case 'markdown': return <FileCode className="h-5 w-5 text-muted-foreground" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Filter out auto-generated files that have dedicated cards (Visual Identity, Brand Story, Style Guide, Product Catalog, Target Audience)
  const DEDICATED_CARD_IDS = [
    'f31c706f-77ed-4a84-8036-18d5ee11eb8c', // Brand Style Guide (merged into Visual Identity)
    'f7184cea-1146-46b0-9ce8-be859a3e73a3', // Brand Story Document (dedicated card)
    '5f7283ed-bf01-4bf8-aa50-de49ccb2113c', // Product Catalog (dedicated card)
    '552284cc-1589-4aeb-af02-57e0369506a7', // Target Audience Profiles (dedicated card)
  ];
  const autoGeneratedFiles = libraryFiles.filter(f => f.file_type === 'auto_generated' && !DEDICATED_CARD_IDS.includes(f.id));
  const curatedTemplates = libraryFiles.filter(f => f.file_type === 'curated_template');
  const totalFiles = selectedFiles.size + userUploadedFiles.length;

  return (
    <FeatureGate feature="knowledgeFiles" brandKitId={brandKit.id}>
      <div className="space-y-6">
        {/* Uploaded Documents Section - User Knowledge Files */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Uploaded Documents</h2>
              <Badge variant="secondary">{userUploadedFiles.length} files</Badge>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload PDF, JSON, or Markdown documents to be included in your knowledge base.
          </p>

          {userUploadedFiles.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">No documents uploaded yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                Upload your first document
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {userUploadedFiles.map((file) => {
                const isAnalysisReport = file.category && file.category !== 'general';
                const categoryLabels: Record<string, string> = {
                  writing_style_report: 'Writing Style',
                  audience_report: 'Audience',
                  performance_report: 'Performance',
                  comment_analysis_report: 'Comments',
                };
                
                return (
                  <Card
                    key={file.id}
                    className="p-4 cursor-pointer transition-colors hover:border-primary"
                    onClick={() => setUserPreviewDialog({ open: true, file })}
                  >
                    <div className="flex items-start gap-3">
                      {getFileIcon(file.file_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{file.title}</h3>
                          {isAnalysisReport && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {categoryLabels[file.category!] || 'Report'}
                            </Badge>
                          )}
                        </div>
                        {file.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {file.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {file.platform_context && file.platform_context !== 'universal' && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {file.platform_context}
                            </Badge>
                          )}
                          {file.tags?.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {file.tags && file.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{file.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {file.department && <span>{file.department}</span>}
                          {file.department && <span>•</span>}
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                          {file.file_size_bytes && (
                            <>
                              <span>•</span>
                              <span>{(file.file_size_bytes / 1024).toFixed(1)} KB</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isAnalysisReport && file.file_type !== 'pdf' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnalyzeReport(file);
                                  }}
                                >
                                  <Sparkles className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Analyze & import insights</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUploadedFile(file);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Auto-Generated Files Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Auto-Generated Documents</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>These documents are automatically generated from your brand kit data and stay in sync with your settings.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            Documents automatically created from your brand kit data.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Visual Identity Card - always shown */}
            <VisualIdentityCard 
              brandKit={brandKit} 
              onUpdate={handleVisualIdentityUpdate} 
            />

            {/* Brand Story Document Card */}
            <BrandStoryDocCard brandKit={brandKit} />

            {/* Product Catalog Card - conditional */}
            <ProductCatalogCard
              brandKitId={brandKit.id}
              brandKitName={brandKit.name}
            />

            {/* Target Audience Profiles Card - conditional */}
            <TargetAudienceCard
              brandKitId={brandKit.id}
              brandKitName={brandKit.name}
            />

            {/* Messaging Framework Card - AI-generated */}
            {dataCompleteness && (
              <MessagingFrameworkCard
                brandKitId={brandKit.id}
                brandKitName={brandKit.name}
                dataCompleteness={dataCompleteness}
                latestSpec={messagingSpecs[0] || null}
                specCount={messagingSpecs.length}
                onUpdate={() => {
                  fetchMessagingSpecs();
                  fetchDataCompleteness();
                }}
              />
            )}

            {/* Other auto-generated files from library (if any remain) */}
            {autoGeneratedFiles.map((file) => (
              <KnowledgeFileCard
                key={file.id}
                file={file}
                isSelected={false}
                onToggle={() => {}}
                disabled
              />
            ))}
          </div>
        </div>

        {/* Curated Templates - Default Knowledge (Read-only) */}
        {curatedTemplates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Curated Templates</h2>
              <Badge variant="secondary">{curatedTemplates.length} available</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Pre-made templates designed to work well with AI assistants.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {curatedTemplates.map((file) => (
                <KnowledgeFileCard
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onToggle={() => handleToggleFile(file)}
                  onPreview={(f) => setLibraryPreviewDialog({ open: true, file: f })}
                />
              ))}
            </div>
          </div>
        )}

        <SelectionSummaryCard selectedCount={totalFiles} />

        <KnowledgeFileUploadWizard
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          brandKitId={brandKit.id}
          onUploadComplete={fetchUserFiles}
        />

        <LibraryFilePreviewDialog
          open={libraryPreviewDialog.open}
          onOpenChange={(open) => setLibraryPreviewDialog(prev => ({ ...prev, open }))}
          file={libraryPreviewDialog.file}
        />

        <UserFilePreviewDialog
          open={userPreviewDialog.open}
          onOpenChange={(open) => setUserPreviewDialog(prev => ({ ...prev, open }))}
          file={userPreviewDialog.file}
          onEdit={(file) => setEditDialog({ open: true, file })}
        />

        <EditKnowledgeFileDialog
          open={editDialog.open}
          onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}
          file={editDialog.file}
          onSave={fetchUserFiles}
        />

        {comparisonDialog.file && (
          <AnalysisReportComparisonDialog
            open={comparisonDialog.open}
            onOpenChange={(open) => setComparisonDialog(prev => ({ ...prev, open }))}
            fileId={comparisonDialog.file.id}
            fileContent={comparisonDialog.fileContent}
            category={comparisonDialog.file.category || 'general'}
            platformContext={comparisonDialog.file.platform_context || 'universal'}
            brandKitId={brandKit.id}
            onImportComplete={() => {
              fetchUserFiles();
              refetch?.();
            }}
          />
        )}
      </div>
    </FeatureGate>
  );
}
