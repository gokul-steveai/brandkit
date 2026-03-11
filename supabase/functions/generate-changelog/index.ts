import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const systemPrompt = `You are a changelog writer for Brand Kit OS. Generate well-formatted, medium-detail changelog entries.

CONTENT TEMPLATE:
## 🚀 What's [New/Improved/Changed]

Brief 1-2 sentence overview of the update.

## ✨ Key Features

### Feature Name
Description with context on what it does and why it matters.

- **Bold key terms** for scannability
- Use bullet points for lists
- Include code snippets in backticks if relevant

### Another Feature
More details...

## 📍 How to Use

Step-by-step or explanation of how users can access/use this feature.

## 📚 Learn More

[Link to documentation](/docs/relevant-page) for detailed information.

---

FORMATTING RULES:
1. Use emojis sparingly but effectively at the start of h2 headings only:
   - 🚀 for "What's New" sections
   - ✨ for "Key Features" sections
   - 📍 for "How to Use" sections
   - 📚 for "Learn More" sections
   - 🔧 for technical improvements
   - 🎨 for UI/design changes
   - 🐛 for bug fixes
   - ⚠️ for deprecations/retired features
2. Use proper heading hierarchy (h2 for sections, h3 for subsections)
3. **Bold** important terms and feature names
4. Include relevant links to documentation pages when applicable
5. Keep paragraphs short (2-3 sentences max) and scannable
6. Use bullet points and numbered lists where appropriate
7. Medium detail level - provide enough context without overwhelming
8. For "Learn More" links, use relative paths like /docs/feature-name
9. Do NOT use emojis in h3 headings or body text, only in h2 headings
10. Do NOT include the title in the content - it will be displayed separately`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { changes, entryType, title } = await req.json();

    if (!changes || !entryType || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: changes, entryType, title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating changelog content for:', title);

    const userPrompt = `Generate a changelog entry for the following update:

Title: ${title}
Type: ${entryType === 'new_release' ? 'New Release' : entryType === 'improvement' ? 'Improvement' : 'Retired Feature'}

Changes/Details:
${changes}

Generate well-formatted markdown content following the template. Do NOT include the title as an h1 heading - start directly with the h2 sections.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    // Generate a summary from the content (first paragraph after removing heading)
    const summaryMatch = content.match(/^##[^\n]+\n+([^\n#]+)/);
    const summary = summaryMatch 
      ? summaryMatch[1].trim().slice(0, 200) 
      : title;

    // Estimate read time (average 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    console.log('Successfully generated changelog content');

    return new Response(
      JSON.stringify({ 
        content,
        summary,
        readTimeMinutes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating changelog:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
