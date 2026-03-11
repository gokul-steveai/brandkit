import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedData {
  voiceArchetypes?: {
    primary?: { name: string; description: string; characteristics: string[] };
    secondary?: { name: string; description: string; characteristics: string[] };
    antiArchetypes?: { name: string; description: string }[];
  };
  toneDimensions?: {
    formality?: number;
    energy?: number;
    warmth?: number;
    confidence?: number;
    complexity?: number;
  };
  signaturePhrases?: string[];
  vocabularyRules?: {
    preferredTerms?: { term: string; context?: string }[];
    avoidTerms?: { term: string; reason?: string }[];
    brandSpecificTerms?: { term: string; definition?: string }[];
  };
  writingConstraints?: {
    hardConstraints?: string[];
    softGuidelines?: string[];
    platformSpecific?: Record<string, string[]>;
  };
  contentCategories?: {
    name: string;
    description: string;
    typicalStructure?: string;
    toneShift?: string;
  }[];
  audiencePersonas?: {
    name: string;
    title?: string;
    description?: string;
    demographics?: Record<string, string>;
    painPoints?: string[];
    goals?: string[];
    contentPreferences?: string[];
  }[];
  communityInsights?: {
    sentimentBreakdown?: Record<string, number>;
    topThemes?: string[];
    engagementPatterns?: string[];
  };
  driftPreventionPrompts?: string[];
  hashtagStrategy?: {
    primary?: string[];
    secondary?: string[];
    avoid?: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileContent, category, platformContext, fileId } = await req.json();

    if (!fileContent) {
      return new Response(JSON.stringify({ error: "File content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build extraction prompt based on category
    const extractionPrompts: Record<string, string> = {
      writing_style_report: `Extract the following structured data from this writing style analysis report:
1. Voice Archetypes (primary, secondary, anti-archetypes with names, descriptions, characteristics)
2. Tone Dimensions (formality, energy, warmth, confidence, complexity as 0-100 values)
3. Signature Phrases (recurring phrases or expressions)
4. Vocabulary Rules (preferred terms, avoid terms, brand-specific terminology)
5. Writing Constraints (hard constraints, soft guidelines)
6. Drift Prevention Prompts (negative prompts to prevent off-brand content)`,
      
      audience_report: `Extract the following structured data from this audience analysis report:
1. Audience Personas (name, title, description, demographics, pain points, goals, content preferences)
2. Community Insights (sentiment breakdown, top themes, engagement patterns)
3. Content Categories that resonate with this audience`,
      
      performance_report: `Extract the following structured data from this performance analysis report:
1. Content Categories (name, description, typical structure, performance notes)
2. Hashtag Strategy (primary tags, secondary tags, tags to avoid)
3. Engagement patterns and best practices`,
      
      comment_analysis_report: `Extract the following structured data from this comment analysis report:
1. Community Insights (sentiment breakdown, top themes, engagement patterns)
2. Audience feedback themes
3. Common questions or concerns
4. Positive/negative sentiment triggers`,
    };

    const systemPrompt = `You are an expert at extracting structured data from brand analysis reports.
Extract data in a clean, structured JSON format. Only include fields that have actual data in the report.
Be precise and preserve the original language and terminology from the report.
For numeric scores (like tone dimensions), convert descriptive text to 0-100 scales where possible.`;

    const userPrompt = `${extractionPrompts[category] || extractionPrompts.writing_style_report}

Platform Context: ${platformContext || 'universal'}

Report Content:
${fileContent.substring(0, 50000)}`;

    console.log(`Processing ${category} report for user ${user.id}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_report_data",
              description: "Extract structured data from the analysis report",
              parameters: {
                type: "object",
                properties: {
                  voiceArchetypes: {
                    type: "object",
                    properties: {
                      primary: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          characteristics: { type: "array", items: { type: "string" } },
                        },
                      },
                      secondary: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          characteristics: { type: "array", items: { type: "string" } },
                        },
                      },
                      antiArchetypes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            description: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                  toneDimensions: {
                    type: "object",
                    properties: {
                      formality: { type: "number" },
                      energy: { type: "number" },
                      warmth: { type: "number" },
                      confidence: { type: "number" },
                      complexity: { type: "number" },
                    },
                  },
                  signaturePhrases: { type: "array", items: { type: "string" } },
                  vocabularyRules: {
                    type: "object",
                    properties: {
                      preferredTerms: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            term: { type: "string" },
                            context: { type: "string" },
                          },
                        },
                      },
                      avoidTerms: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            term: { type: "string" },
                            reason: { type: "string" },
                          },
                        },
                      },
                      brandSpecificTerms: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            term: { type: "string" },
                            definition: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                  writingConstraints: {
                    type: "object",
                    properties: {
                      hardConstraints: { type: "array", items: { type: "string" } },
                      softGuidelines: { type: "array", items: { type: "string" } },
                      platformSpecific: { type: "object" },
                    },
                  },
                  contentCategories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        typicalStructure: { type: "string" },
                        toneShift: { type: "string" },
                      },
                    },
                  },
                  audiencePersonas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        demographics: { type: "object" },
                        painPoints: { type: "array", items: { type: "string" } },
                        goals: { type: "array", items: { type: "string" } },
                        contentPreferences: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                  communityInsights: {
                    type: "object",
                    properties: {
                      sentimentBreakdown: { type: "object" },
                      topThemes: { type: "array", items: { type: "string" } },
                      engagementPatterns: { type: "array", items: { type: "string" } },
                    },
                  },
                  driftPreventionPrompts: { type: "array", items: { type: "string" } },
                  hashtagStrategy: {
                    type: "object",
                    properties: {
                      primary: { type: "array", items: { type: "string" } },
                      secondary: { type: "array", items: { type: "string" } },
                      avoid: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_report_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    let extractedData: ExtractedData = {};
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Error parsing tool call arguments:", parseError);
      }
    }

    // If fileId provided, update the database record with extracted data
    if (fileId) {
      const { error: updateError } = await supabase
        .from('user_knowledge_file_uploads')
        .update({ extracted_data: extractedData })
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error updating file with extracted data:", updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      extractedData,
      category,
      platformContext,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing analysis report:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});