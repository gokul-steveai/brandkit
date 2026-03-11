import { useState } from 'react';
import { ExternalLink, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Eye, Download, RefreshCw, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PLATFORM_CONFIGS, normalizeProfileUrl, validatePlatformUrl } from './types';
import type { SocialPlatform, ProfileType, SocialProfile } from './types';

interface SocialPlatformCardProps {
  platform: SocialPlatform;
  profileType: ProfileType;
  existingProfile?: SocialProfile | null;
  onSubmit: (url: string) => Promise<void>;
  onViewProfile: () => void;
  onCreateManually: () => void;
  onDelete: () => void;
  onGetPosts?: () => Promise<void>;
  onViewPosts?: () => void;
  onOpenExpression?: () => void;
  isGettingPosts?: boolean;
}

/**
 * Calculate credit cost for posts scraping.
 * Rule: 1 credit per 10 posts
 * Rounding: 5+ remainder rounds up, 4 or less rounds down
 * Examples: 13 posts = 1 credit, 15 posts = 2 credits, 27 posts = 3 credits
 */
export function calculatePostsCreditCost(postsCount: number): number {
  if (postsCount <= 0) return 0;
  const base = Math.floor(postsCount / 10);
  const remainder = postsCount % 10;
  return remainder >= 5 ? base + 1 : Math.max(base, 1);
}

export function SocialPlatformCard({
  platform,
  profileType,
  existingProfile,
  onSubmit,
  onViewProfile,
  onCreateManually,
  onDelete,
  onGetPosts,
  onViewPosts,
  onOpenExpression,
  isGettingPosts = false,
}: SocialPlatformCardProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Connecting...');

  const config = PLATFORM_CONFIGS[platform];
  const hasProfile = existingProfile && existingProfile.status === 'active';
  const hasPosts = existingProfile?.post_storage_path;
  const postsCount = existingProfile?.posts_count || 0;
  const creditCost = calculatePostsCreditCost(postsCount);

  // Only show Get Posts button for Instagram (Apify supported)
  const canGetPosts = platform === 'instagram' && hasProfile && postsCount > 0;

  const handleSubmit = async () => {
    setError(null);
    
    // Use platform-aware normalization (handles bare usernames)
    const normalizedUrl = normalizeProfileUrl(url, platform);
    
    if (!validatePlatformUrl(normalizedUrl, platform)) {
      setError(`Please enter a valid ${config.name} URL or username`);
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setLoadingMessage('Connecting...');

    // Start the 12-second progress animation (accounts for 5-10 second webhook + buffer)
    const startTime = Date.now();
    const duration = 12000;
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 95, 95);
      setProgress(newProgress);
      
      if (elapsed < 2000) {
        setLoadingMessage('Connecting...');
      } else if (elapsed < 5000) {
        setLoadingMessage('Fetching profile data...');
      } else if (elapsed < 8000) {
        setLoadingMessage('Processing profile details...');
      } else {
        setLoadingMessage('Almost there...');
      }
      
      if (elapsed >= duration) {
        clearInterval(progressInterval);
      }
    }, 50);

    try {
      await onSubmit(normalizedUrl);
      setProgress(100);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setProgress(0);
    }
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'linkedin':
        return (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        );
      case 'facebook':
        return (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
          </svg>
        );
      case 'tiktok':
        return (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        );
      case 'youtube':
        return (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        );
      case 'reddit':
        return (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg text-white', config.color)}>
            {getPlatformIcon()}
          </div>
          <CardTitle className="text-lg">{config.name}</CardTitle>
          {!hasProfile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto"
              onClick={onCreateManually}
              title="Create profile manually"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {hasProfile && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                title="Disconnect profile"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {loadingMessage}
            </p>
            <Progress value={progress} className="h-2" />
          </div>
        ) : hasProfile ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground truncate">
              {existingProfile.profile_url}
            </p>
            
            {/* Action buttons row */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={onViewProfile}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Profile Data
              </Button>

              {/* Get Posts / View Posts button (Instagram only) */}
              {canGetPosts && (
                hasPosts ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onViewPosts}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View posts
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full bg-warning/10 border-warning/50 text-warning hover:bg-warning/20"
                    onClick={onGetPosts}
                    disabled={isGettingPosts}
                  >
                    {isGettingPosts ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Get {postsCount} posts ({creditCost} credit{creditCost !== 1 ? 's' : ''})
                  </Button>
                )
              )}

              {/* Platform Expression button */}
              {onOpenExpression && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onOpenExpression}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Platform Expression
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder={config.placeholder}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              className="border-2"
            />
            {error && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setUrl('');
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!url.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Connect Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
