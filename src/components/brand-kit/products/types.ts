export interface Product {
  id?: string;
  brand_kit_id: string;
  name: string;
  type: string;
  description: string;
  usp: string;
  key_benefits: string[];
  competitive_differentiation: string;
  cost: number | null;
  special_pricing: string;
}

export const emptyProduct: Omit<Product, 'brand_kit_id'> = {
  name: '',
  type: '',
  description: '',
  usp: '',
  key_benefits: [],
  competitive_differentiation: '',
  cost: null,
  special_pricing: ''
};
