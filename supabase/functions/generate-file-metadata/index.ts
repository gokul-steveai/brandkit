import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName, fileType } = await req.json();
    
    if (!fileContent) {
      throw new Error('File content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Truncate content if too long (keep under ~8000 tokens worth)
    const truncatedContent = fileContent.substring(0, 20000);

    const systemPrompt = `You are a metadata extraction assistant. Analyze the provided document content and extract structured metadata.

IMPORTANT RULES:
1. Only fill in fields where you have HIGH CONFIDENCE based on the content
2. If you're not sure about a field, leave it as null or empty
3. DO NOT GUESS or make assumptions
4. Tags should be specific and relevant keywords found in the document
5. Description should be a brief, factual summary of what the document contains

Return a JSON object with these fields:
- title: string (document title if clearly stated, otherwise derive from content)
- description: string (1-2 sentence summary of the document's purpose)
- tags: string[] (3-7 relevant keywords/topics)
- department: string | null (organizational department if mentioned)
- sensitivity: "Internal" | "Public" | "Confidential" | null (based on content nature)
- audience: string | null (intended readers if mentioned)
- source: string | null (where the document came from if mentioned)
- attribution: string | null (author/creator if mentioned)
- related_projects: string[] (related projects/initiatives if mentioned)`;

    const userPrompt = `Analyze this ${fileType} document named "${fileName}" and extract metadata:

---
${truncatedContent}
---

Return ONLY a valid JSON object with the metadata. Do not include any explanation or markdown formatting.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let metadata;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      metadata = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return default metadata if parsing fails
      metadata = {
        title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        description: null,
        tags: [],
        department: null,
        sensitivity: 'Internal',
        audience: null,
        source: null,
        attribution: null,
        related_projects: [],
      };
    }

    // Ensure all expected fields exist with proper defaults
    const normalizedMetadata = {
      title: metadata.title || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      description: metadata.description || null,
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      department: metadata.department || null,
      sensitivity: ['Internal', 'Public', 'Confidential'].includes(metadata.sensitivity) 
        ? metadata.sensitivity 
        : 'Internal',
      audience: metadata.audience || null,
      source: metadata.source || null,
      attribution: metadata.attribution || null,
      related_projects: Array.isArray(metadata.related_projects) ? metadata.related_projects : [],
    };

    console.log('Generated metadata:', normalizedMetadata);

    return new Response(JSON.stringify({ metadata: normalizedMetadata }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-file-metadata:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
