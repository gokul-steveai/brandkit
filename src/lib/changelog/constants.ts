export const CHANGELOG_TAGS = {
  'brand-kit-core': { label: 'Brand Kit Core', colorClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'personality': { label: 'Personality', colorClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  'expression': { label: 'Expression', colorClass: 'bg-green-500/10 text-green-600 border-green-500/20' },
  'audience': { label: 'Audience', colorClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  'governance': { label: 'Governance', colorClass: 'bg-red-500/10 text-red-600 border-red-500/20' },
  'export': { label: 'Export', colorClass: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  'personas': { label: 'Personas', colorClass: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  'knowledge-files': { label: 'Knowledge Files', colorClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  'social': { label: 'Social', colorClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  'products': { label: 'Products', colorClass: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  'dashboard': { label: 'Dashboard', colorClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  'authentication': { label: 'Authentication', colorClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'api-mcp': { label: 'API & MCP', colorClass: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  'documentation': { label: 'Documentation', colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  'settings': { label: 'Settings', colorClass: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  'billing': { label: 'Billing', colorClass: 'bg-lime-500/10 text-lime-600 border-lime-500/20' },
} as const;

export type ChangelogTagKey = keyof typeof CHANGELOG_TAGS;

export const ENTRY_TYPES = {
  'new_release': { 
    label: 'New Release', 
    badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    icon: 'Sparkles' as const,
  },
  'improvement': { 
    label: 'Improvement', 
    badgeClass: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    icon: 'Wrench' as const,
  },
  'retired': { 
    label: 'Retired', 
    badgeClass: 'bg-red-500/15 text-red-600 border-red-500/30',
    icon: 'AlertTriangle' as const,
  },
} as const;

export type EntryType = keyof typeof ENTRY_TYPES;

export const FILTER_TABS = [
  { value: 'all', label: 'All', icon: 'Globe' as const },
  { value: 'new_release', label: 'New Releases', icon: 'Sparkles' as const },
  { value: 'improvement', label: 'Improvements', icon: 'Wrench' as const },
  { value: 'retired', label: 'Retired', icon: 'AlertTriangle' as const },
] as const;
