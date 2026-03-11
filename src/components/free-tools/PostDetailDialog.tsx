import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  MessageCircle, 
  ExternalLink,
  Calendar,
  Image,
  Film,
  Grid3X3
} from "lucide-react";
import { format } from "date-fns";

interface LatestPost {
  id?: string;
  type?: string;
  shortCode?: string;
  caption?: string;
  url?: string;
  commentsCount?: number;
  likesCount?: number;
  displayUrl?: string;
  timestamp?: string;
  postUrl?: string;
  imageUrl?: string;
  likes?: number;
  comments?: number;
}

interface PostDetailDialogProps {
  post: LatestPost | null;
  proxiedImage: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatNumber(num: number | undefined): string {
  if (num === undefined || isNaN(num)) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function getPostTypeIcon(type: string | undefined) {
  switch (type?.toLowerCase()) {
    case 'video':
    case 'reel':
      return <Film className="h-4 w-4" />;
    case 'sidecar':
    case 'carousel':
      return <Grid3X3 className="h-4 w-4" />;
    default:
      return <Image className="h-4 w-4" />;
  }
}

function extractHashtags(caption: string | undefined): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\w\u0080-\uFFFF]+/g);
  return matches ? [...new Set(matches)].slice(0, 10) : [];
}

function extractMentions(caption: string | undefined): string[] {
  if (!caption) return [];
  const matches = caption.match(/@[\w.]+/g);
  return matches ? [...new Set(matches)].slice(0, 10) : [];
}

export function PostDetailDialog({ post, proxiedImage, open, onOpenChange }: PostDetailDialogProps) {
  if (!post) return null;

  const likes = post.likesCount ?? post.likes ?? 0;
  const comments = post.commentsCount ?? post.comments ?? 0;
  const postUrl = post.url || post.postUrl;
  const hashtags = extractHashtags(post.caption);
  const mentions = extractMentions(post.caption);
  
  let formattedDate = '';
  if (post.timestamp) {
    try {
      const date = new Date(post.timestamp);
      formattedDate = format(date, 'MMM d, yyyy \'at\' h:mm a');
    } catch {
      formattedDate = post.timestamp;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPostTypeIcon(post.type)}
            <span className="capitalize">{post.type || 'Post'} Details</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            {proxiedImage ? (
              <img
                src={proxiedImage}
                alt={post.caption?.slice(0, 50) || 'Instagram post'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Grid3X3 className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 py-2">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              <span className="font-semibold">{formatNumber(likes)}</span>
              <span className="text-muted-foreground text-sm">likes</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-chart-1" />
              <span className="font-semibold">{formatNumber(comments)}</span>
              <span className="text-muted-foreground text-sm">comments</span>
            </div>
          </div>

          {/* Date */}
          {formattedDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </div>
          )}

          {/* Caption */}
          {post.caption && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Caption</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {post.caption}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Hashtags</p>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mentions */}
          {mentions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Mentions</p>
              <div className="flex flex-wrap gap-2">
                {mentions.map((mention, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {mention}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* View on Instagram */}
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-chart-1 hover:underline mt-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on Instagram
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
