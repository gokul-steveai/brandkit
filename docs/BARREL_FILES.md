# Barrel Files Convention

## What is a Barrel File?

A barrel file (`index.ts`) re-exports all public components, types, and utilities from a folder through a single entry point. This enables cleaner imports and better code organization.

**Before:**
```typescript
import { EmptyStateCard } from '@/components/brand-kit/shared/EmptyStateCard';
import { ListInputCard } from '@/components/brand-kit/shared/ListInputCard';
import { TextareaCard } from '@/components/brand-kit/shared/TextareaCard';
```

**After:**
```typescript
import { EmptyStateCard, ListInputCard, TextareaCard } from '@/components/brand-kit/shared';
```

## Benefits

1. **Cleaner imports** - Single import statement for multiple components
2. **Encapsulation** - Internal implementation details stay hidden
3. **Refactoring** - File renames only require barrel file updates
4. **Discoverability** - Easy to see all available exports in one place

---

## When to Create Barrel Files

- **Always** create an `index.ts` when a folder has 2+ related components
- **Always** export types alongside components when they exist
- **Update** barrel files when adding new components to a folder
- **Skip** for single-file utilities or one-off components

---

## How to Create a Barrel File

### Basic Structure

```typescript
// src/components/feature/index.ts

// Named exports for components
export { ComponentA } from './ComponentA';
export { ComponentB } from './ComponentB';

// Type exports
export type { TypeA, TypeB } from './types';

// Constants/config exports
export { CONFIG_CONSTANT } from './constants';
```

### Export Patterns

| Pattern | When to Use |
|---------|-------------|
| `export { Component } from './Component'` | Standard component export |
| `export type { TypeName } from './types'` | TypeScript types only |
| `export { Component as RenamedComponent } from './Component'` | Rename on export (avoid conflicts) |
| `export * from './utils'` | Re-export everything (use sparingly) |

---

## Import Conventions

### Within the Same Section (Relative)
```typescript
// Inside src/components/brand-kit/core/SomeCard.tsx
import { SaveStatusHeader } from '../shared';
```

### Across Sections (Absolute)
```typescript
// Inside src/pages/SomePage.tsx
import { EmptyStateCard, ListInputCard } from '@/components/brand-kit/shared';
```

### What to Import
```typescript
// ✅ Correct - import from barrel
import { CorePage, BrandStoryCard } from '@/components/brand-kit/core';

// ❌ Avoid - import from specific file
import { CorePage } from '@/components/brand-kit/core/CorePage';
```

---

## Existing Barrel Files

### Brand Kit Sections

| Location | Components |
|----------|------------|
| `brand-kit/shared` | EmptyStateCard, ListInputCard, TextareaCard, SaveStatusHeader, LibrarySelector, EditLayout |
| `brand-kit/audience` | AudiencePage, AudienceEmptyState, AudienceListInput, AudiencePersonaCard, AudiencePersonaDialog |
| `brand-kit/core` | CorePage, BrandPromisesCard, BrandStoryCard, IndustryClassificationCard, MissionVisionCard |
| `brand-kit/dashboard` | BrandKitCard, CreateBrandKitDialog |
| `brand-kit/export` | ExportPage, GPTExportResults, GPTExportWizard + types |
| `brand-kit/export/steps` | GapFillingStep, PersonaSelectionStep, RestrictionsStep, ReviewGenerateStep, SectionSelectionStep |
| `brand-kit/expression` | ExpressionPage, BrandToneCard, PreferredTerminologyCard, VerbalStyleCard, VisualStyleCard |
| `brand-kit/governance` | GovernancePage, BehavioralConstraintsCard, ComplianceNotesCard, DisclosurePolicyCard, NegativeDirectoryCard, UsageGuidelinesCard |
| `brand-kit/knowledge` | KnowledgeFilesPage, KnowledgeFileCard, SelectionSummaryCard |
| `brand-kit/overview` | OverviewPage, AISummaryCard, BasicInfoCard, BrandColorsCard, BrandVoiceCard, ColorInput, LogoAssetsCard, TypographyCard, UIColorsCard + more |
| `brand-kit/personality` | PersonalityEditor, BrandMoodsCard, BrandPrinciplesCard, BrandValuesCard, PersonalityTraitsCard |
| `brand-kit/personality/shared` | EditableCard, LibraryDropdownSelector + types |
| `brand-kit/personas` | PersonasPage, CreatePersonaDialog, PersonaOverviewCard, ViewPersonaDialog |
| `brand-kit/products` | ProductsPage, ProductCard, ProductDialog, ProductEmptyState + types |
| `brand-kit/share` | ShareBrandKitDialog |

---

## Key Shared Components Reference

### EmptyStateCard
Display empty state with icon, title, description, and action button.

```typescript
import { EmptyStateCard } from '@/components/brand-kit/shared';

<EmptyStateCard
  icon={Users}
  title="No items yet"
  description="Add your first item to get started"
  buttonText="Add Item"
  onAction={() => setDialogOpen(true)}
/>
```

### ListInputCard
Input field with list of items and add/remove functionality.

```typescript
import { ListInputCard } from '@/components/brand-kit/shared';

<ListInputCard
  label="Tags"
  items={tags}
  value={newTag}
  setValue={setNewTag}
  placeholder="Add a tag..."
  onAdd={handleAdd}
  onRemove={handleRemove}
/>
```

### TextareaCard
Card wrapper for textarea inputs with title and description.

```typescript
import { TextareaCard } from '@/components/brand-kit/shared';

<TextareaCard
  title="Brand Story"
  description="Tell your brand's narrative"
  placeholder="Enter your story..."
  value={story}
  onChange={setStory}
  rows={6}
/>
```

### SaveStatusHeader
Header showing save status with manual save button.

```typescript
import { SaveStatusHeader } from '@/components/brand-kit/shared';

<SaveStatusHeader
  autoSaveEnabled={autoSaveEnabled}
  hasUnsavedChanges={hasUnsavedChanges}
  isSaving={isSaving}
  onSave={manualSave}
/>
```

---

## Rules for AI Agents

1. **Check for barrel files first** - Before creating imports, check if a barrel file exists
2. **Update barrel files** - When creating new components in existing folders, add them to the barrel
3. **Create barrel files** - When creating new component folders with 2+ files
4. **Use relative imports** - Within the same section folder (e.g., `'../shared'`)
5. **Use absolute imports** - When importing across sections (e.g., `'@/components/brand-kit/shared'`)
6. **Export types separately** - Use `export type { }` for TypeScript types
7. **Keep exports alphabetized** - Easier to scan and maintain
8. **Don't over-export** - Only export components meant for external use

---

## Creating New Features Checklist

When adding a new feature section:

1. [ ] Create the component folder (e.g., `src/components/brand-kit/new-feature/`)
2. [ ] Create components in the folder
3. [ ] Create `index.ts` with exports for all public components
4. [ ] Create `types.ts` if needed, export types from index
5. [ ] Update parent barrel file if one exists
6. [ ] Use barrel imports in consuming code

---

## Audit Log

**Last audited:** 2025-12-17

All imports in the codebase have been verified to use barrel files consistently. Files updated:
- `src/App.tsx` - Updated to use `EditLayout` from shared barrel
- `src/pages/Dashboard.tsx` - Consolidated dashboard component imports
- `src/components/layout/AppSidebar.tsx` - Updated dashboard import
- `src/components/layout/DashboardLayout.tsx` - Updated overview import
- `src/components/brand-kit/governance/GovernancePage.tsx` - Updated shared import
- `src/components/brand-kit/expression/ExpressionPage.tsx` - Updated shared import
- `src/components/brand-kit/overview/BrandKitOverviewDropdown.tsx` - Updated share import
- `src/components/brand-kit/overview/OverviewPage.tsx` - Updated personas and share imports
- `src/components/brand-kit/pages/index.tsx` - Fixed duplicate exports, added ErrorBoundary wrappers

---

## ESLint Enforcement

Barrel file usage is enforced via ESLint's `no-restricted-imports` rule. Direct file imports will trigger errors:

### Error Example
```
error  'Import from '@/components/brand-kit/shared' barrel file instead.'  no-restricted-imports

// This will fail:
import { EmptyStateCard } from '@/components/brand-kit/shared/EmptyStateCard';

// Fix by importing from barrel:
import { EmptyStateCard } from '@/components/brand-kit/shared';
```

### Enforced Paths
The following paths require barrel imports:
- `@/components/brand-kit/shared/*`
- `@/components/brand-kit/audience/*`
- `@/components/brand-kit/core/*`
- `@/components/brand-kit/dashboard/*`
- `@/components/brand-kit/export/*`
- `@/components/brand-kit/expression/*`
- `@/components/brand-kit/governance/*`
- `@/components/brand-kit/knowledge/*`
- `@/components/brand-kit/overview/*`
- `@/components/brand-kit/personality/*`
- `@/components/brand-kit/personas/*`
- `@/components/brand-kit/products/*`
- `@/components/brand-kit/share/*`
- `@/lib/storage/*`

### How to Fix Violations
1. Identify the barrel file for the path (remove the filename)
2. Import from the barrel instead of the specific file
3. Ensure the component is exported in the barrel's `index.ts`

---

## Related Documentation

- [Code Conventions](./CODE_CONVENTIONS.md) - Full coding patterns and conventions
