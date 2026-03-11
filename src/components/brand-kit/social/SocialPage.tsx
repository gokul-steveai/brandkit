import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useBrandKit } from '@/hooks/useBrandKits';
import { SocialPlatformCard } from './SocialPlatformCard';
import { SocialProfileDialog } from './SocialProfileDialog';
import { SocialFeedbackDialog } from './SocialFeedbackDialog';
import { ViewPostsDialog } from './ViewPostsDialog';
import { PlatformExpressionDialog } from './PlatformExpressionDialog';
import { PLATFORM_CONFIGS, normalizeProfileUrl } from './types';
import type { 
  SocialPlatform, 
  ProfileType, 
  SocialProfile, 
  LinkedInProfileData,
  InstagramProfileData,
  FacebookProfileData,
  TikTokProfileData,
  YouTubeProfileData,
  RedditProfileData,
  PlatformProfileData,
} from './types';

const PLATFORMS: SocialPlatform[] = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'reddit'];

// Platform-specific data mappers
const mapLinkedInData = (data: LinkedInProfileData): Partial<SocialProfile> => ({
  first_name: data.firstName || null,
  last_name: data.lastName || null,
  headline: data.headline || null,
  about: data.about || null,
  job_title: data.jobTitle || null,
  company_name: data.companyName || null,
  company_website: data.companyWebsite || null,
  connections: data.connections || null,
  followers: data.followers || null,
  is_influencer: data.isInfluencer || false,
  skills: (data.skills || []) as unknown as SocialProfile['skills'],
  experiences: (data.experiences || []) as unknown as SocialProfile['experiences'],
  recommendations: (data.recommendationsReceived || []) as unknown as SocialProfile['recommendations'],
  recommendations_given: (data.recommendations || []) as unknown as SocialProfile['recommendations_given'],
  interests: (data.interests || []) as unknown as SocialProfile['interests'],
  highlights: (data.highlights || []) as unknown as SocialProfile['highlights'],
  verifications: (data.verifications || []) as unknown as SocialProfile['verifications'],
});

const mapInstagramData = (data: InstagramProfileData): Partial<SocialProfile> => {
  console.log('[mapInstagramData] Raw input data:', JSON.stringify(data, null, 2));

  // Use local Supabase storage URL if edge function provided it, otherwise fallback to original
  let profileImageUrl: string | null = null;
  let profilePicHdUrl: string | null = null;
  
  if (data.localProfileImagePath) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const localUrl = `${supabaseUrl}/storage/v1/object/public/social-profile-images/${data.localProfileImagePath}`;
    profileImageUrl = localUrl;
    profilePicHdUrl = localUrl; // Use same local URL for HD version
    console.log('[mapInstagramData] Using local storage URL for both fields:', localUrl);
  } else {
    profileImageUrl = data.profilePicUrlHD || data.profilePicURL || null;
    profilePicHdUrl = data.profilePicUrlHD || null;
  }

  // Handle both Apify and legacy n8n response formats
  const mapped: Partial<SocialProfile> = {
    full_name: data.fullName || null,
    first_name: data.fullName || null,
    username: data.username || null,
    biography: data.biography || null,
    about: data.biography || null,
    // Apify uses followersCount (number), n8n uses followerCount (string)
    followers: data.followersCount ?? (data.followerCount ? parseInt(String(data.followerCount), 10) : null),
    follows_count: data.followsCount || null,
    // Apify uses postsCount, n8n uses postCount
    posts_count: data.postsCount ?? (data.postCount ? parseInt(String(data.postCount), 10) : null),
    has_channel: data.hasChannel === true,
    verified: data.verified === true,
    profile_image_url: profileImageUrl,
    profile_pic_hd_url: profilePicHdUrl,
    is_business_account: data.isBusinessAccount || false,
    is_private: data.private || false,
    business_category: data.businessCategoryName || null,
    external_url: data.externalUrl || null,
    external_urls: (data.externalUrls || []) as any,
    highlight_reel_count: data.highlightReelCount || null,
    igtv_video_count: data.igtvVideoCount || null,
  };

  console.log('[mapInstagramData] Mapped output:', JSON.stringify(mapped, null, 2));
  return mapped;
};

const mapFacebookData = (data: FacebookProfileData): Partial<SocialProfile> => ({
  first_name: data.name || null,
  username: data.username || null,
  about: data.about || null,
  followers: data.followerCount || null,
  friend_count: data.friendCount || null,
  likes_count: data.likeCount || null,
  verified: data.verified || false,
  profile_image_url: data.profilePicUrl || null,
  cover_photo_url: data.coverPhotoUrl || null,
  category: data.category || null,
  external_url: data.website || null,
  company_website: data.website || null,
});

const mapTikTokData = (data: TikTokProfileData): Partial<SocialProfile> => ({
  username: data.username || null,
  first_name: data.nickname || null,
  biography: data.bio || null,
  about: data.bio || null,
  followers: data.followerCount || null,
  following_count: data.followingCount || null,
  likes_count: data.likesCount || null,
  video_count: data.videoCount || null,
  verified: data.verified || false,
  profile_image_url: data.profilePicUrl || null,
});

const mapYouTubeData = (data: YouTubeProfileData): Partial<SocialProfile> => ({
  first_name: data.channelName || null,
  username: data.handle || null,
  about: data.description || null,
  subscriber_count: data.subscriberCount || null,
  video_count: data.videoCount || null,
  view_count: data.viewCount || null,
  verified: data.verified || false,
  profile_image_url: data.profilePicUrl || null,
  banner_url: data.bannerUrl || null,
  joined_date: data.joinedDate || null,
});

const mapRedditData = (data: RedditProfileData): Partial<SocialProfile> => ({
  username: data.username || null,
  first_name: data.displayName || null,
  biography: data.bio || null,
  about: data.bio || null,
  karma: data.karma || null,
  post_karma: data.postKarma || null,
  comment_karma: data.commentKarma || null,
  cake_day: data.cakeDay || null,
  verified: data.verified || false,
  profile_image_url: data.profilePicUrl || null,
});

const mapProfileData = (platform: SocialPlatform, data: PlatformProfileData): Partial<SocialProfile> => {
  switch (platform) {
    case 'linkedin':
      return mapLinkedInData(data as LinkedInProfileData);
    case 'instagram':
      return mapInstagramData(data as InstagramProfileData);
    case 'facebook':
      return mapFacebookData(data as FacebookProfileData);
    case 'tiktok':
      return mapTikTokData(data as TikTokProfileData);
    case 'youtube':
      return mapYouTubeData(data as YouTubeProfileData);
    case 'reddit':
      return mapRedditData(data as RedditProfileData);
    default:
      return {};
  }
};

export function SocialPage() {
  const { id: brandKitId } = useParams<{ id: string }>();
  const { data: brandKit } = useBrandKit(brandKitId || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ProfileType>('personal');
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);

  // Posts dialog state
  const [isViewPostsDialogOpen, setIsViewPostsDialogOpen] = useState(false);
  const [selectedPostsStoragePath, setSelectedPostsStoragePath] = useState<string | null>(null);
  const [isGettingPosts, setIsGettingPosts] = useState<{ [key: string]: boolean }>({});
  const [viewingPostsPlatform, setViewingPostsPlatform] = useState<SocialPlatform | null>(null);

  // Platform Expression dialog state
  const [isExpressionDialogOpen, setIsExpressionDialogOpen] = useState(false);
  const [selectedExpressionProfile, setSelectedExpressionProfile] = useState<SocialProfile | null>(null);
  const [selectedExpressionPlatform, setSelectedExpressionPlatform] = useState<SocialPlatform | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch user profile for signed URL expiry preference
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-expiry', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('signed_url_expiry_months')
        .eq('id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch existing social profiles (only connected ones)
  const { data: profiles = [] } = useQuery({
    queryKey: ['social-profiles', brandKitId],
    queryFn: async () => {
      if (!brandKitId) return [];
      const { data, error } = await supabase
        .from('social_profiles')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .eq('is_disconnected', false); // Only show connected profiles

      if (error) throw error;
      return data as SocialProfile[];
    },
    enabled: !!brandKitId,
  });

  // Fetch global brand expression settings
  const { data: globalExpression } = useQuery({
    queryKey: ['brand-kit-expression', brandKitId],
    queryFn: async () => {
      if (!brandKitId) return null;
      const { data, error } = await supabase
        .from('brand_kit_expression')
        .select('verbal_style, tone_dimensions, preferred_terminology')
        .eq('brand_kit_id', brandKitId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!brandKitId,
  });

  // Get profile for a specific platform and type
  const getProfile = (platform: SocialPlatform, profileType: ProfileType) => {
    return profiles.find(
      (p) => p.platform === platform && p.profile_type === profileType
    );
  };

  // Download and store profile image permanently
  const downloadProfileImage = async (
    imageUrl: string,
    brandKitId: string,
    platform: SocialPlatform,
    profileType: ProfileType
  ): Promise<string | null> => {
    if (!imageUrl) return null;

    try {
      console.log('[SocialPage] Downloading profile image:', imageUrl);
      const { data, error } = await supabase.functions.invoke('download-profile-image', {
        body: {
          imageUrl,
          brandKitId,
          platform,
          profileType,
        },
      });

      if (error) {
        console.error('[SocialPage] Failed to download profile image:', error);
        return null;
      }

      if (data?.permanentUrl) {
        console.log('[SocialPage] Got permanent image URL:', data.permanentUrl);
        return data.permanentUrl;
      }

      return null;
    } catch (err) {
      console.error('[SocialPage] Error downloading profile image:', err);
      return null;
    }
  };

  // Submit URL and fetch profile data
  const submitMutation = useMutation({
    mutationFn: async ({
      platform,
      profileType,
      url,
    }: {
      platform: SocialPlatform;
      profileType: ProfileType;
      url: string;
    }) => {
      if (!brandKitId || !brandKit) throw new Error('Brand kit not found');

      // Use platform-aware normalization (handles bare usernames)
      const normalizedUrl = normalizeProfileUrl(url, platform);
      const timestamp = new Date().toISOString();

      // Check if profile already exists (including disconnected ones)
      const { data: existingProfile } = await supabase
        .from('social_profiles')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .eq('platform', platform)
        .eq('profile_type', profileType)
        .maybeSingle();

      // If exists and was scraped (not manual), just reconnect it
      if (existingProfile && existingProfile.data_source !== 'manual') {
        const { data: reconnected, error: reconnectError } = await supabase
          .from('social_profiles')
          .update({ is_disconnected: false, status: 'active' })
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (reconnectError) throw reconnectError;
        return reconnected as SocialProfile;
      }

      // Use dedicated instagram-scraper for Instagram platform
      if (platform === 'instagram') {
        const { data, error } = await supabase.functions.invoke('instagram-scraper', {
          body: {
            url: normalizedUrl,
            mode: 'details',
            resultsLimit: 5,
            brandKitId,
            profileType,
            userId,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch Instagram profile');
        }

        if (!data || !data.success) {
          throw new Error(data?.error || 'No data returned from Instagram');
        }

        const profileData = data.data;
        const mappedData = mapProfileData(platform, profileData);

        // Profile image is already downloaded by edge function and URL set in mapInstagramData
        // No need to call downloadProfileImage again
        const socialProfile: Partial<SocialProfile> & { storage_path?: string; data_source?: string } = {
          brand_kit_id: brandKitId,
          platform,
          profile_type: profileType,
          profile_url: normalizedUrl,
          status: 'active',
          raw_response: profileData as SocialProfile['raw_response'],
          data_source: 'apify',
          is_disconnected: false,
          ...mappedData,
        };

        return socialProfile;
      }

      // Call edge function to scrape social profile (non-Instagram platforms)
      const { data, error } = await supabase.functions.invoke('social-profile-scrape', {
        body: {
          brandKitName: brandKit.name,
          brandKitId,
          userId,
          platform,
          profileType,
          url: normalizedUrl,
          timestamp,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch profile data');
      }

      if (!data) {
        throw new Error('No data returned from scrape');
      }
      
      // Handle new response structure with profileData and storagePath
      const responseData = data.profileData || data;
      const storagePath = data.storagePath || null;
      
      // Handle array response (webhook might return array)
      const profileData: PlatformProfileData = Array.isArray(responseData) ? responseData[0] : responseData;

      // Use platform-specific mapper
      const mappedData = mapProfileData(platform, profileData);

      // Download and store the profile image permanently if present
      let permanentImageUrl = mappedData.profile_image_url;
      if (permanentImageUrl) {
        const storedUrl = await downloadProfileImage(
          permanentImageUrl,
          brandKitId,
          platform,
          profileType
        );
        if (storedUrl) {
          permanentImageUrl = storedUrl;
        }
      }

      // Build the social profile with common fields
      const socialProfile: Partial<SocialProfile> & { storage_path?: string; data_source?: string } = {
        brand_kit_id: brandKitId,
        platform,
        profile_type: profileType,
        profile_url: normalizedUrl,
        status: 'active',
        raw_response: responseData as SocialProfile['raw_response'],
        storage_path: storagePath,
        data_source: 'apify',
        is_disconnected: false,
        ...mappedData,
        profile_image_url: permanentImageUrl, // Use the permanent URL
      };

      // For LinkedIn, extract logo from first experience if available
      if (platform === 'linkedin') {
        const linkedInData = profileData as LinkedInProfileData;
        if (linkedInData.experiences?.[0]?.logo) {
          socialProfile.logo_url = linkedInData.experiences[0].logo;
        }
      }

      return socialProfile;
    },
    onSuccess: (profileData) => {
      // Show the profile dialog for review
      setSelectedProfile(profileData as unknown as SocialProfile);
      setIsNewProfile(true);
      setIsProfileDialogOpen(true);
    },
    onError: (error) => {
      console.error('Failed to fetch profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch profile data. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Save profile to database
  const saveMutation = useMutation({
    mutationFn: async (profile: Partial<SocialProfile>) => {
      // Preserve data_source if already set, otherwise determine from raw_response
      const dataSource = profile.data_source || (profile.raw_response ? 'apify' : 'manual');
      
      // Fetch existing profile to preserve post_storage_path if not explicitly set
      const { data: existingProfile } = await supabase
        .from('social_profiles')
        .select('id, post_storage_path')
        .eq('brand_kit_id', profile.brand_kit_id)
        .eq('platform', profile.platform)
        .eq('profile_type', profile.profile_type)
        .single();
      
      // Preserve post_storage_path if not explicitly provided in the incoming profile
      const postStoragePath = profile.post_storage_path !== undefined 
        ? profile.post_storage_path 
        : existingProfile?.post_storage_path || null;
      
      const { data, error } = await supabase
        .from('social_profiles')
        .upsert([{ 
          ...profile, 
          data_source: dataSource, 
          is_disconnected: false,
          post_storage_path: postStoragePath
        }] as any, { onConflict: 'brand_kit_id,platform,profile_type' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profiles', brandKitId] });
      toast({
        title: 'Profile saved',
        description: 'Social profile has been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to save profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete profile mutation (soft-delete for scraped, hard-delete for manual)
  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // First, check if this profile was scraped
      const { data: profile } = await supabase
        .from('social_profiles')
        .select('data_source')
        .eq('id', profileId)
        .single();
      
      if (profile?.data_source === 'manual') {
        // Hard delete for manual profiles
        const { error } = await supabase
          .from('social_profiles')
          .delete()
          .eq('id', profileId);
        if (error) throw error;
      } else {
        // Soft delete for scraped profiles (preserve data)
        const { error } = await supabase
          .from('social_profiles')
          .update({ is_disconnected: true, status: 'inactive' })
          .eq('id', profileId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profiles', brandKitId] });
      toast({
        title: 'Profile disconnected',
        description: 'Social profile has been disconnected.',
      });
    },
    onError: (error) => {
      console.error('Failed to delete profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Get posts mutation
  const getPostsMutation = useMutation({
    mutationFn: async ({
      platform,
      profileType,
      profileUrl,
    }: {
      platform: SocialPlatform;
      profileType: ProfileType;
      profileUrl: string;
    }) => {
      if (!brandKitId || !brandKit) throw new Error('Brand kit not found');

      // Use dedicated instagram-scraper for Instagram platform
      if (platform === 'instagram') {
        const { data, error } = await supabase.functions.invoke('instagram-scraper', {
          body: {
            url: profileUrl,
            mode: 'posts',
            resultsLimit: 200,
            brandKitId,
            profileType,
            userId,
          },
        });

        if (error) throw new Error(error.message || 'Failed to fetch posts');
        
        // Edge function updates DB directly with service role key - no frontend backup needed
        // The saveMutation now preserves post_storage_path, so it won't be overwritten
        console.log('[SocialPage] Posts fetched, edge function updated post_storage_path:', data?.storagePath);
        
        return data;
      }

      // Fallback for other platforms (not currently used)
      const { data, error } = await supabase.functions.invoke('social-profile-scrape', {
        body: {
          brandKitName: brandKit.name,
          brandKitId,
          userId,
          platform,
          profileType,
          url: profileUrl,
          scrapeType: 'posts',
          resultsLimit: 200,
        },
      });

      if (error) throw new Error(error.message || 'Failed to fetch posts');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profiles', brandKitId] });
      toast({
        title: 'Posts retrieved',
        description: 'Instagram posts have been fetched and saved.',
      });
    },
    onError: (error) => {
      console.error('Failed to fetch posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch posts. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteProfile = (platform: SocialPlatform) => {
    const profile = getProfile(platform, activeTab);
    if (profile && confirm('Are you sure you want to disconnect this profile?')) {
      deleteMutation.mutate(profile.id);
    }
  };

  const handleSubmit = async (platform: SocialPlatform, url: string) => {
    await submitMutation.mutateAsync({
      platform,
      profileType: activeTab,
      url,
    });
  };

  const handleViewProfile = (platform: SocialPlatform) => {
    const profile = getProfile(platform, activeTab);
    if (profile) {
      setSelectedProfile(profile);
      setIsNewProfile(false);
      setIsProfileDialogOpen(true);
    }
  };

  const handleCreateManually = (platform: SocialPlatform) => {
    const emptyProfile: Partial<SocialProfile> = {
      brand_kit_id: brandKitId,
      platform,
      profile_type: activeTab,
      status: 'active',
    };
    setSelectedProfile(emptyProfile as SocialProfile);
    setIsNewProfile(true);
    setIsProfileDialogOpen(true);
  };

  const handleSaveProfile = async (updates: Partial<SocialProfile>) => {
    await saveMutation.mutateAsync(updates);
  };

  const handleGetPosts = async (platform: SocialPlatform) => {
    const profile = getProfile(platform, activeTab);
    if (!profile?.profile_url) return;

    const key = `${platform}-${activeTab}`;
    setIsGettingPosts(prev => ({ ...prev, [key]: true }));

    try {
      await getPostsMutation.mutateAsync({
        platform,
        profileType: activeTab,
        profileUrl: profile.profile_url,
      });
    } finally {
      setIsGettingPosts(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleViewPosts = (platform: SocialPlatform) => {
    const profile = getProfile(platform, activeTab);
    if (profile?.post_storage_path) {
      setSelectedPostsStoragePath(profile.post_storage_path);
      setViewingPostsPlatform(platform);
      setIsViewPostsDialogOpen(true);
    }
  };

  const handleRetryPostsExtraction = async () => {
    if (viewingPostsPlatform) {
      await handleGetPosts(viewingPostsPlatform);
    }
  };

  const handleOpenExpression = (platform: SocialPlatform) => {
    const profile = getProfile(platform, activeTab);
    if (profile) {
      setSelectedExpressionProfile(profile);
      setSelectedExpressionPlatform(platform);
      setIsExpressionDialogOpen(true);
    }
  };

  const handleSaveExpression = async (overrides: Record<string, unknown>) => {
    if (!selectedExpressionProfile) return;
    
    const { error } = await supabase
      .from('social_profiles')
      .update({ expression_overrides: overrides as unknown as SocialProfile['expression_overrides'] })
      .eq('id', selectedExpressionProfile.id);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['social-profiles', brandKitId] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Profiles</h1>
        <p className="text-muted-foreground mt-1">
          Connect your social media profiles to enhance your brand identity with historical data and account details.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileType)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="company">Company / Business</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORMS.map((platform) => (
              <SocialPlatformCard
                key={platform}
                platform={platform}
                profileType="personal"
                existingProfile={getProfile(platform, 'personal')}
                onSubmit={(url) => handleSubmit(platform, url)}
                onViewProfile={() => handleViewProfile(platform)}
                onCreateManually={() => handleCreateManually(platform)}
                onDelete={() => handleDeleteProfile(platform)}
                onGetPosts={() => handleGetPosts(platform)}
                onViewPosts={() => handleViewPosts(platform)}
                onOpenExpression={() => handleOpenExpression(platform)}
                isGettingPosts={isGettingPosts[`${platform}-personal`] || false}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="company" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORMS.map((platform) => (
              <SocialPlatformCard
                key={platform}
                platform={platform}
                profileType="company"
                existingProfile={getProfile(platform, 'company')}
                onSubmit={(url) => handleSubmit(platform, url)}
                onViewProfile={() => handleViewProfile(platform)}
                onCreateManually={() => handleCreateManually(platform)}
                onDelete={() => handleDeleteProfile(platform)}
                onGetPosts={() => handleGetPosts(platform)}
                onViewPosts={() => handleViewPosts(platform)}
                onOpenExpression={() => handleOpenExpression(platform)}
                isGettingPosts={isGettingPosts[`${platform}-company`] || false}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Feedback Link */}
      <div className="text-center pt-4 border-t border-border">
        <button
          onClick={() => setIsFeedbackDialogOpen(true)}
          className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Don't see your Social Profile connector? Click here to request another
        </button>
      </div>

      {/* Profile Dialog */}
      <SocialProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        profile={selectedProfile}
        onSave={handleSaveProfile}
        isNew={isNewProfile}
      />

      {/* Feedback Dialog */}
      <SocialFeedbackDialog
        open={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
        brandKitId={brandKitId}
      />

      {/* View Posts Dialog */}
      <ViewPostsDialog
        open={isViewPostsDialogOpen}
        onOpenChange={(open) => {
          setIsViewPostsDialogOpen(open);
          if (!open) setViewingPostsPlatform(null);
        }}
        storagePath={selectedPostsStoragePath}
        signedUrlExpiryMonths={userProfile?.signed_url_expiry_months ?? 12}
        onRetryExtraction={handleRetryPostsExtraction}
        isExtracting={viewingPostsPlatform ? isGettingPosts[`${viewingPostsPlatform}-${activeTab}`] : false}
      />

      {/* Platform Expression Dialog */}
      <PlatformExpressionDialog
        open={isExpressionDialogOpen}
        onOpenChange={(open) => {
          setIsExpressionDialogOpen(open);
          if (!open) {
            setSelectedExpressionProfile(null);
            setSelectedExpressionPlatform(null);
          }
        }}
        profile={selectedExpressionProfile}
        globalExpression={globalExpression as any}
        onSave={handleSaveExpression}
        platform={selectedExpressionPlatform || 'instagram'}
      />
    </div>
  );
}
