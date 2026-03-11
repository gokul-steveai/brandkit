import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TOKEN_PACKS } from '@/lib/subscription/constants';

interface TokenPurchaseCardProps {
  /** When true, renders only the token pack grid without Card wrapper */
  embedded?: boolean;
}

export function TokenPurchaseCard({ embedded = false }: TokenPurchaseCardProps) {
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handlePurchase = async (pack: typeof TOKEN_PACKS[number]) => {
    try {
      setLoadingPack(pack.id);
      
      const { data, error } = await supabase.functions.invoke('create-token-purchase', {
        body: {
          priceId: pack.priceId,
          tokenPackId: pack.id,
          tokensAmount: pack.tokens,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL received');

      // Open Stripe Checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating token purchase:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPack(null);
    }
  };

  const tokenPacksGrid = (
    <div className="grid gap-4 sm:grid-cols-3">
      {TOKEN_PACKS.map((pack) => (
        <div
          key={pack.id}
          className="relative p-4 border-2 rounded-lg border-border hover:border-primary/50 transition-colors"
        >
          <Badge variant="secondary" className="absolute -top-2 right-2">
            Best Value
          </Badge>
          <div className="text-center space-y-2">
            <p className="text-3xl font-bold">{pack.tokens}</p>
            <p className="text-sm text-muted-foreground">tokens</p>
            <p className="text-xl font-semibold">${pack.price}</p>
            <p className="text-xs text-muted-foreground">
              ${(pack.price / pack.tokens).toFixed(2)}/token
            </p>
          </div>
          <Button
            className="w-full mt-4"
            variant="outline"
            onClick={() => handlePurchase(pack)}
            disabled={loadingPack !== null}
          >
            {loadingPack === pack.id ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Buy Now
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );

  // When embedded, just return the grid without Card wrapper
  if (embedded) {
    return tokenPacksGrid;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Buy Token Packs
        </CardTitle>
        <CardDescription>
          Need more tokens? Purchase additional tokens anytime
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tokenPacksGrid}
      </CardContent>
    </Card>
  );
}
