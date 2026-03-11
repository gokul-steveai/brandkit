import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { PostDetailDialog } from "./PostDetailDialog";
import { 
  ExternalLink, 
  Users, 
  UserPlus, 
  Grid3X3, 
  CheckCircle2,
  Heart,
  MessageCircle,
  Tv,
  Sparkles,
  Lock,
  Globe
} from "lucide-react";

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

interface RawProfileData {
  "Profile Information "?: string;
  "Latest Posts"?: LatestPost[];
  "Latest Videos"?: LatestPost[];
  inputUrl?: string;
  id?: string;
  username?: string;
  url?: string;
  fullName?: string;
  biography?: string;
  externalUrl?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  isBusinessAccount?: boolean;
  businessCategoryName?: string | null;
  latestPosts?: LatestPost[];
}

interface ParsedProfile {
  username?: string;
  fullName?: string;
  biography?: string;
  externalUrl?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  profilePicUrl?: string;
  isBusinessAccount?: boolean;
  businessCategoryName?: string;
  latestPosts?: LatestPost[];
  url?: string;
  hasChannel?: boolean;
  highlightReelCount?: number;
  isPrivate?: boolean;
}

interface InstagramProfileResultsProps {
  profile: RawProfileData;
}

function parseProfileInfoString(infoString: string): Partial<ParsedProfile> {
  const lines = infoString.split('\n');
  const data: Record<string, string> = {};
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      data[key] = value;
    }
  }
  
  return {
    username: data['username'],
    fullName: data['full name'] || data['fulll name'],
    biography: data['biography'],
    externalUrl: data['external url'],
    followersCount: parseInt(data['follower count'] || data['followers'] || '0', 10) || 0,
    followsCount: parseInt(data['follows count'] || data['following'] || '0', 10) || 0,
    postsCount: parseInt(data['post count'] || data['posts count'] || data['posts'] || '0', 10) || 0,
    verified: data['is verified?'] === 'true' || data['verified'] === 'true',
    isBusinessAccount: data['is business account?'] === 'true' || data['business account'] === 'true',
    businessCategoryName: data['business category name'] || data['category'],
    profilePicUrl: data['profile pic url'] || data['profile picture'],
    hasChannel: data['has channel?'] === 'true',
    highlightReelCount: parseInt(data['highlight reel count'] || '0', 10) || 0,
    isPrivate: data['is private?'] === 'true',
  };
}

function normalizeProfile(rawProfile: RawProfileData): ParsedProfile {
  if (rawProfile["Profile Information "]) {
    const parsed = parseProfileInfoString(rawProfile["Profile Information "]);
    
    const latestPosts = [
      ...(rawProfile["Latest Posts"] || []),
      ...(rawProfile["Latest Videos"] || [])
    ];
    
    return {
      ...parsed,
      latestPosts,
      url: `https://instagram.com/${parsed.username}`
    };
  }
  
  return {
    username: rawProfile.username,
    fullName: rawProfile.fullName,
    biography: rawProfile.biography,
    externalUrl: rawProfile.externalUrl,
    followersCount: rawProfile.followersCount,
    followsCount: rawProfile.followsCount,
    postsCount: rawProfile.postsCount,
    verified: rawProfile.verified,
    profilePicUrl: rawProfile.profilePicUrl || rawProfile.profilePicUrlHD,
    isBusinessAccount: rawProfile.isBusinessAccount,
    businessCategoryName: rawProfile.businessCategoryName || undefined,
    latestPosts: rawProfile.latestPosts,
    url: rawProfile.url
  };
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

async function proxyImage(imageUrl: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('proxy-instagram-image', {
      body: { imageUrl }
    });
    
    if (error) {
      console.error('Error proxying image:', error);
      return null;
    }
    
    return data?.dataUrl || null;
  } catch (err) {
    console.error('Failed to proxy image:', err);
    return null;
  }
}

export function InstagramProfileResults({ profile: rawProfile }: InstagramProfileResultsProps) {
  // Memoize the normalized profile to prevent re-renders
  const profile = useMemo(() => normalizeProfile(rawProfile), [rawProfile]);
  
  // Create stable reference for post IDs to use as dependency
  const postIds = useMemo(() => {
    if (!profile.latestPosts) return '';
    return profile.latestPosts.map(p => p.id || p.shortCode || '').join(',');
  }, [profile.latestPosts]);
  
  const [proxiedImages, setProxiedImages] = useState<Record<string, string | null>>({});
  const [proxiedProfilePic, setProxiedProfilePic] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);
  const [hasProxied, setHasProxied] = useState(false);
  
  // Post detail dialog state
  const [selectedPost, setSelectedPost] = useState<{ post: LatestPost; index: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const hasData = profile.username || profile.fullName || profile.biography;

  // Proxy all images on mount - only once
  useEffect(() => {
    // Skip if already proxied or no data
    if (hasProxied || !hasData) return;
    
    async function proxyAllImages() {
      setLoadingImages(true);
      
      // Proxy profile picture
      if (profile.profilePicUrl) {
        const proxiedPic = await proxyImage(profile.profilePicUrl);
        setProxiedProfilePic(proxiedPic);
      }
      
      // Proxy post images
      if (profile.latestPosts && profile.latestPosts.length > 0) {
        const postsToProxy = profile.latestPosts.slice(0, 6);
        const results: Record<string, string | null> = {};
        
        // Proxy images in parallel
        await Promise.all(
          postsToProxy.map(async (post, index) => {
            const imageUrl = post.displayUrl || post.imageUrl;
            if (imageUrl) {
              const proxied = await proxyImage(imageUrl);
              results[index.toString()] = proxied;
            }
          })
        );
        
        setProxiedImages(results);
      }
      
      setLoadingImages(false);
      setHasProxied(true);
    }
    
    proxyAllImages();
  }, [postIds, hasData, hasProxied, profile.profilePicUrl, profile.latestPosts]);
  
  const handlePostClick = (post: LatestPost, index: number) => {
    setSelectedPost({ post, index });
    setDialogOpen(true);
  };
  
  if (!hasData) {
    return (
      <div className="mx-auto max-w-4xl text-center py-8">
        <p className="text-muted-foreground">No profile data available. Please try again.</p>
      </div>
    );
  }
  
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="text-2xl font-semibold text-center mb-6">Profile Analysis</h2>
      
      {/* Profile Header Card */}
      <Card className="border-2 border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage 
                src={proxiedProfilePic || undefined} 
                alt={profile.fullName}
              />
              <AvatarFallback>{profile.fullName?.charAt(0) || profile.username?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 className="text-xl font-semibold">{profile.fullName || profile.username}</h3>
                {profile.verified && (
                  <CheckCircle2 className="h-5 w-5 text-chart-1" />
                )}
              </div>
              {profile.username && (
                <p className="text-muted-foreground mb-2">@{profile.username}</p>
              )}
              
              {profile.isBusinessAccount && profile.businessCategoryName && (
                <Badge variant="secondary" className="mb-3">
                  {profile.businessCategoryName}
                </Badge>
              )}
              
              {profile.biography && (
                <p className="text-sm whitespace-pre-line mb-4">{profile.biography}</p>
              )}
              
              {profile.externalUrl && (
                <a 
                  href={profile.externalUrl.startsWith('http') ? profile.externalUrl : `https://${profile.externalUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-chart-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {profile.externalUrl.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2 border-border">
          <CardContent className="pt-6 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-chart-1" />
            <p className="text-2xl font-bold">{formatNumber(profile.followersCount)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-border">
          <CardContent className="pt-6 text-center">
            <UserPlus className="h-5 w-5 mx-auto mb-2 text-chart-1" />
            <p className="text-2xl font-bold">{formatNumber(profile.followsCount)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-border">
          <CardContent className="pt-6 text-center">
            <Grid3X3 className="h-5 w-5 mx-auto mb-2 text-chart-1" />
            <p className="text-2xl font-bold">{formatNumber(profile.postsCount)}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Details Card */}
      <Card className="border-2 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {profile.isPrivate ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Badge variant={profile.isPrivate ? "secondary" : "default"}>
                {profile.isPrivate ? "Private" : "Public"}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Account</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="font-semibold">{profile.highlightReelCount || 0}</p>
              <p className="text-xs text-muted-foreground">Highlights</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Tv className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant={profile.hasChannel ? "default" : "outline"}>
                {profile.hasChannel ? "Yes" : "No"}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Channel</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant={profile.verified ? "default" : "outline"}>
                {profile.verified ? "Yes" : "No"}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Verified</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Posts */}
      {profile.latestPosts && profile.latestPosts.length > 0 && (
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Latest Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {profile.latestPosts.slice(0, 6).map((post, index) => {
                const likes = post.likesCount ?? post.likes ?? 0;
                const comments = post.commentsCount ?? post.comments ?? 0;
                const proxiedImage = proxiedImages[index.toString()];
                
                return (
                  <div
                    key={post.id || post.shortCode || index}
                    onClick={() => handlePostClick(post, index)}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border cursor-pointer"
                  >
                    {loadingImages ? (
                      <Skeleton className="h-full w-full" />
                    ) : proxiedImage ? (
                      <img
                        src={proxiedImage}
                        alt={post.caption?.slice(0, 50) || 'Instagram post'}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <Grid3X3 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Heart className="h-4 w-4" />
                        {formatNumber(likes)}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <MessageCircle className="h-4 w-4" />
                        {formatNumber(comments)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View on Instagram Button */}
      <div className="text-center">
        <a
          href={profile.url || `https://instagram.com/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View full profile on Instagram
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      
      {/* Post Detail Dialog */}
      <PostDetailDialog
        post={selectedPost?.post || null}
        proxiedImage={selectedPost ? proxiedImages[selectedPost.index.toString()] : null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
