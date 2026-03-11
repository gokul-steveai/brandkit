

# Partner API Documentation and Data Exposure Plan

## 1. What Needs Updating in Your Documentation

The existing documentation page (`reference/partner-api` in the database) has several gaps compared to the actual implementation:

### Outdated Items
- **Authentication section** still says "Contact the Brand Kit OS team to obtain your API key" -- it should document the per-partner `pk_` key flow via `/link`
- **Link endpoint path** is listed as `/v1/link` but the actual implementation is `/v1/integrations/partner/link`
- **Response schema** references old field names (`overview`, `personality`, `expression`) instead of the actual `compat` + `full` two-layer schema
- **Webhook payload** also uses old field names instead of `compat` + `full`
- **Rate limits table** shows 100/min for GET and 20/min for link -- actual implementation is 60/min flat for all endpoints

### Missing Content
- No description of the `compat` vs `full` data model (what each object contains)
- No field-level reference for the `FullData` schema (voice, audience, messaging, visuals, seo, constraints, examples, ctas)
- No mention of the `/link` response returning `partner_api_key` and `webhook_secret` (save-once credentials)
- No "Getting Started" quickstart flow for a new partner
- No example response payloads

---

## 2. Comprehensive Partner Developer Documentation

We will rewrite the `reference/partner-api` documentation page in the database to be a complete integration guide for Leafpad (or any future partner). The new document will include:

### Structure

1. **Overview** -- what Brand Kit OS provides and how Leafpad benefits
2. **Getting Started** -- step-by-step linking flow
3. **Authentication** -- per-partner `pk_` keys, Bearer token usage, key rotation
4. **API Reference** -- all 3 endpoints with request/response examples:
   - `POST /v1/integrations/partner/link` (onboarding)
   - `GET /v1/brand-kits/{brand_kit_id}` (pull single brand kit)
   - `GET /v1/brand-kits?external_user_id=X` (list by user)
5. **Data Model Reference** -- full field-by-field documentation of `compat` and `full` objects
6. **Webhooks** -- event types, payload format, signature verification (Node.js + Python examples)
7. **Error Handling** -- error codes, retry guidance
8. **Rate Limits** -- current limits and 429 handling
9. **Mapping Guide for Leafpad** -- explicit mapping from Leafpad's fields to Brand Kit OS data

---

## 3. What We Expose via the API -- Leafpad Mapping

Leafpad currently supports: **Keywords**, **Verbal Style**, **Visual Style**, **Website URL**, and **Business Description**. Here is how we map our richer data to enhance their AI context:

### Compat Layer (Drop-in Replacement for Leafpad's Existing Fields)

| Leafpad Field | Brand Kit OS `compat` Field | Source |
|---|---|---|
| Business Description | `compat.brand_description` | `brand_kits.description` + `brand_kit_core.brand_story` |
| Keywords | `compat.seo_keywords` + `compat.brand_keywords` | Products, personality traits, brand values |
| Verbal Style | `compat.writing_style` | Expression tone + verbal style settings |
| Visual Style | `compat.image_style` | Expression visual style |
| Website URL | `full.examples.reference_urls[0]` | `brand_kits.website_url` |

### Full Layer (Additional Context for Enhanced AI Generation)

These fields go beyond what Leafpad currently uses and can dramatically improve blog content quality:

| Category | Key Fields | Value for Blog Generation |
|---|---|---|
| **Voice** | `tone`, `personality_traits`, `do_phrases`, `dont_phrases`, `formality`, `humor_level` | Ensures blog tone matches the brand |
| **Audience** | `personas` (name, demographics, pain points, goals, channels) | Targets content to the right readers |
| **Messaging** | `value_props`, `positioning`, `differentiators`, `elevator_pitch`, `tagline_options` | Keeps articles on-message |
| **Visuals** | `color_palette`, `typography`, `visual_do`, `visual_dont` | Guides image selection and formatting |
| **SEO** | `primary_keywords`, `secondary_keywords` | Keyword optimization |
| **Constraints** | `taboo_topics`, `claims_to_avoid`, `compliance_notes`, `required_disclaimers` | Prevents brand violations |
| **Examples** | `good_examples`, `bad_examples` | Shows the AI what "good" looks like |
| **CTAs** | `primary_ctas`, `secondary_ctas`, `offer_details` | Drives conversions in blog posts |

### API Calls Summary

| Direction | Endpoint | When | Purpose |
|---|---|---|---|
| Leafpad to BKOS | `POST /v1/integrations/partner/link` | Once during setup | Exchange credentials, link user accounts |
| Leafpad to BKOS | `GET /v1/brand-kits/{id}` | Before generating each blog post | Pull latest brand context for AI prompt |
| Leafpad to BKOS | `GET /v1/brand-kits?external_user_id=X` | On Leafpad dashboard load | List all linked brand kits for a user |
| BKOS to Leafpad | Webhook `brand_kit.upserted` | When user updates brand kit | Push fresh data so Leafpad can cache/refresh |
| BKOS to Leafpad | Webhook `brand_kit.deleted` | When brand kit is deleted | Clean up cached data |

---

## Implementation Steps

### Step 1: Update Documentation Page
Update the `documentation_pages` record for `reference/partner-api` with the comprehensive rewrite covering all sections listed above, including:
- Complete field-by-field `compat` and `full` schema reference
- Corrected endpoint paths and example curl commands
- Accurate rate limit values
- Leafpad-specific mapping guide
- Example JSON response payloads

### Step 2: Update OpenAPI Spec
Expand `docs/partner-api-openapi.yaml` to include:
- Detailed property descriptions for every field in `Compat` and `Full` schemas
- Example response objects
- Corrected rate limit descriptions

### Step 3: No Code Changes Required
The API endpoints and data mapper (`partner-data.ts`) already expose all the data described above. No new endpoints or schema changes are needed -- this is purely a documentation improvement.

