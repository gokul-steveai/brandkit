// Simplified data types for saved JSON (no id, is_library)

export interface PersonalityTraitData {
  title: string;
  description: string | null;
  tags: string[] | null;
}

export interface BrandValueData {
  name: string;
  description: string | null;
}

export interface BrandPrincipleData {
  name: string;
  action: string | null;
  tags: string[] | null;
  use_case: string | null;
}

export interface BrandMoodData {
  name: string;
  emotional_description: string | null;
  visual_descriptor: string | null;
  associated_tone: string | null;
}

// Library item types (from database, includes id and is_library)

export interface LibraryTrait {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  is_library: boolean;
}

export interface LibraryValue {
  id: string;
  name: string;
  description: string | null;
  is_library: boolean;
}

export interface LibraryPrinciple {
  id: string;
  name: string;
  action: string | null;
  tags: string[] | null;
  use_case: string | null;
  is_library: boolean;
}

export interface LibraryMood {
  id: string;
  name: string;
  emotional_description: string | null;
  visual_descriptor: string | null;
  associated_tone: string | null;
  is_library: boolean;
}
