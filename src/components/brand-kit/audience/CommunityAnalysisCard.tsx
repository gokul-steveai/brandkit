import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, MessageSquare, ThumbsUp, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';

interface CommunityInsight {
  topEngagers?: Array<{
    username: string;
    engagementScore?: number;
    commentCount?: number;
  }>;
  sentimentBreakdown?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  // Can be either structured object OR simple array of strings from AI extraction
  engagementPatterns?: {
    peakDays?: string[];
    peakHours?: string[];
    avgResponseTime?: string;
  } | string[];
  commonTopics?: string[];
  topThemes?: string[];  // Alternative field name used by AI extraction
  lastUpdated?: string;
}

interface CommunityAnalysisCardProps {
  brandKitId: string;
  platformContext?: string;
}

export function CommunityAnalysisCard({ brandKitId, platformContext }: CommunityAnalysisCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<CommunityInsight | null>(null);
  const [hasReport, setHasReport] = useState(false);

  // Check if there's a comment analysis report
  const checkForReport = async () => {
    try {
      const { data } = await supabase
        .from('user_knowledge_file_uploads')
        .select('extracted_data')
        .eq('brand_kit_id', brandKitId)
        .eq('category', 'comment_analysis_report')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.extracted_data) {
        setHasReport(true);
        // Parse the extracted data for community insights
        const extractedData = data.extracted_data as Record<string, unknown>;
        if (extractedData.communityInsights) {
          setInsights(extractedData.communityInsights as CommunityInsight);
        }
      }
    } catch (error) {
      console.error('Error checking for report:', error);
    }
  };

  // Load on mount
  useState(() => {
    checkForReport();
  });

  const refreshAnalysis = async () => {
    setIsLoading(true);
    try {
      await checkForReport();
      toast({ title: 'Analysis refreshed' });
    } catch (error) {
      toast({ title: 'Failed to refresh', variant: 'destructive' });
    } finally {
      setIsLoading(false);
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
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasReport || !insights) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/25">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg text-muted-foreground">Community Analysis</CardTitle>
          </div>
          <CardDescription>
            Upload a Comment Analysis Report in Knowledge Files to unlock community insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>No comment analysis report found. Upload one to see engagement patterns, top commenters, and sentiment breakdown.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Community Analysis</CardTitle>
            {platformContext && (
              <Badge variant="outline" className="text-xs">{platformContext}</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={refreshAnalysis}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Insights from your audience engagement data
          {insights.lastUpdated && (
            <span className="text-xs ml-2">• Updated {new Date(insights.lastUpdated).toLocaleDateString()}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sentiment Breakdown */}
        {insights.sentimentBreakdown && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ThumbsUp className="h-4 w-4" />
              Sentiment Breakdown
            </div>
            <div className="flex gap-2">
              <div className="flex-1 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <p className="text-lg font-bold text-green-600">{insights.sentimentBreakdown.positive}%</p>
                <p className="text-xs text-muted-foreground">Positive</p>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-muted border text-center">
                <p className="text-lg font-bold">{insights.sentimentBreakdown.neutral}%</p>
                <p className="text-xs text-muted-foreground">Neutral</p>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                <p className="text-lg font-bold text-red-600">{insights.sentimentBreakdown.negative}%</p>
                <p className="text-xs text-muted-foreground">Negative</p>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Patterns */}
        {insights.engagementPatterns && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Engagement Patterns
            </div>
            {Array.isArray(insights.engagementPatterns) ? (
              // If it's an array of strings (from AI extraction)
              <ul className="space-y-2 text-sm text-muted-foreground">
                {insights.engagementPatterns.map((pattern, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            ) : (
              // If it's the structured object format
              <div className="grid grid-cols-2 gap-3 text-sm">
                {insights.engagementPatterns.peakDays && insights.engagementPatterns.peakDays.length > 0 && (
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Peak Days</p>
                    <p className="font-medium">{insights.engagementPatterns.peakDays.join(', ')}</p>
                  </div>
                )}
                {insights.engagementPatterns.peakHours && insights.engagementPatterns.peakHours.length > 0 && (
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Peak Hours</p>
                    <p className="font-medium">{insights.engagementPatterns.peakHours.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Top Engagers */}
        {insights.topEngagers && insights.topEngagers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Top Engagers
            </div>
            <div className="space-y-1">
              {insights.topEngagers.slice(0, 5).map((engager, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                  <span className="font-medium">@{engager.username}</span>
                  {engager.commentCount !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {engager.commentCount} comments
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Topics / Top Themes */}
        {((insights.commonTopics && insights.commonTopics.length > 0) || 
          (insights.topThemes && insights.topThemes.length > 0)) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Common Topics</p>
            <div className="flex flex-wrap gap-1">
              {(insights.commonTopics || insights.topThemes || []).map((topic, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
