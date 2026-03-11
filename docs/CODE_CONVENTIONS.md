# Code Conventions

This document outlines the coding patterns and conventions used in this project.

## Table of Contents
- [Component Patterns](#component-patterns)
- [Hook Patterns](#hook-patterns)
- [File Structure](#file-structure)
- [CSS & Tailwind](#css--tailwind)
- [Type Patterns](#type-patterns)
- [Data Fetching](#data-fetching)
- [Supabase Integration](#supabase-integration)

---

## Component Patterns

### Props Interface Naming
Always define props interfaces with the `Props` suffix, placed directly above the component:

```tsx
// ✅ Correct
interface MyComponentProps {
  title: string;
  onSave: () => void;
}

export function MyComponent({ title, onSave }: MyComponentProps) {
  // ...
}

// ❌ Wrong - generic or missing interface
export function MyComponent({ title, onSave }: { title: string; onSave: () => void }) {
  // ...
}
```

### Named Exports
Always use named exports for components, never default exports:

```tsx
// ✅ Correct
export function MyComponent() { }
export const MyComponent = () => { }

// ❌ Wrong
export default function MyComponent() { }
```

### Shared Components
Before creating a new component, check `src/components/brand-kit/shared/` for reusable components:
- `EmptyStateCard` - Empty state displays with icon, title, description
- `ListInputCard` - List management with add/remove functionality
- `TextareaCard` - Text area with auto-save support
- `SaveStatusHeader` - Header with save status indicator
- `EditLayout` - Standard edit page layout
- `LibrarySelector` - Dropdown selector for library items

### Component Structure
```tsx
// 1. Imports (grouped: React, external libs, internal)
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useBrandKits } from '@/hooks/useBrandKits';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
}

// 3. Component definition
export function MyComponent({ title }: MyComponentProps) {
  // 4. Hooks first
  const { brandKitId } = useParams();
  const [state, setState] = useState('');
  
  // 5. Callbacks/handlers
  const handleClick = useCallback(() => {
    // ...
  }, []);
  
  // 6. Effects (if needed)
  
  // 7. Early returns (loading, error states)
  if (!brandKitId) return null;
  
  // 8. Main render
  return (
    <div>{title}</div>
  );
}
```

---

## Hook Patterns

### Naming Convention
- Custom hooks MUST start with `use`
- Use descriptive names: `useBrandKits`, `useAutoSave`, `useFileUpload`

### Options & Return Interfaces
Define explicit interfaces for complex hooks:

```tsx
// Options interface
interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

// Return interface
interface UseAutoSaveReturn {
  isSaving: boolean;
  hasChanges: boolean;
  lastSaved: Date | null;
  error: Error | null;
  saveNow: () => Promise<void>;
}

// Hook implementation
export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  // ...
}
```

### Hook Location
- **Global hooks**: `src/hooks/` - Used across multiple features
- **Feature-specific hooks**: Within feature folder or `src/lib/` subdirectories

---

## File Structure

### Brand Kit Feature Structure
```
src/components/brand-kit/
├── [feature]/
│   ├── index.ts          # Barrel file (REQUIRED)
│   ├── [Feature]Page.tsx # Main page component
│   ├── [Feature]Card.tsx # Feature-specific cards
│   ├── types.ts          # Feature-specific types (if needed)
│   └── shared/           # Feature-specific shared components (if needed)
├── shared/
│   ├── index.ts          # Barrel file for shared components
│   └── *.tsx             # Shared components
└── pages/
    └── index.tsx         # Central page exports
```

### Library Structure
```
src/lib/
├── [feature]/
│   ├── index.ts          # Barrel file
│   ├── constants.ts      # Feature constants
│   └── *.ts              # Feature utilities
```

### Import Order
1. React imports
2. External library imports
3. Internal absolute imports (`@/...`)
4. Relative imports (`./`, `../`)

---

## CSS & Tailwind

### HSL Color Variables
All colors MUST use HSL format and be defined in `index.css`:

```css
/* index.css */
:root {
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
}
```

### No Hardcoded Colors
NEVER use direct color values. Always use semantic tokens:

```tsx
// ✅ Correct - uses semantic tokens
<div className="bg-primary text-primary-foreground" />
<div className="bg-muted text-muted-foreground" />
<div className="border-border" />

// ❌ Wrong - hardcoded colors
<div className="bg-blue-500 text-white" />
<div className="bg-[#3b82f6]" />
```

### Available Semantic Tokens
- `background`, `foreground` - Base colors
- `primary`, `primary-foreground` - Primary actions
- `secondary`, `secondary-foreground` - Secondary elements
- `muted`, `muted-foreground` - Subtle backgrounds/text
- `accent`, `accent-foreground` - Accented elements
- `destructive`, `destructive-foreground` - Error/delete actions
- `border`, `input`, `ring` - Borders and focus states
- `card`, `card-foreground` - Card backgrounds
- `popover`, `popover-foreground` - Popover backgrounds

### Extending Tailwind
Custom values go in `tailwind.config.ts`, not inline:

```ts
// tailwind.config.ts
extend: {
  colors: {
    sidebar: {
      DEFAULT: "hsl(var(--sidebar-background))",
      foreground: "hsl(var(--sidebar-foreground))",
    }
  }
}
```

---

## Type Patterns

### Separate Types File
For complex features, create a `types.ts` file:

```tsx
// types.ts
export interface Product {
  id: string;
  name: string;
  description: string | null;
  // ...
}

export type ProductType = 'product' | 'service' | 'subscription';
```

### Constants with `as const`
Use `as const` for type-safe constant arrays:

```tsx
// constants.ts
export const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'] as const;
export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];

export const STORAGE_BUCKETS = {
  BRAND_KIT_ASSETS: 'brand-kit-assets',
  USER_AVATARS: 'user-avatars',
} as const;
```

### Database Types
Import types from the auto-generated Supabase types:

```tsx
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type BrandKit = Tables<'brand_kits'>;
type BrandKitInsert = TablesInsert<'brand_kits'>;
```

---

## Data Fetching

### TanStack Query Pattern
Use TanStack Query for all data fetching:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys - use consistent naming
const queryKeys = {
  brandKits: ['brand-kits'] as const,
  brandKit: (id: string) => ['brand-kits', id] as const,
};

// Query hook
export function useBrandKits() {
  return useQuery({
    queryKey: queryKeys.brandKits,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_kits')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}

// Mutation with cache invalidation
export function useCreateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newBrandKit: BrandKitInsert) => {
      const { data, error } = await supabase
        .from('brand_kits')
        .insert(newBrandKit)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brandKits });
    },
  });
}
```

### Auth Guard Pattern
Always check authentication before data operations:

```tsx
const { user } = useAuth();

const { data } = useQuery({
  queryKey: ['user-data', user?.id],
  queryFn: async () => {
    if (!user) throw new Error('Not authenticated');
    // fetch data...
  },
  enabled: !!user, // Only run when user exists
});
```

### Error Handling
Use toast notifications for user-facing errors:

```tsx
import { toast } from 'sonner';

const mutation = useMutation({
  mutationFn: async () => { /* ... */ },
  onError: (error) => {
    toast.error('Failed to save', {
      description: error.message,
    });
  },
  onSuccess: () => {
    toast.success('Saved successfully');
  },
});
```

---

## Supabase Integration

### Client Import
Always import from the integration file:

```tsx
import { supabase } from '@/integrations/supabase/client';
```

### Auto-Save Pattern
Use the `useAutoSave` hook for forms that should save automatically:

```tsx
import { useAutoSave } from '@/hooks/useAutoSave';

const { isSaving, hasChanges, saveNow } = useAutoSave({
  data: formData,
  onSave: async (data) => {
    const { error } = await supabase
      .from('table_name')
      .upsert(data);
    if (error) throw error;
  },
  debounceMs: 1000,
  enabled: !!brandKitId,
});
```

### File Upload Pattern
Use the `useFileUpload` hook for file operations:

```tsx
import { useFileUpload } from '@/lib/storage';

const { upload, remove, isUploading } = useFileUpload({
  bucket: 'brand-kit-assets',
  context: 'brand-kit',
  contextId: brandKitId,
});
```

---

## Related Documentation

- [Barrel Files Convention](./BARREL_FILES.md) - Import/export patterns
- [ESLint Rules](#) - Automated enforcement
