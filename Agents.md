# Agents.md - Brand Kit Builder

> **Purpose**: This document provides comprehensive context for AI coding assistants (Lovable, Cursor) working on the Brand Kit Builder project. It documents the application architecture, database schema, existing agents, planned agents, and coding conventions.
> 
> **Cross-Platform Compatibility**: Instructions in this document are designed to work with both Lovable and Cursor AI assistants.
> 
> **Last Updated**: December 2024

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Infrastructure Agent](#2-infrastructure-agent)
3. [Brand Extraction Agent](#3-brand-extraction-agent)
4. [Brand Analysis Agent (Planned)](#4-brand-analysis-agent-planned)
5. [Competitor Analysis Agent (Planned)](#5-competitor-analysis-agent-planned)
6. [Export & Share Agent (Planned)](#6-export--share-agent-planned)
7. [Coding Standards](#7-coding-standards)
8. [Secrets & Configuration](#8-secrets--configuration)
9. [Quick Reference](#9-quick-reference)

---

## 1. Project Overview

### 1.1 Application Name
**Brand Kit Builder**

### 1.2 Purpose
A web application for managing brand identity, extracting brand information from websites, and generating consistent brand content. The platform provides a centralized location for brand identity management with AI-powered extraction and analysis capabilities.

### 1.3 Core Value Proposition
- Centralized brand identity management
- AI-powered brand extraction from websites
- Brand consistency analysis and scoring
- Competitor intelligence and comparison
- Platform-specific exports for AI tools and content platforms

### 1.4 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Radix UI |
| State Management | TanStack Query (React Query) |
| Routing | React Router v6 |
| Backend | Supabase (via Lovable Cloud) |
| Edge Functions | Deno runtime |
| Authentication | Supabase Auth |
| Database | PostgreSQL (Supabase) |
| File Storage | Supabase Storage |

### 1.5 Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.87.1",
  "@tanstack/react-query": "^5.83.0",
  "react-router-dom": "^6.30.1",
  "react-hook-form": "^7.61.1",
  "zod": "^3.25.76",
  "sonner": "^1.7.4",
  "lucide-react": "^0.462.0"
}
```

### 1.6 Core Entities

```
┌─────────────────┐
│   brand_kits    │ (Main entity - contains all brand identity fields)
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  core  │ │personal│ │express │ │products│ │audience│ │govern  │
│        │ │  ity   │ │  ion   │ │        │ │        │ │  ance  │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

---

## 2. Infrastructure Agent

> **Purpose**: Understands the tech stack of the platform, database structure, integrations, and edge functions. Provides context for all other agents.

### 2.1 Database Schema

#### 2.1.1 Main Tables

##### `brand_kits` (Primary Table)
The main entity containing all brand identity fields.

```sql
-- Core identification
id UUID PRIMARY KEY
user_id UUID NOT NULL
name TEXT NOT NULL
description TEXT
website_url TEXT
status TEXT DEFAULT 'draft' -- 'draft', 'active', 'archived'
completion_percentage INTEGER DEFAULT 0

-- Colors (all stored as hex strings)
primary_color TEXT
secondary_color TEXT
accent_color TEXT
background_color TEXT
text_primary_color TEXT
text_secondary_color TEXT
link_color TEXT
color_scheme TEXT

-- Typography
heading_font TEXT
body_font TEXT
paragraph_font TEXT
font_sizes JSONB
font_weights JSONB
fonts_list JSONB -- Array of FontInfo objects

-- Visual Components
button_styles JSONB -- { primary: ButtonStyle, secondary: ButtonStyle }
input_styles JSONB
spacing JSONB -- { paddingScale, marginScale, gapScale, borderRadius }
icon_style TEXT

-- Brand Identity
brand_voice TEXT
tagline TEXT
brand_essence TEXT
mission_statement TEXT
vision_statement TEXT

-- Assets
logo_url TEXT
favicon_url TEXT
og_image_url TEXT

-- Content
summary TEXT

-- Timestamps
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

**Actual Code Snippet - BrandKit TypeScript Interface:**

```typescript
// From src/integrations/supabase/types.ts
export interface BrandKit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  status: string | null;
  completion_percentage: number | null;
  
  // Colors
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_primary_color: string | null;
  text_secondary_color: string | null;
  link_color: string | null;
  color_scheme: string | null;
  
  // Typography
  heading_font: string | null;
  body_font: string | null;
  paragraph_font: string | null;
  font_sizes: Json | null;
  font_weights: Json | null;
  fonts_list: Json | null;
  
  // Visual Components
  button_styles: Json | null;
  input_styles: Json | null;
  spacing: Json | null;
  icon_style: string | null;
  
  // Brand Identity
  brand_voice: string | null;
  tagline: string | null;
  brand_essence: string | null;
  mission_statement: string | null;
  vision_statement: string | null;
  
  // Assets
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  
  // Content
  summary: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}
```

##### `brand_kit_core`
Extended core brand information (mission, vision, story, promises).

```sql
id UUID PRIMARY KEY
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE
mission_statement TEXT
vision_statement TEXT
brand_story TEXT
brand_promises JSONB -- Array of promise objects
unique_value_proposition TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

##### `brand_kit_personality`
Brand personality traits, values, principles, and moods.

```sql
id UUID PRIMARY KEY
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE
personality_traits JSONB -- Array of trait objects with name, description, intensity
brand_values JSONB -- Array of value objects
brand_principles JSONB -- Array of principle objects
brand_moods JSONB -- Array of mood objects with visual_descriptor
archetype TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

##### `brand_kit_expression`
How the brand expresses itself verbally and visually.

```sql
id UUID PRIMARY KEY
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE
verbal_style JSONB
tone_of_voice JSONB
visual_style JSONB
messaging_framework JSONB
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

##### `brand_kit_governance`
Brand usage guidelines and constraints.

```sql
id UUID PRIMARY KEY
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE
usage_guidelines JSONB
brand_constraints JSONB
approval_workflows JSONB
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

##### `brand_kit_products`
Products and services catalog.

```sql
id UUID PRIMARY KEY
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE
name TEXT NOT NULL
description TEXT
category TEXT
unique_selling_points JSONB
target_audience TEXT
pricing_tier TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

##### `brand_kit_target_audience`
Target audience personas and demographics.

```sql
id UUID PRIMARY KEY
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE
persona_name TEXT
demographics JSONB
psychographics JSONB
pain_points JSONB
goals JSONB
behaviors JSONB
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

#### 2.1.2 Library Tables (Pre-defined Options)

These tables provide pre-defined options for selection in the UI:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `library_personality_traits` | Pre-defined personality traits | name, description, category |
| `library_brand_values` | Pre-defined brand values | name, description, category |
| `library_brand_principles` | Pre-defined brand principles | name, description |
| `library_brand_moods` | Pre-defined brand moods | name, description, visual_descriptor |
| `categories` | Brand categories | name, description |
| `industry_classifications` | Industry types | name, description |

#### 2.1.3 Authentication Tables

##### `profiles`
Extended user profile information.

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
display_name TEXT
avatar_url TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

##### `user_roles`
Role-based access control.

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
role app_role NOT NULL -- 'viewer', 'author', 'admin'
created_at TIMESTAMPTZ DEFAULT now()
```

### 2.2 Role-Based Access Control

#### 2.2.1 Roles

| Role | Description |
|------|-------------|
| `viewer` | Can view brand kits but cannot create, edit, or delete |
| `author` | Can create, edit, and delete their own brand kits |
| `admin` | Full access to all brand kits and administrative functions |

#### 2.2.2 Permission Checks

**Actual Code Snippet - Permission Logic:**

```typescript
// From src/contexts/AuthContext.tsx
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const role = context.role;
  const canCreate = role === 'author' || role === 'admin';
  const canEdit = role === 'author' || role === 'admin';
  const canDelete = role === 'author' || role === 'admin';
  const isAdmin = role === 'admin';

  return {
    ...context,
    canCreate,
    canEdit,
    canDelete,
    isAdmin,
  };
}
```

#### 2.2.3 RLS Policies

All tables have Row Level Security (RLS) enabled with policies ensuring:
- Users can only access their own brand kits
- Admins can access all brand kits
- Library tables are publicly readable

### 2.3 Edge Functions

#### 2.3.1 Current Edge Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `firecrawl-scrape` | Extract brand information from websites | Active |

#### 2.3.2 Edge Function Structure

All edge functions follow this pattern:

**Actual Code Snippet - Edge Function Template:**

```typescript
// supabase/functions/[function-name]/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { param1, param2 } = await req.json();
    
    // Validate required inputs
    if (!param1) {
      return new Response(
        JSON.stringify({ success: false, error: 'param1 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables/secrets
    const apiKey = Deno.env.get('API_KEY');
    if (!apiKey) {
      console.error('API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client if needed
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Main business logic
    const result = await performOperation();

    // Return success response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2.4 File Structure

```
brand-kit-builder/
├── src/
│   ├── components/
│   │   ├── brand-kit/
│   │   │   ├── overview/          # Overview page components
│   │   │   ├── core/              # Core section (mission, vision, story)
│   │   │   │   ├── CorePage.tsx
│   │   │   │   └── BrandPromisesCard.tsx
│   │   │   ├── personality/       # Personality section
│   │   │   │   ├── PersonalityEditor.tsx
│   │   │   │   ├── PersonalityTraitsCard.tsx
│   │   │   │   ├── BrandValuesCard.tsx
│   │   │   │   ├── BrandPrinciplesCard.tsx
│   │   │   │   ├── BrandMoodsCard.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── EditableCard.tsx
│   │   │   │       ├── LibraryDropdownSelector.tsx
│   │   │   │       └── types.ts
│   │   │   ├── expression/        # Expression section
│   │   │   ├── products/          # Products section
│   │   │   ├── audience/          # Target audience section
│   │   │   ├── governance/        # Governance section
│   │   │   ├── dashboard/         # Dashboard cards and dialogs
│   │   │   │   ├── BrandKitCard.tsx
│   │   │   │   └── CreateBrandKitDialog.tsx
│   │   │   ├── shared/            # Shared brand-kit components
│   │   │   │   ├── EditLayout.tsx
│   │   │   │   └── LibrarySelector.tsx
│   │   │   └── pages/
│   │   │       └── index.tsx      # Page exports
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   └── NavLink.tsx
│   │   ├── landing/               # Landing page sections
│   │   │   ├── HeroSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   └── ...
│   │   └── ui/                    # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── ...
│   ├── hooks/
│   │   ├── useBrandKits.ts        # Brand kit CRUD operations
│   │   ├── useAutoSave.ts         # Auto-save functionality
│   │   ├── useMobile.tsx          # Mobile detection
│   │   └── useToast.ts            # Toast notifications
│   ├── lib/
│   │   ├── api/
│   │   │   └── firecrawl.ts       # Firecrawl API client
│   │   └── utils.ts               # Utility functions (cn, etc.)
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication context
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client (auto-generated)
│   │       └── types.ts           # Database types (auto-generated)
│   ├── pages/
│   │   ├── Index.tsx              # Landing page
│   │   ├── Auth.tsx               # Authentication page
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── BrandKitDetail.tsx     # Brand kit detail/edit
│   │   ├── Settings.tsx           # User settings
│   │   └── NotFound.tsx           # 404 page
│   ├── App.tsx                    # Main app with routing
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── supabase/
│   ├── functions/
│   │   └── firecrawl-scrape/
│   │       └── index.ts           # Brand extraction edge function
│   ├── migrations/                # Database migrations (read-only)
│   └── config.toml                # Supabase configuration (auto-managed)
├── public/
│   └── ...
├── Agents.md                      # This file
└── README.md
```

### 2.5 Custom Hooks

#### 2.5.1 useBrandKits

**Actual Code Snippet - useBrandKits Hook:**

```typescript
// From src/hooks/useBrandKits.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useBrandKits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all brand kits for the current user
  const { data: brandKits, isLoading, error } = useQuery({
    queryKey: ["brand-kits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create a new brand kit
  const createBrandKit = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("brand_kits")
        .insert({
          name: input.name,
          description: input.description,
          user_id: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-kits"] });
      toast.success("Brand kit created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create brand kit");
      console.error(error);
    },
  });

  // Update an existing brand kit
  const updateBrandKit = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<BrandKit>) => {
      const { data, error } = await supabase
        .from("brand_kits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-kits"] });
    },
  });

  // Delete a brand kit
  const deleteBrandKit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("brand_kits")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-kits"] });
      toast.success("Brand kit deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete brand kit");
      console.error(error);
    },
  });

  return {
    brandKits,
    isLoading,
    error,
    createBrandKit: createBrandKit.mutateAsync,
    updateBrandKit: updateBrandKit.mutateAsync,
    deleteBrandKit: deleteBrandKit.mutateAsync,
    isCreating: createBrandKit.isPending,
    isUpdating: updateBrandKit.isPending,
    isDeleting: deleteBrandKit.isPending,
  };
}
```

#### 2.5.2 useAutoSave

**Actual Code Snippet - useAutoSave Hook:**

```typescript
// From src/hooks/useAutoSave.ts
import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { debounce } from '@/lib/utils';

interface UseAutoSaveOptions {
  tableName: string;
  brandKitId: string;
  onSuccess?: () => void;
}

export function useAutoSave<T extends Record<string, any>>({ 
  tableName, 
  brandKitId,
  onSuccess 
}: UseAutoSaveOptions) {
  const queryClient = useQueryClient();
  const toastIdRef = useRef<string | number | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: Partial<T>) => {
      const { error } = await supabase
        .from(tableName)
        .upsert({
          brand_kit_id: brandKitId,
          ...data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'brand_kit_id',
        });
      
      if (error) throw error;
    },
    onMutate: () => {
      // Show saving indicator
      toastIdRef.current = toast.loading('Saving...', { duration: Infinity });
    },
    onSuccess: () => {
      // Dismiss loading toast and show success
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toast.success('Saved', { duration: 1500 });
      queryClient.invalidateQueries({ queryKey: [tableName, brandKitId] });
      onSuccess?.();
    },
    onError: (error) => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toast.error('Failed to save changes');
      console.error('Auto-save error:', error);
    },
  });

  // Debounced save function - waits 1 second after last change
  const debouncedSave = useCallback(
    debounce((data: Partial<T>) => {
      mutation.mutate(data);
    }, 1000),
    [mutation]
  );

  return {
    save: debouncedSave,
    saveImmediately: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
```

---

## 3. Brand Extraction Agent

> **Purpose**: Extract brand identity information from websites using the Firecrawl API. This agent scrapes websites and transforms the extracted data into the brand kit data structure.

### 3.1 Current Implementation

#### 3.1.1 Overview

| Aspect | Detail |
|--------|--------|
| Service | Firecrawl API (v1) |
| Endpoint | `https://api.firecrawl.dev/v1/scrape` |
| Edge Function | `supabase/functions/firecrawl-scrape/index.ts` |
| Client API | `src/lib/api/firecrawl.ts` |
| Storage | Raw scrapes saved to `firecrawl-scrapes` bucket |

#### 3.1.2 Edge Function Implementation

**Actual Code Snippet - Firecrawl Edge Function:**

```typescript
// supabase/functions/firecrawl-scrape/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, options, brandKitId } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = `https://${url}`;
    }

    console.log('Scraping URL:', formattedUrl);

    // Call Firecrawl API
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: options?.formats || ['branding', 'summary'],
        onlyMainContent: options?.onlyMainContent ?? true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firecrawl API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Firecrawl API error: ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Firecrawl response received');

    // Optionally save raw scrape to storage
    let rawScrapePath = null;
    if (brandKitId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${brandKitId}/${timestamp}.json`;

      const { error: uploadError } = await supabase.storage
        .from('firecrawl-scrapes')
        .upload(fileName, JSON.stringify(data, null, 2), {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadError) {
        console.error('Failed to save raw scrape:', uploadError);
      } else {
        rawScrapePath = fileName;
        console.log('Raw scrape saved to:', rawScrapePath);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data.data,
        rawScrapePath 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 3.1.3 Client API Implementation

**Actual Code Snippet - Firecrawl Client API:**

```typescript
// src/lib/api/firecrawl.ts
import { supabase } from "@/integrations/supabase/client";

export interface ExtractedBrandData {
  // Basic Info
  name?: string;
  description?: string;
  summary?: string;
  
  // Colors
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_primary_color?: string;
  text_secondary_color?: string;
  link_color?: string;
  color_scheme?: string;
  
  // Typography
  heading_font?: string;
  body_font?: string;
  paragraph_font?: string;
  font_sizes?: Record<string, string>;
  font_weights?: Record<string, number>;
  fonts_list?: FontInfo[];
  
  // Components
  button_styles?: {
    primary?: ButtonStyle;
    secondary?: ButtonStyle;
  };
  input_styles?: InputStyle;
  spacing?: SpacingInfo;
  
  // Personality (from Firecrawl branding analysis)
  personality?: {
    traits?: string[];
    tone?: string;
    voice?: string;
  };
  
  // Assets
  logo_url?: string;
  favicon_url?: string;
  og_image_url?: string;
  
  // Raw data reference
  raw_scrape_path?: string;
}

interface FontInfo {
  family: string;
  weights: number[];
  styles: string[];
  source?: string;
}

interface ButtonStyle {
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  padding?: string;
  fontWeight?: number;
}

interface InputStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: string;
  padding?: string;
}

interface SpacingInfo {
  paddingScale?: string[];
  marginScale?: string[];
  gapScale?: string[];
  borderRadius?: string;
}

export const firecrawlApi = {
  /**
   * Extract brand information from a website URL
   * @param url - The website URL to scrape
   * @param brandKitId - Optional brand kit ID to associate and save raw scrape
   * @returns Transformed brand data ready for insertion
   */
  async extractBrand(url: string, brandKitId?: string): Promise<{
    success: boolean;
    data?: ExtractedBrandData;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { 
          url, 
          brandKitId,
          options: { 
            formats: ['branding', 'summary'],
            onlyMainContent: true 
          } 
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown error' };
      }

      // Transform Firecrawl response to ExtractedBrandData
      const rawData = data.data;
      const branding = rawData?.branding;
      const metadata = rawData?.metadata;

      const brandData: ExtractedBrandData = {
        // Basic info from metadata
        name: metadata?.title || metadata?.ogTitle,
        description: metadata?.description || metadata?.ogDescription,
        summary: rawData?.summary,
        
        // Colors from branding
        primary_color: branding?.colors?.primary,
        secondary_color: branding?.colors?.secondary,
        accent_color: branding?.colors?.accent,
        background_color: branding?.colors?.background,
        text_primary_color: branding?.colors?.textPrimary,
        text_secondary_color: branding?.colors?.textSecondary,
        link_color: branding?.colors?.link,
        color_scheme: branding?.colors?.scheme,
        
        // Typography from branding
        heading_font: branding?.typography?.fontFamilies?.heading,
        body_font: branding?.typography?.fontFamilies?.body,
        paragraph_font: branding?.typography?.fontFamilies?.paragraph,
        font_sizes: branding?.typography?.fontSizes,
        font_weights: branding?.typography?.fontWeights,
        fonts_list: branding?.typography?.fonts,
        
        // Component styles
        button_styles: branding?.components?.buttons,
        input_styles: branding?.components?.inputs,
        spacing: branding?.spacing,
        
        // Personality analysis
        personality: branding?.personality,
        
        // Assets
        logo_url: branding?.images?.logo || metadata?.ogImage,
        favicon_url: metadata?.favicon,
        og_image_url: metadata?.ogImage,
        
        // Reference to raw scrape
        raw_scrape_path: data.rawScrapePath,
      };

      return { success: true, data: brandData };
      
    } catch (error) {
      console.error('Firecrawl API error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Apply extracted brand data to an existing brand kit
   * @param brandKitId - The brand kit to update
   * @param brandData - The extracted brand data
   * @param options - Merge options (overwrite or preserve existing)
   */
  async applyToBrandKit(
    brandKitId: string, 
    brandData: ExtractedBrandData,
    options: { overwriteExisting?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Build update object, optionally filtering out null values if not overwriting
      const updates: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(brandData)) {
        if (value !== undefined && value !== null) {
          updates[key] = value;
        }
      }

      const { error } = await supabase
        .from('brand_kits')
        .update(updates)
        .eq('id', brandKitId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Apply to brand kit error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};
```

### 3.2 Future Roadmap

#### 3.2.1 Social Media Extraction
- **Twitter/X**: Profile branding, tweet tone analysis, visual themes
- **LinkedIn**: Company page branding, content voice analysis
- **Instagram**: Visual style extraction, color palettes, mood analysis
- **Facebook**: Brand page styling, content patterns

#### 3.2.2 Multi-Page Crawling
- About page for mission/vision extraction
- Products/Services pages for offerings
- Blog posts for voice/tone analysis
- Team page for culture insights

#### 3.2.3 Deep Content Extraction
- Customer testimonials
- Case studies
- Press releases
- FAQ content

#### 3.2.4 Document Extraction
- PDF brand guidelines parsing
- Design system documentation
- Marketing collateral analysis

---

## 4. Brand Analysis Agent (Planned)

> **Purpose**: Score and analyze brand consistency across all brand identity fields and content samples. Provides actionable recommendations for improving brand coherence.

### 4.1 Overview

| Aspect | Detail |
|--------|--------|
| AI Provider | Lovable AI (google/gemini-2.5-flash) |
| Edge Function | `supabase/functions/analyze-brand/index.ts` (planned) |
| Input | Brand kit data, content samples, social media posts |
| Output | Structured analysis with scores and recommendations |

### 4.2 Scoring Categories

#### 4.2.1 Visual Consistency (30%)
- **Color Usage**: Are brand colors used consistently?
- **Typography**: Is font usage aligned with brand guidelines?
- **Logo Placement**: Is the logo used correctly?
- **Imagery Style**: Does visual content match brand mood?

#### 4.2.2 Voice Consistency (25%)
- **Tone Alignment**: Does content match defined tone of voice?
- **Vocabulary**: Is brand-specific terminology used correctly?
- **Sentence Structure**: Does writing style match brand personality?
- **Formality Level**: Is formality consistent with brand voice?

#### 4.2.3 Message Consistency (25%)
- **Value Proposition**: Is the core value communicated clearly?
- **Promise Delivery**: Are brand promises reflected in content?
- **Story Coherence**: Is brand narrative maintained?
- **Differentiation**: Are unique selling points highlighted?

#### 4.2.4 Identity Alignment (20%)
- **Personality Traits**: Does content reflect stated personality?
- **Brand Values**: Are values demonstrated in messaging?
- **Principle Application**: Are brand principles followed?
- **Mood Consistency**: Does content evoke intended emotions?

### 4.3 Suggested Implementation

**Implementation Guide - Brand Analysis Result Interface:**

```typescript
interface BrandAnalysisResult {
  overall_score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  
  categories: {
    visual: CategoryScore;
    voice: CategoryScore;
    message: CategoryScore;
    identity: CategoryScore;
  };
  
  strengths: string[]; // Top 3 things done well
  weaknesses: string[]; // Top 3 areas for improvement
  
  recommendations: Recommendation[];
  
  analyzed_content: {
    type: 'website' | 'social_post' | 'document' | 'sample';
    source: string;
    analyzed_at: string;
  }[];
  
  generated_at: string;
}

interface CategoryScore {
  score: number; // 0-100
  weight: number; // Category weight (e.g., 0.30 for 30%)
  findings: Finding[];
  recommendations: string[];
}

interface Finding {
  type: 'positive' | 'negative' | 'neutral';
  aspect: string;
  description: string;
  evidence?: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'visual' | 'voice' | 'message' | 'identity';
  title: string;
  description: string;
  action_items: string[];
}
```

**Implementation Guide - Analysis Edge Function:**

```typescript
// supabase/functions/analyze-brand/index.ts (planned)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandKitId, contentSamples } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch brand kit data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: brandKit } = await supabase
      .from('brand_kits')
      .select(`
        *,
        brand_kit_core(*),
        brand_kit_personality(*),
        brand_kit_expression(*)
      `)
      .eq('id', brandKitId)
      .single();

    // Build analysis prompt
    const systemPrompt = `You are a brand consistency analyst. Analyze the provided brand identity 
    and content samples to score brand consistency across four categories: visual, voice, message, 
    and identity alignment. Provide specific, actionable recommendations.`;

    const userPrompt = `
    ## Brand Identity
    ${JSON.stringify(brandKit, null, 2)}
    
    ## Content Samples to Analyze
    ${JSON.stringify(contentSamples, null, 2)}
    
    Analyze brand consistency and return structured results.
    `;

    // Call Lovable AI with structured output
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
        tools: [{
          type: 'function',
          function: {
            name: 'submit_analysis',
            description: 'Submit the brand consistency analysis results',
            parameters: {
              type: 'object',
              properties: {
                overall_score: { type: 'number', minimum: 0, maximum: 100 },
                grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
                categories: {
                  type: 'object',
                  properties: {
                    visual: { type: 'object' },
                    voice: { type: 'object' },
                    message: { type: 'object' },
                    identity: { type: 'object' }
                  }
                },
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array' }
              },
              required: ['overall_score', 'grade', 'categories', 'strengths', 'weaknesses', 'recommendations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'submit_analysis' } }
      })
    });

    const aiResult = await response.json();
    const analysisResult = JSON.parse(
      aiResult.choices[0].message.tool_calls[0].function.arguments
    );

    return new Response(
      JSON.stringify({ success: true, data: analysisResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.4 Integration Points

- Trigger analysis from brand kit overview page
- Display scores with visual indicators (gauges, progress bars)
- Show recommendations in actionable card format
- Track score history over time
- Compare scores before/after changes

---

## 5. Competitor Analysis Agent (Planned)

> **Purpose**: Discover, extract, and compare competitor brand information to identify differentiation opportunities and market positioning insights.

### 5.1 Overview

| Aspect | Detail |
|--------|--------|
| Discovery | Firecrawl Search API for competitor discovery |
| Extraction | Reuse Brand Extraction Agent for competitor data |
| Analysis | Lovable AI for comparison and recommendations |
| Storage | `brand_kit_competitors` table (planned) |

### 5.2 Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Discovery   │───▶│  Extraction  │───▶│  Comparison  │───▶│   Insights   │
│              │    │              │    │              │    │              │
│ Find         │    │ Extract      │    │ Side-by-side │    │ Gaps &       │
│ competitors  │    │ their brand  │    │ analysis     │    │ opportunities│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 5.3 Database Extension

**Implementation Guide - Competitors Table:**

```sql
-- Create table for storing competitor information
CREATE TABLE public.brand_kit_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  website_url TEXT,
  description TEXT,
  
  -- Extracted brand data (JSON blob from extraction)
  extracted_data JSONB DEFAULT '{}',
  
  -- Manual notes and analysis
  comparison_notes TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  differentiation_opportunities TEXT[],
  
  -- Relationship
  relationship_type TEXT, -- 'direct', 'indirect', 'aspirational'
  threat_level TEXT, -- 'high', 'medium', 'low'
  
  -- Metadata
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_kit_competitors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own brand kit competitors"
ON public.brand_kit_competitors
FOR ALL
USING (
  brand_kit_id IN (
    SELECT id FROM brand_kits WHERE user_id = auth.uid()
  )
);
```

### 5.4 Comparison Framework

#### 5.4.1 Visual Positioning
- Color palette comparison
- Typography choices
- Visual mood/aesthetic
- Logo style analysis

#### 5.4.2 Messaging Positioning
- Value proposition comparison
- Tagline analysis
- Tone of voice differences
- Target audience overlap

#### 5.4.3 Market Positioning
- Product/service overlap
- Pricing tier comparison
- Feature comparison
- Market segment focus

#### 5.4.4 Opportunity Analysis
- Underserved market segments
- Unaddressed pain points
- Differentiation gaps
- Blue ocean opportunities

### 5.5 Suggested Implementation

**Implementation Guide - Competitor Comparison Interface:**

```typescript
interface CompetitorComparison {
  user_brand: BrandSummary;
  competitor: BrandSummary;
  
  comparison: {
    visual: {
      similarities: string[];
      differences: string[];
      user_advantages: string[];
      competitor_advantages: string[];
    };
    messaging: {
      similarities: string[];
      differences: string[];
      user_advantages: string[];
      competitor_advantages: string[];
    };
    market: {
      overlap_areas: string[];
      differentiation_areas: string[];
      competitive_gaps: string[];
    };
  };
  
  recommendations: {
    differentiate: string[]; // Ways to stand out
    improve: string[]; // Areas where competitor is stronger
    maintain: string[]; // Current advantages to protect
    avoid: string[]; // Don't compete head-on here
  };
  
  overall_competitive_position: 'leader' | 'challenger' | 'follower' | 'niche';
}

interface BrandSummary {
  name: string;
  primary_color: string;
  brand_voice: string;
  key_values: string[];
  target_audience: string;
  unique_selling_points: string[];
}
```

---

## 6. Export & Share Agent (Planned)

> **Purpose**: Generate platform-specific exports of brand identity for AI tools, content platforms, and app builders. Each export format includes structured questions to gather user requirements and templates optimized for the target platform.

### 6.1 Overview

| Aspect | Detail |
|--------|--------|
| AI Provider | Lovable AI for content generation |
| Edge Function | `supabase/functions/export-brand/index.ts` (planned) |
| Storage | Generated exports in `brand-exports` bucket |

### 6.2 Export Targets (Priority Order)

| Priority | Platform | Category | Status |
|----------|----------|----------|--------|
| 1 | ChatGPT Custom GPT | AI Assistant | First Implementation |
| 2 | Claude Projects | AI Assistant | Planned |
| 3 | MidJourney | Image Generation | Planned |
| 4 | Google Gemini Nano Banana | Image Generation | Planned |
| 5 | Lovable | App Builder | Planned |
| 6 | Replit | App Builder | Planned |
| 7 | Base44 | App Builder | Planned |
| 8 | Generic .md | Universal | Planned |
| 9 | Generic .json | Universal | Planned |

### 6.3 ChatGPT Custom GPT Export (First Implementation)

#### 6.3.1 User Questions to Ask

Before generating the export, gather the following information:

```typescript
interface GPTExportQuestions {
  purpose: {
    question: "What is the primary purpose of this GPT?";
    options: [
      "Content creation (blog posts, social media, marketing copy)",
      "Customer support (answering questions, providing information)",
      "Internal assistant (helping team with brand guidelines)",
      "Creative brainstorming (generating ideas, concepts)",
      "Other (please specify)"
    ];
  };
  
  tasks: {
    question: "What specific tasks should this GPT help with?";
    type: "multi-select";
    options: [
      "Write social media posts",
      "Create blog content",
      "Draft email communications",
      "Generate marketing copy",
      "Answer brand-related questions",
      "Review content for brand alignment",
      "Suggest creative concepts",
      "Other (please specify)"
    ];
  };
  
  tone: {
    question: "What tone should the GPT maintain?";
    note: "We'll use your brand's defined tone, but you can adjust here";
    options: ["Use brand-defined tone", "More formal", "More casual", "More playful", "More professional"];
  };
  
  behavior: {
    question: "How should the GPT handle unclear requests?";
    options: [
      "Ask clarifying questions before proceeding",
      "Make reasonable assumptions and proceed",
      "Offer multiple options and let user choose"
    ];
  };
  
  restrictions: {
    question: "What should this GPT avoid?";
    type: "multi-select";
    options: [
      "Discussing competitors",
      "Making promises or commitments",
      "Discussing pricing",
      "Off-brand humor or references",
      "Technical jargon",
      "Other (please specify)"
    ];
  };
}
```

#### 6.3.2 Export Components

1. **System Instructions** (`.md` file)
   - Role definition
   - Brand identity context
   - Communication guidelines
   - Behavioral rules
   
2. **Knowledge Files** (uploaded to GPT)
   - Brand kit JSON export
   - Style guide summary
   - Product/service catalog
   - Target audience personas
   
3. **Conversation Starters**
   - Suggested opening prompts based on GPT purpose

#### 6.3.3 System Instructions Template

**Implementation Guide - GPT System Instructions Template:**

```markdown
# [BRAND_NAME] Brand Assistant

## Role & Purpose
You are [BRAND_NAME]'s official brand assistant. Your primary purpose is to [GPT_PURPOSE].

## Your Capabilities
You help with:
[TASK_LIST - formatted as bullet points]

## Brand Identity

### Who We Are
**Brand Name:** [BRAND_NAME]
**Tagline:** [TAGLINE]
**Brand Essence:** [BRAND_ESSENCE]

### Our Mission
[MISSION_STATEMENT]

### Our Vision
[VISION_STATEMENT]

### Our Story
[BRAND_STORY - condensed version]

### Core Values
[For each value in BRAND_VALUES:]
- **[VALUE_NAME]**: [VALUE_DESCRIPTION]

### Personality Traits
We are:
[For each trait in PERSONALITY_TRAITS:]
- **[TRAIT_NAME]** ([INTENSITY]/5): [TRAIT_DESCRIPTION]

### Our Brand Archetype
[ARCHETYPE] - [ARCHETYPE_DESCRIPTION]

## Communication Guidelines

### Brand Voice
[BRAND_VOICE - from expression table]

### Tone of Voice
[TONE_OF_VOICE - from expression table]

### Verbal Style
[VERBAL_STYLE - key elements]

### Do's
[Generated based on brand values and personality:]
- Always [POSITIVE_BEHAVIOR_1]
- Use [PREFERRED_TERMINOLOGY]
- Maintain [MOOD] tone in all communications
- Reference our [BRAND_PRINCIPLES] when relevant
- [Additional dos based on brand]

### Don'ts
- Never [RESTRICTION_1 from user questions]
- Avoid [RESTRICTION_2]
- Don't use [NEGATIVE_DIRECTORY items if available]
- Refrain from [BEHAVIORAL_CONSTRAINTS]

## Target Audience

### Primary Persona: [PERSONA_NAME]
**Demographics:** [DEMOGRAPHICS]
**Goals:** [GOALS]
**Pain Points:** [PAIN_POINTS]
**How We Help:** [HOW_BRAND_ADDRESSES_NEEDS]

[Repeat for additional personas if available]

## Products/Services

[For each product in BRAND_KIT_PRODUCTS:]
### [PRODUCT_NAME]
**Description:** [DESCRIPTION]
**Target Audience:** [TARGET_AUDIENCE]
**Key Benefits:**
[UNIQUE_SELLING_POINTS as bullet list]

## Behavioral Rules

### When Handling Requests
[Based on user's behavior preference:]
- [CLARIFICATION_BEHAVIOR]

### Content Creation Guidelines
When creating content:
1. Always align with our brand voice and tone
2. Reference our values when appropriate
3. Keep our target audience in mind
4. Use our brand's visual language in descriptions
5. Maintain consistency with existing content

### What to Avoid
[RESTRICTIONS from user questions as bullet list]

## Brand Colors (for reference)
- **Primary:** [PRIMARY_COLOR]
- **Secondary:** [SECONDARY_COLOR]
- **Accent:** [ACCENT_COLOR]

When describing visuals or suggesting design elements, reference these colors.

## Closing Notes
Remember: You represent [BRAND_NAME]. Every interaction should reinforce our brand identity and leave users with a positive impression aligned with our values.
```

### 6.4 Image Generation Export (MidJourney / Gemini Nano Banana)

**Implementation Guide - Visual Style Guide Template:**

```markdown
# [BRAND_NAME] Visual Style Guide for Image Generation

## Brand Overview
**Name:** [BRAND_NAME]
**Visual Essence:** [BRAND_ESSENCE condensed for visual interpretation]

## Color Palette

### Primary Colors
- **Primary:** [PRIMARY_COLOR] - [HEX] 
  - Use for: Main subjects, focal points, call-to-action elements
  - Mood: [ASSOCIATED_MOOD]
  
- **Secondary:** [SECONDARY_COLOR] - [HEX]
  - Use for: Supporting elements, backgrounds, frames
  - Mood: [ASSOCIATED_MOOD]

### Accent Colors
- **Accent:** [ACCENT_COLOR] - [HEX]
  - Use for: Highlights, details, emphasis points
  
- **Background:** [BACKGROUND_COLOR] - [HEX]
  - Use for: Backgrounds, negative space

## Visual Mood Keywords
[Derived from BRAND_MOODS:]
[For each mood:]
- **[MOOD_NAME]**: [VISUAL_DESCRIPTOR]

Combined mood prompt fragment: "[MOOD_1], [MOOD_2], [MOOD_3] aesthetic"

## Style Keywords
[Derived from personality and visual style:]
Primary style: [VISUAL_STYLE from expression]
Supporting keywords: [DERIVED_KEYWORDS]

## Photography/Image Style
- **Lighting:** [Derived from mood - e.g., "soft natural lighting", "dramatic contrast"]
- **Composition:** [Derived from personality - e.g., "balanced", "dynamic", "minimalist"]
- **Subject Treatment:** [Derived from values - e.g., "authentic", "aspirational", "approachable"]
- **Environment:** [Derived from brand essence]

## Example Prompts

### Hero/Banner Image
"A [MOOD] [STYLE] image featuring [BRAND_ELEMENT], [COLOR_PALETTE] color scheme, [VISUAL_STYLE] aesthetic, [LIGHTING], professional quality, 16:9 aspect ratio --v 6"

### Product Feature
"[PRODUCT/SERVICE] in [BRAND_STYLE] setting, [PRIMARY_COLOR] accents, [MOOD] atmosphere, clean composition, [VISUAL_DESCRIPTOR] --v 6"

### Social Media Visual
"[CONCEPT] in [BRAND_NAME] brand style, [MOOD_KEYWORDS], [COLOR_PALETTE], modern [VISUAL_STYLE], square format --v 6"

### Abstract/Pattern
"Abstract pattern inspired by [BRAND_ESSENCE], [COLOR_PALETTE] gradients, [MOOD] feeling, seamless, suitable for backgrounds --v 6"

## Negative Prompts (What to Avoid)
[Derived from brand constraints and personality opposites:]
- Avoid: [OPPOSITE_OF_MOOD_1], [OPPOSITE_OF_MOOD_2]
- Never: [BRAND_CONSTRAINT_VISUAL_IMPLICATIONS]
- Exclude: generic stock photo feel, [OTHER_NEGATIVES]

## Quick Reference Card

| Element | Value |
|---------|-------|
| Primary Color | [HEX] |
| Secondary Color | [HEX] |
| Accent Color | [HEX] |
| Primary Mood | [MOOD_1] |
| Style | [VISUAL_STYLE] |
| Lighting | [LIGHTING_STYLE] |

**One-line style prompt:**
"[MOOD_1], [MOOD_2], [VISUAL_STYLE], [COLOR_PALETTE] colors, [LIGHTING]"
```

### 6.5 App Builder Export (Lovable, Replit, Base44)

**Implementation Guide - App Builder Configuration:**

```json
{
  "brand": {
    "name": "[BRAND_NAME]",
    "description": "[BRAND_DESCRIPTION]",
    "tagline": "[TAGLINE]"
  },
  
  "design": {
    "colors": {
      "primary": "[PRIMARY_COLOR]",
      "secondary": "[SECONDARY_COLOR]",
      "accent": "[ACCENT_COLOR]",
      "background": "[BACKGROUND_COLOR]",
      "foreground": "[TEXT_PRIMARY_COLOR]",
      "muted": "[TEXT_SECONDARY_COLOR]",
      "border": "[DERIVED_BORDER_COLOR]"
    },
    
    "typography": {
      "fontFamily": {
        "heading": "[HEADING_FONT]",
        "body": "[BODY_FONT]"
      },
      "fontSizes": "[FONT_SIZES]",
      "fontWeights": "[FONT_WEIGHTS]"
    },
    
    "spacing": {
      "borderRadius": "[BORDER_RADIUS]",
      "padding": "[PADDING_SCALE]",
      "gap": "[GAP_SCALE]"
    },
    
    "components": {
      "button": {
        "primary": "[BUTTON_STYLES.primary]",
        "secondary": "[BUTTON_STYLES.secondary]"
      },
      "input": "[INPUT_STYLES]"
    }
  },
  
  "tailwindConfig": {
    "theme": {
      "extend": {
        "colors": {
          "primary": {
            "DEFAULT": "[PRIMARY_COLOR]",
            "foreground": "[CALCULATED_CONTRAST]"
          },
          "secondary": {
            "DEFAULT": "[SECONDARY_COLOR]",
            "foreground": "[CALCULATED_CONTRAST]"
          },
          "accent": {
            "DEFAULT": "[ACCENT_COLOR]",
            "foreground": "[CALCULATED_CONTRAST]"
          }
        },
        "fontFamily": {
          "heading": ["[HEADING_FONT]", "sans-serif"],
          "body": ["[BODY_FONT]", "sans-serif"]
        },
        "borderRadius": {
          "DEFAULT": "[BORDER_RADIUS]"
        }
      }
    }
  },
  
  "cssVariables": {
    ":root": {
      "--primary": "[PRIMARY_HSL]",
      "--secondary": "[SECONDARY_HSL]",
      "--accent": "[ACCENT_HSL]",
      "--background": "[BACKGROUND_HSL]",
      "--foreground": "[FOREGROUND_HSL]",
      "--font-heading": "[HEADING_FONT]",
      "--font-body": "[BODY_FONT]"
    }
  },
  
  "metadata": {
    "exportedAt": "[TIMESTAMP]",
    "brandKitId": "[BRAND_KIT_ID]",
    "version": "1.0"
  }
}
```

### 6.6 Generic Exports

#### 6.6.1 Generic Markdown Export

Complete brand documentation in a single markdown file, suitable for:
- Documentation platforms
- GitHub repositories
- Wiki systems
- General reference

#### 6.6.2 Generic JSON Export

Structured brand data in JSON format, suitable for:
- API integrations
- Data pipelines
- Custom applications
- Backup/archival

---

## 7. Coding Standards

> **Purpose**: Establish consistent coding patterns for cross-platform development with both Lovable and Cursor AI assistants.

### 7.1 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `BrandKitCard.tsx` |
| Hooks | camelCase with `use` prefix | `useBrandKits.ts` |
| Utilities | camelCase | `firecrawl.ts` |
| Types | Co-located or `types.ts` | `types.ts` |
| Edge Functions | kebab-case directory | `firecrawl-scrape/index.ts` |

### 7.2 Component Patterns

**Actual Code Snippet - Standard Component Structure:**

```typescript
// Standard component with data loading pattern
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ComponentNameProps {
  // Props interface
}

export function ComponentName({ }: ComponentNameProps) {
  // Get brand kit from route context
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  
  // Local state
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auto-save hook for the related table
  const { save, isSaving } = useAutoSave({
    tableName: 'brand_kit_table_name',
    brandKitId: brandKit.id,
  });

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data, error } = await supabase
          .from('brand_kit_table_name')
          .select('*')
          .eq('brand_kit_id', brandKit.id)
          .maybeSingle();
        
        if (error) throw error;
        setData(data);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [brandKit.id]);

  // Handle field changes with auto-save
  const handleChange = (field: string, value: any) => {
    setData(prev => prev ? { ...prev, [field]: value } : null);
    save({ [field]: value });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Main render
  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 7.3 Custom Hook Pattern

**Actual Code Snippet - Standard Custom Hook:**

```typescript
// Standard custom hook with TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseCustomHookOptions {
  // Configuration options
  enabled?: boolean;
}

export function useCustomHook(options: UseCustomHookOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { enabled = true } = options;

  // Query for fetching data
  const query = useQuery({
    queryKey: ['custom-key', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && enabled,
  });

  // Mutation for creating
  const createMutation = useMutation({
    mutationFn: async (input: CreateInput) => {
      const { data, error } = await supabase
        .from('table_name')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-key'] });
      toast.success('Created successfully');
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error('Failed to create');
    },
  });

  // Mutation for updating
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateInput) => {
      const { data, error } = await supabase
        .from('table_name')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-key'] });
      toast.success('Updated successfully');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update');
    },
  });

  // Mutation for deleting
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('table_name')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-key'] });
      toast.success('Deleted successfully');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    },
  });

  return {
    // Query results
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    
    // Mutations
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    
    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

### 7.4 Edge Function Pattern

See Section 2.3.2 for the complete edge function template.

### 7.5 Error Handling Conventions

**Actual Code Snippet - Error Handling Pattern:**

```typescript
// Consistent error handling in async operations
try {
  const result = await someAsyncOperation();
  return { success: true, data: result };
} catch (error) {
  // Log with context
  console.error('Operation failed:', {
    error,
    context: { /* relevant context */ }
  });
  
  // User-friendly error message
  toast.error(
    error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred'
  );
  
  // Return structured error
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}
```

### 7.6 TypeScript Patterns

```typescript
// Prefer interfaces for objects
interface BrandKitData {
  id: string;
  name: string;
  // ...
}

// Use type for unions and intersections
type BrandKitStatus = 'draft' | 'active' | 'archived';

// Generic utility types
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

// Strict null checks - always handle null/undefined
const value = data?.property ?? defaultValue;

// Type guards for runtime checks
function isBrandKit(obj: unknown): obj is BrandKitData {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}
```

---

## 8. Secrets & Configuration

### 8.1 Current Secrets

| Secret | Purpose | Required By |
|--------|---------|-------------|
| `FIRECRAWL_API_KEY` | Firecrawl API authentication | Brand Extraction Agent |

### 8.2 Auto-Provided Secrets (Lovable Cloud)

These are automatically available in edge functions:

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-level Supabase access |
| `LOVABLE_API_KEY` | Lovable AI Gateway access |

### 8.3 Future Secrets (As Needed)

| Secret | Purpose | Agent |
|--------|---------|-------|
| Twitter/X API keys | Social media extraction | Brand Extraction (expanded) |
| LinkedIn API keys | Social media extraction | Brand Extraction (expanded) |
| Additional AI provider keys | If not using Lovable AI | Any analysis agent |

### 8.4 Environment Variables (Frontend)

Available via `import.meta.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

---

## 9. Quick Reference

### 9.1 Key Files by Agent

| Agent | Key Files |
|-------|-----------|
| **Infrastructure** | `src/integrations/supabase/types.ts`, `src/contexts/AuthContext.tsx`, `supabase/config.toml` |
| **Brand Extraction** | `supabase/functions/firecrawl-scrape/index.ts`, `src/lib/api/firecrawl.ts` |
| **Brand Analysis** | (Planned) `supabase/functions/analyze-brand/index.ts` |
| **Competitor Analysis** | (Planned) `supabase/functions/analyze-competitors/index.ts` |
| **Export & Share** | (Planned) `supabase/functions/export-brand/index.ts`, `src/lib/api/export.ts` |

### 9.2 Database Tables Quick Reference

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `brand_kits` | Main brand entity | Parent to all brand_kit_* tables |
| `brand_kit_core` | Mission, vision, story | FK to brand_kits |
| `brand_kit_personality` | Traits, values, moods | FK to brand_kits |
| `brand_kit_expression` | Voice, tone, style | FK to brand_kits |
| `brand_kit_governance` | Guidelines, constraints | FK to brand_kits |
| `brand_kit_products` | Products/services | FK to brand_kits |
| `brand_kit_target_audience` | Personas | FK to brand_kits |
| `profiles` | User profiles | FK to auth.users |
| `user_roles` | RBAC | FK to auth.users |

### 9.3 Common Operations

| Operation | Hook/Function | Example |
|-----------|---------------|---------|
| Create brand kit | `useBrandKits().createBrandKit` | `createBrandKit({ name: 'My Brand' })` |
| Update brand kit | `useBrandKits().updateBrandKit` | `updateBrandKit({ id, name: 'Updated' })` |
| Auto-save changes | `useAutoSave().save` | `save({ field: value })` |
| Extract from URL | `firecrawlApi.extractBrand` | `extractBrand(url, brandKitId)` |
| Apply extracted data | `firecrawlApi.applyToBrandKit` | `applyToBrandKit(id, data)` |

### 9.4 UI Component Library

The project uses shadcn/ui components. Key components:

- `Button`, `Card`, `Dialog`, `Sheet`
- `Form`, `Input`, `Textarea`, `Select`
- `Tabs`, `Accordion`, `Collapsible`
- `Toast` (via Sonner), `Skeleton`
- `Sidebar`, `Navigation`

Import from `@/components/ui/*`.

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| December 2024 | 1.0 | Initial comprehensive documentation |

---

*This document should be updated whenever significant changes are made to the application architecture, database schema, or agent implementations.*
