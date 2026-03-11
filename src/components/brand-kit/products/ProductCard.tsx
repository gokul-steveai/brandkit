import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from './types';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <Card className="border-2 border-border group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            {product.type && (
              <Badge variant="outline" className="mt-1">{product.type}</Badge>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => product.id && onDelete(product.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        {product.usp && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">USP</p>
            <p className="text-sm">{product.usp}</p>
          </div>
        )}
        {product.key_benefits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.key_benefits.slice(0, 3).map((benefit, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{benefit}</Badge>
            ))}
            {product.key_benefits.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{product.key_benefits.length - 3}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
