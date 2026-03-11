import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, MessageSquare, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AddExpressionExampleDialog } from './AddExpressionExampleDialog';
import {
  EXPRESSION_PLATFORMS,
  PLATFORM_INFO,
  CONTEXT_TYPE_LABELS,
  type ExpressionExample,
  type ExpressionPlatform,
  type ExpressionExampleFormData,
  type ContextType,
} from './types';

interface ExpressionExamplesCardProps {
  brandKitId: string;
}

export function ExpressionExamplesCard({ brandKitId }: ExpressionExamplesCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<ExpressionExample | null>(null);
  const [platformFilter, setPlatformFilter] = useState<ExpressionPlatform | 'all'>('all');

  // Fetch examples
  const { data: examples, isLoading } = useQuery({
    queryKey: ['expression-examples', brandKitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expression_examples')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExpressionExample[];
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (formData: ExpressionExampleFormData) => {
      const insertData = {
        brand_kit_id: brandKitId,
        user_id: user?.id as string,
        platform: formData.platform,
        source: 'manual' as const,
        context_type: formData.context_type,
        original_content: formData.original_content || null,
        user_response: formData.user_response,
        platform_metadata: formData.platform_metadata as unknown as Record<string, never>,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('expression_examples').insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expression-examples', brandKitId] });
      toast({ title: 'Example added', description: 'Your expression example has been saved.' });
    },
    onError: (error) => {
      console.error('Failed to add example:', error);
      toast({ title: 'Error', description: 'Failed to add example. Please try again.', variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ExpressionExampleFormData }) => {
      const updateData = {
        platform: formData.platform,
        context_type: formData.context_type,
        original_content: formData.original_content || null,
        user_response: formData.user_response,
        platform_metadata: formData.platform_metadata as unknown as Record<string, never>,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('expression_examples')
        .update(updateData as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expression-examples', brandKitId] });
      toast({ title: 'Example updated', description: 'Your expression example has been updated.' });
      setEditingExample(null);
    },
    onError: (error) => {
      console.error('Failed to update example:', error);
      toast({ title: 'Error', description: 'Failed to update example. Please try again.', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expression_examples').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expression-examples', brandKitId] });
      toast({ title: 'Example deleted', description: 'The expression example has been removed.' });
    },
    onError: (error) => {
      console.error('Failed to delete example:', error);
      toast({ title: 'Error', description: 'Failed to delete example. Please try again.', variant: 'destructive' });
    },
  });

  const handleAdd = async (formData: ExpressionExampleFormData) => {
    await addMutation.mutateAsync(formData);
  };

  const handleUpdate = async (formData: ExpressionExampleFormData) => {
    if (!editingExample) return;
    await updateMutation.mutateAsync({ id: editingExample.id, formData });
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Are you sure you want to delete this example?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (example: ExpressionExample) => {
    setEditingExample(example);
  };

  const filteredExamples = examples?.filter(
    (example) => platformFilter === 'all' || example.platform === platformFilter
  );

  const getMetadataPreview = (example: ExpressionExample): string | null => {
    const meta = example.platform_metadata as Record<string, unknown>;
    if (!meta || Object.keys(meta).length === 0) return null;

    switch (example.platform) {
      case 'reddit':
        return meta.subreddit ? `${meta.subreddit}` : null;
      case 'linkedin':
        return meta.company ? `${meta.company}` : meta.post_author ? `${meta.post_author}` : null;
      case 'instagram':
        return meta.post_author ? `${meta.post_author}` : null;
      case 'youtube':
        return meta.channel_name ? `${meta.channel_name}` : null;
      case 'twitter':
        return meta.tweet_author ? `${meta.tweet_author}` : null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-border">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Expression Examples
              </CardTitle>
              <CardDescription>
                Real examples of how you communicate on various platforms
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Example
            </Button>
          </div>

          {/* Filter */}
          {examples && examples.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={platformFilter}
                onValueChange={(value) => setPlatformFilter(value as ExpressionPlatform | 'all')}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {EXPRESSION_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {PLATFORM_INFO[platform].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {filteredExamples?.length || 0} example{filteredExamples?.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {!examples || examples.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No expression examples yet</p>
              <p className="text-sm mb-4">
                Add examples of your real communications to help AI understand your brand voice.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Example
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExamples?.map((example) => (
                <Card
                  key={example.id}
                  className="group relative border-2 border-border cursor-pointer hover:border-primary/50 transition-colors h-full"
                  onClick={() => handleEdit(example)}
                >
                  {/* Delete button - appears on hover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => handleDelete(example.id, e)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>

                  <CardContent className="p-4 pr-10 h-full flex flex-col">
                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`${PLATFORM_INFO[example.platform].color} text-white text-xs`}
                      >
                        {PLATFORM_INFO[example.platform].label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {CONTEXT_TYPE_LABELS[example.context_type as ContextType] || example.context_type}
                      </Badge>
                    </div>

                    {/* Response preview (truncated) */}
                    <p className="text-sm line-clamp-3 flex-1">{example.user_response}</p>

                    {/* Metadata preview */}
                    {getMetadataPreview(example) && (
                      <span className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                        {getMetadataPreview(example)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <AddExpressionExampleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAdd}
      />

      {/* Edit Dialog */}
      {editingExample && (
        <AddExpressionExampleDialog
          open={true}
          onOpenChange={(open) => !open && setEditingExample(null)}
          onSubmit={handleUpdate}
          initialData={{
            platform: editingExample.platform,
            context_type: editingExample.context_type as ContextType,
            original_content: editingExample.original_content || '',
            user_response: editingExample.user_response,
            platform_metadata: editingExample.platform_metadata,
          }}
          isEditing
        />
      )}
    </>
  );
}
