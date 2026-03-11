import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user has tokens
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("tokens_balance")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription || subscription.tokens_balance < 1) {
      return new Response(
        JSON.stringify({ success: false, error: "Insufficient tokens. Please add more credits." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl, includeCharacter, includeObjects } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing image:", imageUrl);

    // Build the prompt
    let prompt = `Analyze this image as if reverse-engineering an expert-level image prompt. Return ONLY a JSON object with this exact structure, no other text:

{
  "subjectAction": "What is happening in the image - the subject and primary action",
  "setting": "Location, environment, and surroundings",
  "lighting": "Quality, direction, color temperature (in Kelvin if apparent), and lighting mood",
  "camera": "Apparent focal length, aperture, depth of field, camera angle and perspective",
  "composition": "Framing, visual structure, rule of thirds or other compositional techniques",
  "colorPalette": {
    "topColors": [
      {
        "name": "Descriptive color name (e.g., 'Warm Terracotta', 'Deep Navy Blue', 'Sage Green')",
        "hex": "#RRGGBB",
        "hsl": "hsl(H, S%, L%)",
        "percentage": "Approximate percentage of image"
      }
    ],
    "additionalColors": "Brief description of other notable colors and their relationships, color grading"
  },
  "moodStyle": "Overall aesthetic, photographic approach, artistic style or influence"`;

    if (includeCharacter) {
      prompt += `,
  "characterDetails": "For each person: physical appearance, build, facial features, expression, hair, clothing and accessories in detail, pose, body language, distinctive features"`;
    }

    if (includeObjects) {
      prompt += `,
  "objectInventory": "Detailed list of significant objects and elements - people's clothing/accessories, furniture, props, background elements, environmental details. For each: what it is, appearance, position, material, notable details"`;
    }

    prompt += `
}

IMPORTANT for colorPalette:
- Identify the 3 most dominant colors by area coverage in the image
- Provide descriptive, evocative color names (not just "red" but "Crimson Red" or "Burnt Sienna")
- Include accurate hex codes and HSL values for each top color
- Estimate the percentage of the image each top color occupies
- In additionalColors, mention other colors present and describe the overall color relationships

Be detailed and specific in each field.`;

    // Call Lovable AI Gateway with google/gemini-2.5-pro for vision
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response - handle markdown code blocks and extract JSON
    let cleanContent = content.trim();

    // Remove markdown code blocks if present
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Try to find JSON object in the content
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON object found in AI response:", cleanContent.substring(0, 500));
      throw new Error("No valid JSON in AI response");
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response JSON:", jsonMatch[0].substring(0, 500));
      throw new Error("Failed to parse AI analysis");
    }

    // Deduct 1 token from user balance
    const newBalance = subscription.tokens_balance - 1;
    await supabase
      .from("user_subscriptions")
      .update({ tokens_balance: newBalance })
      .eq("user_id", user.id);

    // Log the transaction
    await supabase.from("token_transactions").insert({
      user_id: user.id,
      transaction_type: "api_usage",
      tokens_amount: -1,
      tokens_balance_after: newBalance,
      function_name: "analyze-image",
      description: "Image analysis with AI",
    });

    console.log("Analysis complete for user:", user.id);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
