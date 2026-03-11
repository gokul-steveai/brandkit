import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PAGES = 25;

// ========== SECURITY: INPUT VALIDATION ==========
function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function verifyBrandKitOwnership(
  supabase: any,
  brandKitId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("brand_kits")
    .select("user_id")
    .eq("id", brandKitId)
    .single();

  if (error || !data) return false;
  return data.user_id === userId;
}

// Generate random UUID for storage paths
function generateRandomId(): string {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brandKitId, pdfUrl, fileName } = await req.json();

    if (!brandKitId || !pdfUrl || !fileName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: brandKitId, pdfUrl, fileName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate brandKitId format
    if (!isValidUUID(brandKitId)) {
      return new Response(JSON.stringify({ error: 'Invalid brand kit ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Verify brand kit ownership before processing
    const isOwner = await verifyBrandKitOwnership(supabase, brandKitId, user.id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Not authorized to access this brand kit' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing PDF for brand kit: ${brandKitId}`);

    // Fetch the PDF from URL
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch PDF from URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfSize = pdfBuffer.byteLength;

    // Validate file size
    if (pdfSize > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: `File size (${(pdfSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 5MB` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Use Lovable AI (Gemini) to transcribe the PDF to HTML
    console.log('Sending PDF to Lovable AI for transcription...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a document transcription assistant. Your task is to convert PDF documents into clean, semantic HTML.

Instructions:
1. First, count the number of pages in the PDF. If it exceeds ${MAX_PAGES} pages, respond with ONLY: "PAGE_LIMIT_EXCEEDED:{actual_page_count}"
2. If within limit, transcribe the entire document content to HTML
3. Preserve the document structure: headings, paragraphs, lists, tables
4. Use semantic HTML tags: <h1>-<h6>, <p>, <ul>, <ol>, <li>, <table>, <tr>, <td>, <th>, <blockquote>
5. Preserve any emphasis: <strong>, <em>
6. Do NOT include <html>, <head>, or <body> tags - just the content
7. Do NOT include any CSS or JavaScript
8. Maintain the original text content exactly as it appears

Output ONLY the HTML content, no explanations or markdown code blocks.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please transcribe this PDF document to HTML, preserving the layout and formatting.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI processing failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const htmlContent = aiData.choices?.[0]?.message?.content;

    if (!htmlContent) {
      return new Response(JSON.stringify({ error: 'No content generated from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if page limit was exceeded
    if (htmlContent.startsWith('PAGE_LIMIT_EXCEEDED:')) {
      const pageCount = htmlContent.split(':')[1];
      return new Response(JSON.stringify({ 
        error: `Document has ${pageCount} pages, which exceeds the maximum of ${MAX_PAGES} pages` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI transcription complete, uploading files to storage...');

    // Sanitize filename for storage path
    const sanitizedName = fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // SECURITY: Use random UUID in path instead of predictable user ID
    const randomId = generateRandomId();
    const basePath = `${brandKitId}/${randomId}/${sanitizedName}`;

    // Upload original PDF
    const { error: pdfUploadError } = await supabase.storage
      .from('knowledge_files')
      .upload(`${basePath}/original.pdf`, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (pdfUploadError) {
      console.error('PDF upload error:', pdfUploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload PDF' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload HTML transcription
    const htmlBytes = new TextEncoder().encode(htmlContent);
    const { error: htmlUploadError } = await supabase.storage
      .from('knowledge_files')
      .upload(`${basePath}/transcribed.html`, htmlBytes, {
        contentType: 'text/html',
        upsert: true,
      });

    if (htmlUploadError) {
      console.error('HTML upload error:', htmlUploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload HTML' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URLs
    const { data: pdfUrlData } = supabase.storage
      .from('knowledge_files')
      .getPublicUrl(`${basePath}/original.pdf`);

    const { data: htmlUrlData } = supabase.storage
      .from('knowledge_files')
      .getPublicUrl(`${basePath}/transcribed.html`);

    console.log('Files uploaded successfully');

    return new Response(JSON.stringify({
      success: true,
      pdfUrl: pdfUrlData.publicUrl,
      htmlUrl: htmlUrlData.publicUrl,
      storagePath: basePath,
      fileName: sanitizedName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing knowledge file:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
