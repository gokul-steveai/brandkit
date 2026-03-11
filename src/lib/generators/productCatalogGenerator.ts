interface Product {
  name: string;
  type?: string | null;
  description?: string | null;
  cost?: number | null;
  special_pricing?: string | null;
  usp?: string | null;
  competitive_differentiation?: string | null;
  key_benefits?: string[] | null;
}

export function generateProductCatalogMarkdown(brandName: string, products: Product[]): string {
  const lines: string[] = [];

  lines.push(`# Product Catalog: ${brandName}`);
  lines.push('');
  lines.push(`> Auto-generated product catalog for **${brandName}** (${products.length} product${products.length !== 1 ? 's' : ''})`);
  lines.push('');

  for (const product of products) {
    lines.push(`## ${product.name}`);
    lines.push('');

    if (product.type) lines.push(`**Type:** ${product.type}`);
    if (product.description) {
      lines.push('');
      lines.push(product.description);
    }
    lines.push('');

    if (product.usp) {
      lines.push(`**Unique Selling Proposition:** ${product.usp}`);
      lines.push('');
    }

    if (product.cost != null) {
      const priceStr = product.special_pricing
        ? `$${product.cost} (${product.special_pricing})`
        : `$${product.cost}`;
      lines.push(`**Price:** ${priceStr}`);
      lines.push('');
    }

    if (product.key_benefits && Array.isArray(product.key_benefits) && product.key_benefits.length > 0) {
      lines.push('**Key Benefits:**');
      for (const b of product.key_benefits) {
        lines.push(`- ${b}`);
      }
      lines.push('');
    }

    if (product.competitive_differentiation) {
      lines.push(`**Competitive Differentiation:** ${product.competitive_differentiation}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  lines.push(`*Last updated: ${new Date().toLocaleDateString()}*`);

  return lines.join('\n');
}
