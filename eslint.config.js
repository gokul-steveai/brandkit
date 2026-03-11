import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Barrel file enforcement patterns
const barrelFilePatterns = [
  // Brand kit sections
  { group: ["@/components/brand-kit/shared/*"], message: "Import from '@/components/brand-kit/shared' barrel file instead." },
  { group: ["@/components/brand-kit/audience/*"], message: "Import from '@/components/brand-kit/audience' barrel file instead." },
  { group: ["@/components/brand-kit/core/*"], message: "Import from '@/components/brand-kit/core' barrel file instead." },
  { group: ["@/components/brand-kit/dashboard/*"], message: "Import from '@/components/brand-kit/dashboard' barrel file instead." },
  { group: ["@/components/brand-kit/export/*"], message: "Import from '@/components/brand-kit/export' barrel file instead." },
  { group: ["@/components/brand-kit/expression/*"], message: "Import from '@/components/brand-kit/expression' barrel file instead." },
  { group: ["@/components/brand-kit/governance/*"], message: "Import from '@/components/brand-kit/governance' barrel file instead." },
  { group: ["@/components/brand-kit/knowledge/*"], message: "Import from '@/components/brand-kit/knowledge' barrel file instead." },
  { group: ["@/components/brand-kit/overview/*"], message: "Import from '@/components/brand-kit/overview' barrel file instead." },
  { group: ["@/components/brand-kit/personality/*"], message: "Import from '@/components/brand-kit/personality' barrel file instead." },
  { group: ["@/components/brand-kit/personas/*"], message: "Import from '@/components/brand-kit/personas' barrel file instead." },
  { group: ["@/components/brand-kit/products/*"], message: "Import from '@/components/brand-kit/products' barrel file instead." },
  { group: ["@/components/brand-kit/share/*"], message: "Import from '@/components/brand-kit/share' barrel file instead." },
  // Lib sections
  { group: ["@/lib/storage/*"], message: "Import from '@/lib/storage' barrel file instead." },
];

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-imports": ["error", { patterns: barrelFilePatterns }],
    },
  },
);
