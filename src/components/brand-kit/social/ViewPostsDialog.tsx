import { useState, useEffect } from 'react';
import { Play, Image as ImageIcon, Video, MessageCircle, Heart, Eye, Clock, RefreshCw, Download, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

export interface InstagramPost {
  id: string;
  type: 'Image' | 'Video' | 'Sidecar';
  shortCode?: string;
  caption?: string;
  alt?: string;
  displayUrl?: string;
  localDisplayUrl?: string; // Local signed URL after download
  commentsCount?: number;
  likesCount?: number;
  timestamp?: string;
  // Video-specific fields
  videoDuration?: number;
  videoPlayCount?: number;
  videoViewCount?: number;
  videoUrl?: string;
  localVideoPreviewUrl?: string; // Local signed URL for video preview
}

interface ViewPostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storagePath: string | null;
  signedUrlExpiryMonths?: number;
  onRetryExtraction?: () => void;
  isExtracting?: boolean;
}

export function ViewPostsDialog({
  open,
  onOpenChange,
  storagePath,
  signedUrlExpiryMonths = 12,
  onRetryExtraction,
  isExtracting = false,
}: ViewPostsDialogProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate expiration in seconds (months * 30 days * 24 hours * 60 min * 60 sec)
  const expirationSeconds = signedUrlExpiryMonths * 30 * 24 * 60 * 60;

  useEffect(() => {
    if (open && storagePath) {
      loadPosts();
    }
  }, [open, storagePath]);

  const loadPosts = async () => {
    if (!storagePath) return;

    setIsLoading(true);
    setError(null);

    try {
      // Download posts JSON from storage
      const { data, error: downloadError } = await supabase.storage
        .from('apify-scrapes')
        .download(storagePath);

      if (downloadError) {
        throw downloadError;
      }

      const text = await data.text();
      const rawPosts = JSON.parse(text);

      // Map Apify posts to our format
      const mappedPosts: InstagramPost[] = (Array.isArray(rawPosts) ? rawPosts : [rawPosts]).map((post: any) => ({
        id: post.id || post.shortCode || crypto.randomUUID(),
        type: post.type === 'Video' ? 'Video' : post.type === 'Sidecar' ? 'Sidecar' : 'Image',
        shortCode: post.shortCode,
        caption: post.caption,
        alt: post.alt || post.accessibilityCaption,
        displayUrl: post.displayUrl,
        localDisplayUrl: post.localDisplayUrl,
        commentsCount: post.commentsCount,
        likesCount: post.likesCount,
        timestamp: post.timestamp,
        videoDuration: post.videoDuration,
        videoPlayCount: post.videoPlayCount,
        videoViewCount: post.videoViewCount,
        videoUrl: post.videoUrl,
        localVideoPreviewUrl: post.localVideoPreviewUrl,
      }));

      setPosts(mappedPosts);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Failed to load posts data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const truncateCaption = (caption?: string, maxLength = 50) => {
    if (!caption) return '-';
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength) + '...';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video':
        return <Video className="h-4 w-4" />;
      case 'Sidecar':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Badge variant="secondary" className="bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white">
                  Instagram
                </Badge>
                Posts ({posts.length})
              </DialogTitle>
            </DialogHeader>

            <div className="mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading posts...
                </div>
              ) : error ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-destructive flex items-center justify-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={loadPosts}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Loading
                    </Button>
                    {onRetryExtraction && (
                      <Button 
                        onClick={() => { 
                          onRetryExtraction(); 
                          onOpenChange(false); 
                        }} 
                        disabled={isExtracting}
                      >
                        {isExtracting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Re-extract Posts
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If the problem persists, try re-extracting posts from Instagram.
                  </p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No posts found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Type</TableHead>
                      <TableHead className="w-20">Preview</TableHead>
                      <TableHead className="w-32">Alt Text</TableHead>
                      <TableHead>Caption</TableHead>
                      <TableHead className="w-24 text-right">
                        <MessageCircle className="h-4 w-4 inline mr-1" />
                        Comments
                      </TableHead>
                      <TableHead className="w-24 text-right">
                        <Heart className="h-4 w-4 inline mr-1" />
                        Likes
                      </TableHead>
                      {/* Video-specific columns */}
                      <TableHead className="w-20 text-right">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Duration
                      </TableHead>
                      <TableHead className="w-24 text-right">
                        <Play className="h-4 w-4 inline mr-1" />
                        Plays
                      </TableHead>
                      <TableHead className="w-24 text-right">
                        <Eye className="h-4 w-4 inline mr-1" />
                        Views
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {getTypeIcon(post.type)}
                            {post.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(post.localDisplayUrl || post.displayUrl) ? (
                            <img
                              src={post.localDisplayUrl || post.displayUrl}
                              alt={post.alt || 'Post thumbnail'}
                              className="w-16 h-16 object-cover rounded"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                              {getTypeIcon(post.type)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                          {post.alt || '-'}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          {truncateCaption(post.caption, 80)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(post.commentsCount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(post.likesCount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {post.type === 'Video' ? formatDuration(post.videoDuration) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {post.type === 'Video' ? formatNumber(post.videoPlayCount) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {post.type === 'Video' ? formatNumber(post.videoViewCount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
