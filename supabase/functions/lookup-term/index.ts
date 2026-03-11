import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MerriamWebsterDictionaryEntry {
  meta?: { id: string };
  shortdef?: string[];
  fl?: string; // part of speech
}

interface MerriamWebsterThesaurusEntry {
  meta?: { id: string; syns?: string[][] };
  shortdef?: string[];
}

interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  synonyms?: string[];
}

interface FreeDictionaryResponse {
  word: string;
  meanings: FreeDictionaryMeaning[];
}

interface UrbanDictionaryResponse {
  list: Array<{
    definition: string;
    word: string;
    thumbs_up: number;
    thumbs_down: number;
  }>;
}

interface LookupResult {
  definition: string | null;
  source: 'merriam-webster' | 'dictionary' | 'urban' | null;
  synonyms: string[];
  status: 'found' | 'not_found' | 'error';
  error?: string;
}

// Merriam-Webster Dictionary lookup (primary)
async function lookupMerriamWebsterDictionary(term: string): Promise<{ definition: string | null; partOfSpeech: string | null }> {
  const apiKey = Deno.env.get('MERRIAM_WEBSTER_DICTIONARY_KEY');
  if (!apiKey) {
    console.log('MERRIAM_WEBSTER_DICTIONARY_KEY not configured, skipping');
    return { definition: null, partOfSpeech: null };
  }

  try {
    const encodedTerm = encodeURIComponent(term);
    const response = await fetch(
      `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodedTerm}?key=${apiKey}`
    );

    if (!response.ok) {
      console.log(`Merriam-Webster Dictionary API returned ${response.status} for term: ${term}`);
      return { definition: null, partOfSpeech: null };
    }

    const data = await response.json();
    
    // Check if we got actual entries (not suggestions which are strings)
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`No results from Merriam-Webster Dictionary for: ${term}`);
      return { definition: null, partOfSpeech: null };
    }

    // If the first item is a string, these are suggestions, not definitions
    if (typeof data[0] === 'string') {
      console.log(`Merriam-Webster returned suggestions instead of definitions for: ${term}`);
      return { definition: null, partOfSpeech: null };
    }

    const entry = data[0] as MerriamWebsterDictionaryEntry;
    if (entry.shortdef && entry.shortdef.length > 0) {
      console.log(`Found in Merriam-Webster Dictionary: ${term}`);
      return { 
        definition: entry.shortdef[0], 
        partOfSpeech: entry.fl || null 
      };
    }

    return { definition: null, partOfSpeech: null };
  } catch (error) {
    console.error('Merriam-Webster Dictionary lookup error:', error);
    return { definition: null, partOfSpeech: null };
  }
}

// Merriam-Webster Thesaurus lookup (primary for synonyms)
async function lookupMerriamWebsterThesaurus(term: string): Promise<string[]> {
  const apiKey = Deno.env.get('MERRIAM_WEBSTER_THESAURUS_KEY');
  if (!apiKey) {
    console.log('MERRIAM_WEBSTER_THESAURUS_KEY not configured, skipping');
    return [];
  }

  try {
    const encodedTerm = encodeURIComponent(term);
    const response = await fetch(
      `https://dictionaryapi.com/api/v3/references/thesaurus/json/${encodedTerm}?key=${apiKey}`
    );

    if (!response.ok) {
      console.log(`Merriam-Webster Thesaurus API returned ${response.status} for term: ${term}`);
      return [];
    }

    const data = await response.json();
    
    // Check if we got actual entries (not suggestions)
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`No results from Merriam-Webster Thesaurus for: ${term}`);
      return [];
    }

    // If the first item is a string, these are suggestions, not entries
    if (typeof data[0] === 'string') {
      console.log(`Merriam-Webster Thesaurus returned suggestions instead of synonyms for: ${term}`);
      return [];
    }

    const entry = data[0] as MerriamWebsterThesaurusEntry;
    if (entry.meta?.syns && entry.meta.syns.length > 0) {
      // Flatten the first few synonym groups and take up to 10
      const synonyms = entry.meta.syns.flat().slice(0, 10);
      console.log(`Found ${synonyms.length} synonyms in Merriam-Webster Thesaurus for: ${term}`);
      return synonyms;
    }

    return [];
  } catch (error) {
    console.error('Merriam-Webster Thesaurus lookup error:', error);
    return [];
  }
}

// Free Dictionary API lookup (fallback)
async function lookupFreeDictionary(term: string): Promise<{ definition: string | null; synonyms: string[] }> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`);
    
    if (!response.ok) {
      console.log(`Free Dictionary API returned ${response.status} for term: ${term}`);
      return { definition: null, synonyms: [] };
    }

    const data = await response.json() as FreeDictionaryResponse[];
    
    if (!data || data.length === 0) {
      return { definition: null, synonyms: [] };
    }

    // Extract first definition
    let definition: string | null = null;
    const synonyms: Set<string> = new Set();

    for (const entry of data) {
      for (const meaning of entry.meanings) {
        // Get first definition if we don't have one yet
        if (!definition && meaning.definitions.length > 0) {
          definition = meaning.definitions[0].definition;
        }

        // Collect synonyms from meaning level
        if (meaning.synonyms) {
          meaning.synonyms.forEach(s => synonyms.add(s.toLowerCase()));
        }

        // Collect synonyms from definition level
        for (const def of meaning.definitions) {
          if (def.synonyms) {
            def.synonyms.forEach(s => synonyms.add(s.toLowerCase()));
          }
        }
      }
    }

    if (definition) {
      console.log(`Found in Free Dictionary: ${term}`);
    }

    return {
      definition,
      synonyms: Array.from(synonyms).slice(0, 10),
    };
  } catch (error) {
    console.error('Free Dictionary lookup error:', error);
    return { definition: null, synonyms: [] };
  }
}

// Urban Dictionary lookup (last resort fallback)
async function lookupUrbanDictionary(term: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
    
    if (!response.ok) {
      console.log(`Urban Dictionary API returned ${response.status} for term: ${term}`);
      return null;
    }

    const data = await response.json() as UrbanDictionaryResponse;
    
    if (!data.list || data.list.length === 0) {
      return null;
    }

    // Sort by thumbs_up - thumbs_down and get the best definition
    const sorted = data.list.sort((a, b) => 
      (b.thumbs_up - b.thumbs_down) - (a.thumbs_up - a.thumbs_down)
    );

    // Clean up Urban Dictionary formatting (remove brackets)
    let definition = sorted[0].definition;
    definition = definition.replace(/\[|\]/g, '');
    
    // Truncate if too long
    if (definition.length > 500) {
      definition = definition.substring(0, 497) + '...';
    }

    console.log(`Found in Urban Dictionary: ${term}`);
    return definition;
  } catch (error) {
    console.error('Urban Dictionary lookup error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { term } = await req.json();

    if (!term || typeof term !== 'string') {
      return new Response(
        JSON.stringify({ 
          definition: null, 
          source: null, 
          synonyms: [], 
          status: 'error',
          error: 'Term is required' 
        } as LookupResult),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const cleanTerm = term.trim().toLowerCase();
    console.log(`Looking up term: ${cleanTerm}`);

    // Step 1: Try Merriam-Webster Dictionary and Thesaurus (parallel)
    const [mwDictResult, mwThesaurusResult] = await Promise.all([
      lookupMerriamWebsterDictionary(cleanTerm),
      lookupMerriamWebsterThesaurus(cleanTerm)
    ]);

    if (mwDictResult.definition) {
      console.log(`Returning Merriam-Webster result for: ${cleanTerm}`);
      return new Response(
        JSON.stringify({
          definition: mwDictResult.definition,
          source: 'merriam-webster',
          synonyms: mwThesaurusResult,
          status: 'found',
        } as LookupResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fallback to Free Dictionary API
    console.log(`Not found in Merriam-Webster, trying Free Dictionary: ${cleanTerm}`);
    const dictionaryResult = await lookupFreeDictionary(cleanTerm);

    if (dictionaryResult.definition) {
      console.log(`Returning Free Dictionary result for: ${cleanTerm}`);
      return new Response(
        JSON.stringify({
          definition: dictionaryResult.definition,
          source: 'dictionary',
          synonyms: dictionaryResult.synonyms,
          status: 'found',
        } as LookupResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Last resort - Urban Dictionary
    console.log(`Not found in Free Dictionary, trying Urban Dictionary: ${cleanTerm}`);
    const urbanDefinition = await lookupUrbanDictionary(cleanTerm);

    if (urbanDefinition) {
      console.log(`Returning Urban Dictionary result for: ${cleanTerm}`);
      return new Response(
        JSON.stringify({
          definition: urbanDefinition,
          source: 'urban',
          synonyms: [], // Urban Dictionary doesn't provide synonyms
          status: 'found',
        } as LookupResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Not found in any dictionary
    console.log(`Term not found in any dictionary: ${cleanTerm}`);
    return new Response(
      JSON.stringify({
        definition: null,
        source: null,
        synonyms: [],
        status: 'not_found',
      } as LookupResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Lookup error:', error);
    return new Response(
      JSON.stringify({ 
        definition: null, 
        source: null, 
        synonyms: [], 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as LookupResult),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
