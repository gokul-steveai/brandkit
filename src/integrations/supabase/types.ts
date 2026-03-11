export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bonus_redemptions: {
        Row: {
          bonus_type: string
          created_at: string
          id: string
          metadata: Json | null
          tokens_awarded: number
          user_id: string
        }
        Insert: {
          bonus_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tokens_awarded: number
          user_id: string
        }
        Update: {
          bonus_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tokens_awarded?: number
          user_id?: string
        }
        Relationships: []
      }
      brand_kit_categories: {
        Row: {
          brand_kit_id: string
          category_id: string
        }
        Insert: {
          brand_kit_id: string
          category_id: string
        }
        Update: {
          brand_kit_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_categories_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kit_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_competitors: {
        Row: {
          brand_colors: Json | null
          brand_kit_id: string
          brand_personality: Json | null
          button_styles: Json | null
          color_scheme: string | null
          created_at: string
          description: string | null
          design_framework: string | null
          fonts: Json | null
          id: string
          logo_url: string | null
          name: string | null
          raw_scrape_data: Json | null
          social_profiles: Json | null
          spacing: Json | null
          tagline: string | null
          typography: Json | null
          updated_at: string
          url: string
          user_id: string
          value_propositions: Json | null
        }
        Insert: {
          brand_colors?: Json | null
          brand_kit_id: string
          brand_personality?: Json | null
          button_styles?: Json | null
          color_scheme?: string | null
          created_at?: string
          description?: string | null
          design_framework?: string | null
          fonts?: Json | null
          id?: string
          logo_url?: string | null
          name?: string | null
          raw_scrape_data?: Json | null
          social_profiles?: Json | null
          spacing?: Json | null
          tagline?: string | null
          typography?: Json | null
          updated_at?: string
          url: string
          user_id: string
          value_propositions?: Json | null
        }
        Update: {
          brand_colors?: Json | null
          brand_kit_id?: string
          brand_personality?: Json | null
          button_styles?: Json | null
          color_scheme?: string | null
          created_at?: string
          description?: string | null
          design_framework?: string | null
          fonts?: Json | null
          id?: string
          logo_url?: string | null
          name?: string | null
          raw_scrape_data?: Json | null
          social_profiles?: Json | null
          spacing?: Json | null
          tagline?: string | null
          typography?: Json | null
          updated_at?: string
          url?: string
          user_id?: string
          value_propositions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_competitors_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_core: {
        Row: {
          brand_kit_id: string
          brand_promises: Json | null
          brand_story: string | null
          created_at: string
          id: string
          industry_classification_id: string | null
          mission: string | null
          updated_at: string
          vision: string | null
        }
        Insert: {
          brand_kit_id: string
          brand_promises?: Json | null
          brand_story?: string | null
          created_at?: string
          id?: string
          industry_classification_id?: string | null
          mission?: string | null
          updated_at?: string
          vision?: string | null
        }
        Update: {
          brand_kit_id?: string
          brand_promises?: Json | null
          brand_story?: string | null
          created_at?: string
          id?: string
          industry_classification_id?: string | null
          mission?: string | null
          updated_at?: string
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_core_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: true
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kit_core_industry_classification_id_fkey"
            columns: ["industry_classification_id"]
            isOneToOne: false
            referencedRelation: "industry_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_exports: {
        Row: {
          brand_kit_id: string
          content_summary: string | null
          created_at: string | null
          description: string | null
          export_config: Json | null
          export_format: string
          export_type: string
          file_size_bytes: number | null
          gaps_filled: Json | null
          id: string
          meta_tags: Json | null
          parent_export_id: string | null
          reference_name: string
          sections_included: Json
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          brand_kit_id: string
          content_summary?: string | null
          created_at?: string | null
          description?: string | null
          export_config?: Json | null
          export_format: string
          export_type: string
          file_size_bytes?: number | null
          gaps_filled?: Json | null
          id?: string
          meta_tags?: Json | null
          parent_export_id?: string | null
          reference_name: string
          sections_included?: Json
          storage_bucket?: string
          storage_path: string
          title: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          brand_kit_id?: string
          content_summary?: string | null
          created_at?: string | null
          description?: string | null
          export_config?: Json | null
          export_format?: string
          export_type?: string
          file_size_bytes?: number | null
          gaps_filled?: Json | null
          id?: string
          meta_tags?: Json | null
          parent_export_id?: string | null
          reference_name?: string
          sections_included?: Json
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_exports_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kit_exports_parent_export_id_fkey"
            columns: ["parent_export_id"]
            isOneToOne: false
            referencedRelation: "brand_kit_exports"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_expression: {
        Row: {
          brand_kit_id: string
          content_categories: Json | null
          created_at: string
          id: string
          preferred_terminology: Json | null
          tone_dimensions: Json | null
          tone_of_voice: Json | null
          updated_at: string
          verbal_style: Json | null
          visual_style: Json | null
          voice_archetypes: Json | null
        }
        Insert: {
          brand_kit_id: string
          content_categories?: Json | null
          created_at?: string
          id?: string
          preferred_terminology?: Json | null
          tone_dimensions?: Json | null
          tone_of_voice?: Json | null
          updated_at?: string
          verbal_style?: Json | null
          visual_style?: Json | null
          voice_archetypes?: Json | null
        }
        Update: {
          brand_kit_id?: string
          content_categories?: Json | null
          created_at?: string
          id?: string
          preferred_terminology?: Json | null
          tone_dimensions?: Json | null
          tone_of_voice?: Json | null
          updated_at?: string
          verbal_style?: Json | null
          visual_style?: Json | null
          voice_archetypes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_expression_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: true
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_governance: {
        Row: {
          approval_workflows: Json | null
          behavioral_constraints: Json | null
          brand_kit_id: string
          compliance_notes: string | null
          created_at: string
          disclosure_policy: string | null
          drift_prevention_prompts: Json | null
          id: string
          negative_directory: Json | null
          updated_at: string
          usage_guidelines: Json | null
          writing_constraints: Json | null
        }
        Insert: {
          approval_workflows?: Json | null
          behavioral_constraints?: Json | null
          brand_kit_id: string
          compliance_notes?: string | null
          created_at?: string
          disclosure_policy?: string | null
          drift_prevention_prompts?: Json | null
          id?: string
          negative_directory?: Json | null
          updated_at?: string
          usage_guidelines?: Json | null
          writing_constraints?: Json | null
        }
        Update: {
          approval_workflows?: Json | null
          behavioral_constraints?: Json | null
          brand_kit_id?: string
          compliance_notes?: string | null
          created_at?: string
          disclosure_policy?: string | null
          drift_prevention_prompts?: Json | null
          id?: string
          negative_directory?: Json | null
          updated_at?: string
          usage_guidelines?: Json | null
          writing_constraints?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_governance_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: true
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          brand_kit_id: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          brand_kit_id: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          brand_kit_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_invitations_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_knowledge_files: {
        Row: {
          brand_kit_id: string
          created_at: string
          custom_reference_name: string | null
          id: string
          is_included_in_export: boolean | null
          library_file_id: string
        }
        Insert: {
          brand_kit_id: string
          created_at?: string
          custom_reference_name?: string | null
          id?: string
          is_included_in_export?: boolean | null
          library_file_id: string
        }
        Update: {
          brand_kit_id?: string
          created_at?: string
          custom_reference_name?: string | null
          id?: string
          is_included_in_export?: boolean | null
          library_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_knowledge_files_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kit_knowledge_files_library_file_id_fkey"
            columns: ["library_file_id"]
            isOneToOne: false
            referencedRelation: "library_knowledge_files"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_logo_assets: {
        Row: {
          asset_key: string
          brand_kit_id: string
          created_at: string | null
          description: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          image_height: number | null
          image_width: number | null
          is_default: boolean | null
          label: string
          sort_order: number | null
          storage_path: string | null
          updated_at: string | null
          url: string | null
          usage_guidelines: string | null
          user_id: string
        }
        Insert: {
          asset_key: string
          brand_kit_id: string
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          is_default?: boolean | null
          label: string
          sort_order?: number | null
          storage_path?: string | null
          updated_at?: string | null
          url?: string | null
          usage_guidelines?: string | null
          user_id: string
        }
        Update: {
          asset_key?: string
          brand_kit_id?: string
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          is_default?: boolean | null
          label?: string
          sort_order?: number | null
          storage_path?: string | null
          updated_at?: string | null
          url?: string | null
          usage_guidelines?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_logo_assets_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_members: {
        Row: {
          brand_kit_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_kit_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_kit_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_members_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_personality: {
        Row: {
          brand_kit_id: string
          brand_moods: Json | null
          brand_principles: Json | null
          brand_values: Json | null
          created_at: string
          id: string
          personality_traits: Json | null
          updated_at: string
        }
        Insert: {
          brand_kit_id: string
          brand_moods?: Json | null
          brand_principles?: Json | null
          brand_values?: Json | null
          created_at?: string
          id?: string
          personality_traits?: Json | null
          updated_at?: string
        }
        Update: {
          brand_kit_id?: string
          brand_moods?: Json | null
          brand_principles?: Json | null
          brand_values?: Json | null
          created_at?: string
          id?: string
          personality_traits?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_personality_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: true
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_personas: {
        Row: {
          base_archetype_id: string | null
          behavioral_rules: Json | null
          brand_kit_id: string
          created_at: string
          function_description: string | null
          id: string
          interaction_context: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          personality_description: string | null
          purpose_type: string
          role_definition: string | null
          target_audience_context: string | null
          tasks: Json | null
          tone_overrides: Json | null
          updated_at: string
        }
        Insert: {
          base_archetype_id?: string | null
          behavioral_rules?: Json | null
          brand_kit_id: string
          created_at?: string
          function_description?: string | null
          id?: string
          interaction_context?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          personality_description?: string | null
          purpose_type: string
          role_definition?: string | null
          target_audience_context?: string | null
          tasks?: Json | null
          tone_overrides?: Json | null
          updated_at?: string
        }
        Update: {
          base_archetype_id?: string | null
          behavioral_rules?: Json | null
          brand_kit_id?: string
          created_at?: string
          function_description?: string | null
          id?: string
          interaction_context?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          personality_description?: string | null
          purpose_type?: string
          role_definition?: string | null
          target_audience_context?: string | null
          tasks?: Json | null
          tone_overrides?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_personas_base_archetype_id_fkey"
            columns: ["base_archetype_id"]
            isOneToOne: false
            referencedRelation: "library_archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kit_personas_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_products: {
        Row: {
          brand_kit_id: string
          competitive_differentiation: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          key_benefits: Json | null
          name: string
          special_pricing: string | null
          type: string | null
          updated_at: string
          usp: string | null
        }
        Insert: {
          brand_kit_id: string
          competitive_differentiation?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          key_benefits?: Json | null
          name: string
          special_pricing?: string | null
          type?: string | null
          updated_at?: string
          usp?: string | null
        }
        Update: {
          brand_kit_id?: string
          competitive_differentiation?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          key_benefits?: Json | null
          name?: string
          special_pricing?: string | null
          type?: string | null
          updated_at?: string
          usp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_products_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_seo: {
        Row: {
          brand_kit_id: string
          created_at: string
          id: string
          keywords: Json | null
          suggested_keywords: Json | null
          tags: Json | null
          updated_at: string
        }
        Insert: {
          brand_kit_id: string
          created_at?: string
          id?: string
          keywords?: Json | null
          suggested_keywords?: Json | null
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          brand_kit_id?: string
          created_at?: string
          id?: string
          keywords?: Json | null
          suggested_keywords?: Json | null
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_seo_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: true
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_target_audience: {
        Row: {
          barriers_to_sale: Json | null
          brand_kit_id: string
          buying_behavior: string | null
          content_that_resonates: string | null
          core_motivation: string | null
          created_at: string
          current_perception: string | null
          demographics: Json | null
          expertise_level: string | null
          fears: Json | null
          frustrations_pain_points: Json | null
          goals_motivations: Json | null
          id: string
          influencers: Json | null
          information_sources: Json | null
          is_primary: boolean | null
          persona_name: string | null
          persona_title: string | null
          persona_type: string | null
          personal_background: Json | null
          platform_behavior: string | null
          preferred_channels: string[] | null
          product_fit: string | null
          professional_context: Json | null
          representative_quote: string | null
          tech_usage: Json | null
          updated_at: string
          values_beliefs: Json | null
        }
        Insert: {
          barriers_to_sale?: Json | null
          brand_kit_id: string
          buying_behavior?: string | null
          content_that_resonates?: string | null
          core_motivation?: string | null
          created_at?: string
          current_perception?: string | null
          demographics?: Json | null
          expertise_level?: string | null
          fears?: Json | null
          frustrations_pain_points?: Json | null
          goals_motivations?: Json | null
          id?: string
          influencers?: Json | null
          information_sources?: Json | null
          is_primary?: boolean | null
          persona_name?: string | null
          persona_title?: string | null
          persona_type?: string | null
          personal_background?: Json | null
          platform_behavior?: string | null
          preferred_channels?: string[] | null
          product_fit?: string | null
          professional_context?: Json | null
          representative_quote?: string | null
          tech_usage?: Json | null
          updated_at?: string
          values_beliefs?: Json | null
        }
        Update: {
          barriers_to_sale?: Json | null
          brand_kit_id?: string
          buying_behavior?: string | null
          content_that_resonates?: string | null
          core_motivation?: string | null
          created_at?: string
          current_perception?: string | null
          demographics?: Json | null
          expertise_level?: string | null
          fears?: Json | null
          frustrations_pain_points?: Json | null
          goals_motivations?: Json | null
          id?: string
          influencers?: Json | null
          information_sources?: Json | null
          is_primary?: boolean | null
          persona_name?: string | null
          persona_title?: string | null
          persona_type?: string | null
          personal_background?: Json | null
          platform_behavior?: string | null
          preferred_channels?: string[] | null
          product_fit?: string | null
          professional_context?: Json | null
          representative_quote?: string | null
          tech_usage?: Json | null
          updated_at?: string
          values_beliefs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_target_audience_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          accent_color: string | null
          additional_colors: Json | null
          background_color: string | null
          body_font: string | null
          brand_kit_social_urls: Json | null
          brand_voice: string | null
          button_styles: Json | null
          color_details: Json | null
          color_scheme: string | null
          completion_percentage: number | null
          created_at: string
          custom_1_color: string | null
          custom_1_name: string | null
          custom_2_color: string | null
          custom_2_name: string | null
          custom_3_color: string | null
          custom_3_name: string | null
          custom_4_color: string | null
          custom_4_name: string | null
          description: string | null
          favicon_url: string | null
          font_sizes: Json | null
          font_weights: Json | null
          fonts_list: Json | null
          heading_font: string | null
          id: string
          input_styles: Json | null
          link_color: string | null
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          og_image_url: string | null
          paragraph_font: string | null
          personality: Json | null
          primary_color: string | null
          raw_scrape_path: string | null
          secondary_color: string | null
          spacing: Json | null
          status: string | null
          summary: string | null
          tagline: string | null
          text_primary_color: string | null
          text_secondary_color: string | null
          updated_at: string
          user_id: string
          version: number
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          additional_colors?: Json | null
          background_color?: string | null
          body_font?: string | null
          brand_kit_social_urls?: Json | null
          brand_voice?: string | null
          button_styles?: Json | null
          color_details?: Json | null
          color_scheme?: string | null
          completion_percentage?: number | null
          created_at?: string
          custom_1_color?: string | null
          custom_1_name?: string | null
          custom_2_color?: string | null
          custom_2_name?: string | null
          custom_3_color?: string | null
          custom_3_name?: string | null
          custom_4_color?: string | null
          custom_4_name?: string | null
          description?: string | null
          favicon_url?: string | null
          font_sizes?: Json | null
          font_weights?: Json | null
          fonts_list?: Json | null
          heading_font?: string | null
          id?: string
          input_styles?: Json | null
          link_color?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name: string
          og_image_url?: string | null
          paragraph_font?: string | null
          personality?: Json | null
          primary_color?: string | null
          raw_scrape_path?: string | null
          secondary_color?: string | null
          spacing?: Json | null
          status?: string | null
          summary?: string | null
          tagline?: string | null
          text_primary_color?: string | null
          text_secondary_color?: string | null
          updated_at?: string
          user_id: string
          version?: number
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          additional_colors?: Json | null
          background_color?: string | null
          body_font?: string | null
          brand_kit_social_urls?: Json | null
          brand_voice?: string | null
          button_styles?: Json | null
          color_details?: Json | null
          color_scheme?: string | null
          completion_percentage?: number | null
          created_at?: string
          custom_1_color?: string | null
          custom_1_name?: string | null
          custom_2_color?: string | null
          custom_2_name?: string | null
          custom_3_color?: string | null
          custom_3_name?: string | null
          custom_4_color?: string | null
          custom_4_name?: string | null
          description?: string | null
          favicon_url?: string | null
          font_sizes?: Json | null
          font_weights?: Json | null
          fonts_list?: Json | null
          heading_font?: string | null
          id?: string
          input_styles?: Json | null
          link_color?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          og_image_url?: string | null
          paragraph_font?: string | null
          personality?: Json | null
          primary_color?: string | null
          raw_scrape_path?: string | null
          secondary_color?: string | null
          spacing?: Json | null
          status?: string | null
          summary?: string | null
          tagline?: string | null
          text_primary_color?: string | null
          text_secondary_color?: string | null
          updated_at?: string
          user_id?: string
          version?: number
          website_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          content: string
          created_at: string
          entry_type: string
          id: string
          image_url: string | null
          published_at: string
          read_time_minutes: number | null
          slug: string
          summary: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          entry_type: string
          id?: string
          image_url?: string | null
          published_at?: string
          read_time_minutes?: number | null
          slug: string
          summary: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_type?: string
          id?: string
          image_url?: string | null
          published_at?: string
          read_time_minutes?: number | null
          slug?: string
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentation_pages: {
        Row: {
          badge: string | null
          content_markdown: string
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_published: boolean | null
          parent_slug: string | null
          section: string
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          content_markdown: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          parent_slug?: string | null
          section: string
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          content_markdown?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          parent_slug?: string | null
          section?: string
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expression_examples: {
        Row: {
          brand_kit_id: string
          context_type: string
          created_at: string
          id: string
          original_content: string | null
          platform: string
          platform_metadata: Json | null
          source: string
          updated_at: string
          user_id: string
          user_response: string
        }
        Insert: {
          brand_kit_id: string
          context_type: string
          created_at?: string
          id?: string
          original_content?: string | null
          platform: string
          platform_metadata?: Json | null
          source?: string
          updated_at?: string
          user_id: string
          user_response: string
        }
        Update: {
          brand_kit_id?: string
          context_type?: string
          created_at?: string
          id?: string
          original_content?: string | null
          platform?: string
          platform_metadata?: Json | null
          source?: string
          updated_at?: string
          user_id?: string
          user_response?: string
        }
        Relationships: [
          {
            foreignKeyName: "expression_examples_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_classifications: {
        Row: {
          created_at: string
          id: string
          level: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_classifications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "industry_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      library_archetypes: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_library: boolean
          key_traits: string[]
          llm_instruction: string
          name: string
          role_type: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_library?: boolean
          key_traits?: string[]
          llm_instruction: string
          name: string
          role_type: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_library?: boolean
          key_traits?: string[]
          llm_instruction?: string
          name?: string
          role_type?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      library_brand_moods: {
        Row: {
          associated_tone: string | null
          created_at: string
          emotional_description: string | null
          id: string
          is_library: boolean
          name: string
          usage_count: number | null
          user_id: string | null
          visual_descriptor: string | null
        }
        Insert: {
          associated_tone?: string | null
          created_at?: string
          emotional_description?: string | null
          id?: string
          is_library?: boolean
          name: string
          usage_count?: number | null
          user_id?: string | null
          visual_descriptor?: string | null
        }
        Update: {
          associated_tone?: string | null
          created_at?: string
          emotional_description?: string | null
          id?: string
          is_library?: boolean
          name?: string
          usage_count?: number | null
          user_id?: string | null
          visual_descriptor?: string | null
        }
        Relationships: []
      }
      library_brand_principles: {
        Row: {
          action: string | null
          created_at: string
          id: string
          is_library: boolean
          name: string
          tags: string[] | null
          usage_count: number | null
          use_case: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          is_library?: boolean
          name: string
          tags?: string[] | null
          usage_count?: number | null
          use_case?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          is_library?: boolean
          name?: string
          tags?: string[] | null
          usage_count?: number | null
          use_case?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      library_brand_values: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_library: boolean
          name: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_library?: boolean
          name: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_library?: boolean
          name?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      library_knowledge_files: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          file_type: string
          generation_config: Json | null
          id: string
          is_library: boolean
          reference_name: string
          storage_path: string | null
          system_instruction_hint: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          file_type: string
          generation_config?: Json | null
          id?: string
          is_library?: boolean
          reference_name: string
          storage_path?: string | null
          system_instruction_hint?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          file_type?: string
          generation_config?: Json | null
          id?: string
          is_library?: boolean
          reference_name?: string
          storage_path?: string | null
          system_instruction_hint?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      library_personality_traits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_library: boolean
          tags: string[] | null
          title: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_library?: boolean
          tags?: string[] | null
          title: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_library?: boolean
          tags?: string[] | null
          title?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      library_personas: {
        Row: {
          behavioral_rules: Json | null
          created_at: string
          function_description_template: string | null
          id: string
          is_library: boolean
          name: string
          personality_description_template: string | null
          purpose_type: string
          role_definition_template: string | null
          tasks: Json | null
          tone_defaults: Json | null
          user_id: string | null
        }
        Insert: {
          behavioral_rules?: Json | null
          created_at?: string
          function_description_template?: string | null
          id?: string
          is_library?: boolean
          name: string
          personality_description_template?: string | null
          purpose_type: string
          role_definition_template?: string | null
          tasks?: Json | null
          tone_defaults?: Json | null
          user_id?: string | null
        }
        Update: {
          behavioral_rules?: Json | null
          created_at?: string
          function_description_template?: string | null
          id?: string
          is_library?: boolean
          name?: string
          personality_description_template?: string | null
          purpose_type?: string
          role_definition_template?: string | null
          tasks?: Json | null
          tone_defaults?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      library_target_audience_sources: {
        Row: {
          created_at: string
          description: string | null
          facebook_url: string | null
          favicon_url: string | null
          id: string
          instagram_url: string | null
          is_library: boolean
          linkedin_url: string | null
          name: string
          reddit_url: string | null
          rss_feed_url: string | null
          skool_url: string | null
          source_type: string
          tiktok_url: string | null
          url: string | null
          usage_count: number | null
          user_id: string | null
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          is_library?: boolean
          linkedin_url?: string | null
          name: string
          reddit_url?: string | null
          rss_feed_url?: string | null
          skool_url?: string | null
          source_type: string
          tiktok_url?: string | null
          url?: string | null
          usage_count?: number | null
          user_id?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          is_library?: boolean
          linkedin_url?: string | null
          name?: string
          reddit_url?: string | null
          rss_feed_url?: string | null
          skool_url?: string | null
          source_type?: string
          tiktok_url?: string | null
          url?: string | null
          usage_count?: number | null
          user_id?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      mcp_request_logs: {
        Row: {
          api_key_id: string | null
          brand_kit_id: string | null
          created_at: string
          error_message: string | null
          id: string
          method: string
          request_status: string
          response_time_ms: number | null
          tool_name: string | null
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          brand_kit_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          method: string
          request_status?: string
          response_time_ms?: number | null
          tool_name?: string | null
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          brand_kit_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          method?: string
          request_status?: string
          response_time_ms?: number | null
          tool_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_framework_specs: {
        Row: {
          brand_kit_id: string
          content_json: Json | null
          content_markdown: string
          created_at: string
          generation_config: Json | null
          id: string
          selected_frameworks: Json
          selection_method: string
          title: string
          tokens_used: number
          user_id: string
          version: number
        }
        Insert: {
          brand_kit_id: string
          content_json?: Json | null
          content_markdown: string
          created_at?: string
          generation_config?: Json | null
          id?: string
          selected_frameworks?: Json
          selection_method?: string
          title: string
          tokens_used?: number
          user_id: string
          version?: number
        }
        Update: {
          brand_kit_id?: string
          content_json?: Json | null
          content_markdown?: string
          created_at?: string
          generation_config?: Json | null
          id?: string
          selected_frameworks?: Json
          selection_method?: string
          title?: string
          tokens_used?: number
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "messaging_framework_specs_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          id: string
          client_id: string
          client_secret_hash: string
          partner_name: string
          redirect_uris: string[]
          scopes: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          client_secret_hash: string
          partner_name: string
          redirect_uris: string[]
          scopes?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          client_secret_hash?: string
          partner_name?: string
          redirect_uris?: string[]
          scopes?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_codes: {
        Row: {
          id: string
          code_hash: string
          client_id: string
          partner_integration_id: string
          code_challenge: string
          code_challenge_method: string
          scopes: Json | null
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code_hash: string
          client_id: string
          partner_integration_id: string
          code_challenge: string
          code_challenge_method?: string
          scopes?: Json | null
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code_hash?: string
          client_id?: string
          partner_integration_id?: string
          code_challenge?: string
          code_challenge_method?: string
          scopes?: Json | null
          expires_at?: string
          used?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_codes_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_codes_partner_integration_id_fkey"
            columns: ["partner_integration_id"]
            referencedRelation: "partner_integrations"
            referencedColumns: ["id"]
          }
        ]
      }
      oauth_access_tokens: {
        Row: {
          id: string
          access_token_hash: string
          refresh_token_id: string
          scopes: Json | null
          expires_at: string | null
          revoked: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          access_token_hash: string
          refresh_token_id: string
          scopes?: Json | null
          expires_at?: string | null
          revoked?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          access_token_hash?: string
          refresh_token_id?: string
          scopes?: Json | null
          expires_at?: string | null
          revoked?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_access_tokens_oauth_refresh_token_id_fkey"
            columns: ["refresh_token_id"]
            referencedRelation: "oauth_refresh_tokens"
            referencedColumns: ["id"]
          }
        ]
      }
      oauth_refresh_tokens: {
        Row: {
          id: string
          refresh_token_hash: string
          partner_integration_id: string
          expires_at: string
          revoked: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          refresh_token_hash: string
          partner_integration_id: string
          expires_at: string
          revoked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          refresh_token_hash?: string
          partner_integration_id?: string
          client_id?: string
          expires_at?: string
          revoked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_refresh_tokens_partner_integration_id_fkey"
            columns: ["partner_integration_id"]
            isOneToOne: false
            referencedRelation: "partner_integrations"
            referencedColumns: ["id"]
          }
        ]
      }
      partner_integrations: {
        Row: {
          brand_kit_id: string
          client_id: string
          created_at: string
          external_user_id: string | null
          external_workspace_id: string | null
          id: string
          integration_identity: string
          is_active: boolean
          key_hash: string | null
          key_prefix: string | null
          partner_name: string
          updated_at: string
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          brand_kit_id?: string
          client_id?: string
          created_at?: string
          external_user_id?: string | null
          external_workspace_id?: string | null
          id?: string
          integration_identity: string
          is_active?: boolean
          key_hash?: string | null
          key_prefix?: string | null
          partner_name?: string
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          brand_kit_id?: string
          client_id?: string | null
          created_at?: string
          external_user_id?: string | null
          external_workspace_id?: string | null
          id?: string
          integration_identity: string
          is_active?: boolean
          key_hash?: string | null
          key_prefix?: string | null
          partner_name?: string
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_integrations_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          }
        ]
      }
      partner_integration_brand_kits: {
        Row: {
          id: string
          integration_id: string
          brand_kit_id: string
          created_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          brand_kit_id: string
          created_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          brand_kit_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_integration_brand_kits_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "partner_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_integration_brand_kits_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          auto_save: boolean | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          signed_url_expiry_months: number | null
          updated_at: string
        }
        Insert: {
          auto_save?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          signed_url_expiry_months?: number | null
          updated_at?: string
        }
        Update: {
          auto_save?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          signed_url_expiry_months?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          function_name: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      social_profiles: {
        Row: {
          about: string | null
          banner_url: string | null
          biography: string | null
          brand_kit_id: string
          business_category: string | null
          cake_day: string | null
          category: string | null
          comment_karma: number | null
          company_name: string | null
          company_website: string | null
          connections: number | null
          cover_photo_url: string | null
          created_at: string
          data_source: string | null
          experiences: Json | null
          expression_overrides: Json | null
          external_url: string | null
          external_urls: Json | null
          first_name: string | null
          followers: number | null
          following_count: number | null
          follows_count: number | null
          friend_count: number | null
          full_name: string | null
          has_channel: boolean | null
          headline: string | null
          highlight_reel_count: number | null
          highlights: Json | null
          id: string
          igtv_video_count: number | null
          interests: Json | null
          is_business_account: boolean | null
          is_disconnected: boolean | null
          is_influencer: boolean | null
          is_private: boolean | null
          job_title: string | null
          joined_date: string | null
          karma: number | null
          last_name: string | null
          likes_count: number | null
          logo_url: string | null
          platform: string
          post_karma: number | null
          post_storage_path: string | null
          posts_count: number | null
          profile_image_url: string | null
          profile_pic_hd_url: string | null
          profile_type: string
          profile_url: string
          raw_response: Json | null
          recommendations: Json | null
          recommendations_given: Json | null
          skills: Json | null
          status: string
          storage_path: string | null
          subscriber_count: number | null
          updated_at: string
          username: string | null
          verifications: Json | null
          verified: boolean | null
          video_count: number | null
          view_count: number | null
        }
        Insert: {
          about?: string | null
          banner_url?: string | null
          biography?: string | null
          brand_kit_id: string
          business_category?: string | null
          cake_day?: string | null
          category?: string | null
          comment_karma?: number | null
          company_name?: string | null
          company_website?: string | null
          connections?: number | null
          cover_photo_url?: string | null
          created_at?: string
          data_source?: string | null
          experiences?: Json | null
          expression_overrides?: Json | null
          external_url?: string | null
          external_urls?: Json | null
          first_name?: string | null
          followers?: number | null
          following_count?: number | null
          follows_count?: number | null
          friend_count?: number | null
          full_name?: string | null
          has_channel?: boolean | null
          headline?: string | null
          highlight_reel_count?: number | null
          highlights?: Json | null
          id?: string
          igtv_video_count?: number | null
          interests?: Json | null
          is_business_account?: boolean | null
          is_disconnected?: boolean | null
          is_influencer?: boolean | null
          is_private?: boolean | null
          job_title?: string | null
          joined_date?: string | null
          karma?: number | null
          last_name?: string | null
          likes_count?: number | null
          logo_url?: string | null
          platform: string
          post_karma?: number | null
          post_storage_path?: string | null
          posts_count?: number | null
          profile_image_url?: string | null
          profile_pic_hd_url?: string | null
          profile_type: string
          profile_url: string
          raw_response?: Json | null
          recommendations?: Json | null
          recommendations_given?: Json | null
          skills?: Json | null
          status?: string
          storage_path?: string | null
          subscriber_count?: number | null
          updated_at?: string
          username?: string | null
          verifications?: Json | null
          verified?: boolean | null
          video_count?: number | null
          view_count?: number | null
        }
        Update: {
          about?: string | null
          banner_url?: string | null
          biography?: string | null
          brand_kit_id?: string
          business_category?: string | null
          cake_day?: string | null
          category?: string | null
          comment_karma?: number | null
          company_name?: string | null
          company_website?: string | null
          connections?: number | null
          cover_photo_url?: string | null
          created_at?: string
          data_source?: string | null
          experiences?: Json | null
          expression_overrides?: Json | null
          external_url?: string | null
          external_urls?: Json | null
          first_name?: string | null
          followers?: number | null
          following_count?: number | null
          follows_count?: number | null
          friend_count?: number | null
          full_name?: string | null
          has_channel?: boolean | null
          headline?: string | null
          highlight_reel_count?: number | null
          highlights?: Json | null
          id?: string
          igtv_video_count?: number | null
          interests?: Json | null
          is_business_account?: boolean | null
          is_disconnected?: boolean | null
          is_influencer?: boolean | null
          is_private?: boolean | null
          job_title?: string | null
          joined_date?: string | null
          karma?: number | null
          last_name?: string | null
          likes_count?: number | null
          logo_url?: string | null
          platform?: string
          post_karma?: number | null
          post_storage_path?: string | null
          posts_count?: number | null
          profile_image_url?: string | null
          profile_pic_hd_url?: string | null
          profile_type?: string
          profile_url?: string
          raw_response?: Json | null
          recommendations?: Json | null
          recommendations_given?: Json | null
          skills?: Json | null
          status?: string
          storage_path?: string | null
          subscriber_count?: number | null
          updated_at?: string
          username?: string | null
          verifications?: Json | null
          verified?: boolean | null
          video_count?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      token_transactions: {
        Row: {
          brand_kit_id: string | null
          created_at: string
          description: string | null
          function_name: string | null
          id: string
          metadata: Json | null
          tokens_amount: number
          tokens_balance_after: number
          transaction_type: Database["public"]["Enums"]["token_transaction_type"]
          user_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string
          description?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          tokens_amount: number
          tokens_balance_after: number
          transaction_type: Database["public"]["Enums"]["token_transaction_type"]
          user_id: string
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string
          description?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          tokens_amount?: number
          tokens_balance_after?: number
          transaction_type?: Database["public"]["Enums"]["token_transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_communication: {
        Row: {
          brand_kit_id: string | null
          communication_type: string
          created_at: string
          details: string
          id: string
          screenshot_url: string | null
          status: string
          subject: string
          support_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          communication_type: string
          created_at?: string
          details: string
          id?: string
          screenshot_url?: string | null
          status?: string
          subject: string
          support_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_kit_id?: string | null
          communication_type?: string
          created_at?: string
          details?: string
          id?: string
          screenshot_url?: string | null
          status?: string
          subject?: string
          support_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_communication_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          brand_kit_id: string | null
          created_at: string
          description: string
          feedback_type: string
          id: string
          user_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string
          description: string
          feedback_type: string
          id?: string
          user_id: string
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string
          description?: string
          feedback_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_knowledge_file_uploads: {
        Row: {
          attribution: string | null
          audience: string | null
          brand_kit_id: string
          category: string | null
          created_at: string
          department: string | null
          description: string | null
          doc_id: string | null
          extracted_data: Json | null
          file_size_bytes: number | null
          file_type: string
          id: string
          is_ai_generated_metadata: boolean | null
          original_file_name: string
          platform_context: string | null
          related_projects: Json | null
          sensitivity: string | null
          source: string | null
          storage_path: string
          tags: Json | null
          title: string
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          attribution?: string | null
          audience?: string | null
          brand_kit_id: string
          category?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          doc_id?: string | null
          extracted_data?: Json | null
          file_size_bytes?: number | null
          file_type: string
          id?: string
          is_ai_generated_metadata?: boolean | null
          original_file_name: string
          platform_context?: string | null
          related_projects?: Json | null
          sensitivity?: string | null
          source?: string | null
          storage_path: string
          tags?: Json | null
          title: string
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          attribution?: string | null
          audience?: string | null
          brand_kit_id?: string
          category?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          doc_id?: string | null
          extracted_data?: Json | null
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          is_ai_generated_metadata?: boolean | null
          original_file_name?: string
          platform_context?: string | null
          related_projects?: Json | null
          sensitivity?: string | null
          source?: string | null
          storage_path?: string
          tags?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_knowledge_file_uploads_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle_start: string
          created_at: string
          id: string
          manual_override: boolean
          monthly_token_allowance: number
          overage_limit_percent: number
          storage_used_bytes: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          tokens_balance: number
          tokens_used_this_period: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle_start?: string
          created_at?: string
          id?: string
          manual_override?: boolean
          monthly_token_allowance?: number
          overage_limit_percent?: number
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tokens_balance?: number
          tokens_used_this_period?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle_start?: string
          created_at?: string
          id?: string
          manual_override?: boolean
          monthly_token_allowance?: number
          overage_limit_percent?: number
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tokens_balance?: number
          tokens_used_this_period?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_visual_assets: {
        Row: {
          ai_analysis: Json | null
          asset_type: string
          brand_kit_id: string
          created_at: string
          description: string | null
          expires_at: string | null
          file_name: string
          file_size_bytes: number
          id: string
          is_private: boolean | null
          mime_type: string
          public_url: string | null
          storage_path: string
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          asset_type?: string
          brand_kit_id: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_name: string
          file_size_bytes: number
          id?: string
          is_private?: boolean | null
          mime_type: string
          public_url?: string | null
          storage_path: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          asset_type?: string
          brand_kit_id?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_name?: string
          file_size_bytes?: number
          id?: string
          is_private?: boolean | null
          mime_type?: string
          public_url?: string | null
          storage_path?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_visual_assets_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          event_id: string
          id: string
          integration_id: string
          last_attempt_at: string | null
          max_attempts: number
          next_retry_at: string | null
          response_body: string | null
          response_status: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          event_id: string
          id?: string
          integration_id: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          response_body?: string | null
          response_status?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          event_id?: string
          id?: string
          integration_id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          response_body?: string | null
          response_status?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "partner_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          brand_kit_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string
          version: number
        }
        Insert: {
          brand_kit_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          user_id: string
          version?: number
        }
        Update: {
          brand_kit_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_brand_kit_owner_tier: {
        Args: { p_brand_kit_id: string }
        Returns: {
          monthly_token_allowance: number
          subscription_tier: string
          tokens_balance: number
          user_id: string
        }[]
      }
      get_next_messaging_framework_version: {
        Args: { p_brand_kit_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_brand_kit_access: {
        Args: { _brand_kit_id: string; _required_role?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_brand_kit_member: { Args: { _brand_kit_id: string }; Returns: boolean }
      update_user_tier: {
        Args: { _new_tier: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "viewer" | "author" | "admin"
      subscription_tier: "free" | "base" | "premium"
      token_transaction_type:
        | "signup_bonus"
        | "onboarding_bonus"
        | "referral_bonus"
        | "api_usage"
        | "plan_refresh"
        | "promotion"
        | "manual_adjustment"
        | "tier_change"
        | "token_purchase"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["viewer", "author", "admin"],
      subscription_tier: ["free", "base", "premium"],
      token_transaction_type: [
        "signup_bonus",
        "onboarding_bonus",
        "referral_bonus",
        "api_usage",
        "plan_refresh",
        "promotion",
        "manual_adjustment",
        "tier_change",
        "token_purchase",
      ],
    },
  },
} as const
