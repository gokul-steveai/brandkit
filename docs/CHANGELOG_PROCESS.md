# Changelog Creation Process

This document outlines the standard process for creating and publishing changelog entries for Brand Kit OS.

## When to Create Changelog Entries

- After completing significant features, improvements, or bug fixes
- At regular intervals (e.g., weekly) to summarize recent work
- Before major releases

## Steps

### 1. Identify Changes Since Last Entry

- Review conversation history and recent commits
- Check the last `published_at` date in `changelog_entries` table:
  ```sql
  SELECT published_at, title FROM changelog_entries ORDER BY published_at DESC LIMIT 5;
  ```
- Group related changes into logical entries

### 2. Categorize Each Entry

Choose entry type from `src/lib/changelog/constants.ts`:

| Type | Use For |
|------|---------|
| `new_release` | Major new features, significant additions |
| `improvement` | Enhancements, bug fixes, optimizations |
| `retired` | Deprecated or removed features |

### 3. Select Appropriate Tags

Available tags (from `src/lib/changelog/constants.ts`):

| Tag | Description |
|-----|-------------|
| `brand-kit-core` | Core brand kit functionality |
| `personality` | Brand personality features |
| `expression` | Voice, tone, terminology |
| `audience` | Target audience/personas |
| `governance` | Rules, constraints, compliance |
| `export` | GPT/Claude exports |
| `personas` | AI personas |
| `knowledge-files` | Document uploads |
| `social` | Social profile features |
| `products` | Products & services |
| `dashboard` | Dashboard UI |
| `authentication` | Login, signup, auth |
| `api-mcp` | API and MCP server |
| `documentation` | Docs and guides |
| `settings` | User settings |
| `billing` | Subscription/billing |

### 4. Write Entry Content

Follow this template structure:

```markdown
## ✨ What's Improved
<!-- or 🚀 What's New for new_release, ⚠️ What's Changed for retired -->

Brief introduction explaining the improvement (1-2 sentences).

### The Problem
<!-- For improvements/fixes -->
Describe what was broken or suboptimal.

### The Fix / What's New
Explain the solution or new feature.

### How to Use / How to Verify
Step-by-step instructions for users.
```

#### Content Guidelines

- **Emojis**: Only in h2 headings (🚀, ✨, 📍, 📚, 🔧, 🎨, 🐛, ⚠️)
- **Bold**: Important terms and field names
- **Code blocks**: For code snippets, file paths, field names
- **Paragraphs**: Keep short (2-3 sentences max)
- **Lists**: Use for multiple items or steps

### 5. Generate Slug

Create URL-friendly identifier:

1. Lowercase the title
2. Replace spaces with hyphens
3. Remove special characters
4. Keep it concise

Examples:
- "Instagram Posts Image Fix" → `instagram-posts-image-fix`
- "Claude Skill Export Improvements" → `claude-skill-export-improvements`

### 6. Insert into Database

Use SQL insert to add entries:

```sql
INSERT INTO changelog_entries (
  entry_type,
  title,
  slug,
  summary,
  content,
  tags,
  read_time_minutes,
  published_at
) VALUES (
  'improvement',
  'Your Title Here',
  'your-slug-here',
  'Brief summary for the list view (1-2 sentences).',
  'Full markdown content...',
  ARRAY['tag1', 'tag2'],
  2,  -- estimated read time in minutes
  '2026-01-08'  -- publication date
);
```

### 7. Verify on Changelog Page

1. Navigate to `/changelog`
2. Confirm entries appear in the list
3. Test filtering by entry type and tags
4. Click into each entry to verify content renders correctly
5. Test the "Back to Changelog" navigation

## Database Schema Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `entry_type` | string | `'new_release'` \| `'improvement'` \| `'retired'` |
| `title` | string | Display title |
| `slug` | string | URL-friendly identifier (must be unique) |
| `summary` | string | Brief description shown in list view |
| `content` | string | Full markdown content |
| `tags` | string[] | Array of tag keys |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `image_url` | string | Header image URL |
| `read_time_minutes` | number | Estimated read time |
| `published_at` | timestamp | Publication date (defaults to now) |

## Example: Complete Entry

```sql
INSERT INTO changelog_entries (entry_type, title, slug, summary, content, tags, read_time_minutes, published_at) VALUES (
  'improvement',
  'Export Section Selection Accuracy',
  'export-section-selection-accuracy',
  'Fixed Products & Services and Target Audience sections incorrectly showing as "Not Started" in the export wizard despite having data.',
  '## ✨ What''s Improved

Fixed an issue where certain sections in the Export wizard were incorrectly marked as "Not Started" even when they contained data.

### The Problem

When configuring exports, the section selection step showed:
- **Products & Services** as "Not Started" even with products defined
- **Target Audience** as "Not Started" even with personas created

### The Fix

Updated the `calculateCompleteness` function to properly handle array-based sections.

### How to Verify

1. Add at least one product to your Brand Kit
2. Go to **Export** → Start a new export
3. Verify sections now show as "Complete"',
  ARRAY['export'],
  1,
  '2026-01-07'
);
```

## Querying Changelog Data

### Get recent entries
```sql
SELECT title, entry_type, published_at, tags 
FROM changelog_entries 
ORDER BY published_at DESC 
LIMIT 10;
```

### Get entries by tag
```sql
SELECT title, published_at 
FROM changelog_entries 
WHERE 'export' = ANY(tags) 
ORDER BY published_at DESC;
```

### Get entries by type
```sql
SELECT title, published_at 
FROM changelog_entries 
WHERE entry_type = 'new_release' 
ORDER BY published_at DESC;
```
