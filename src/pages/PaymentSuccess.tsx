import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { SEOHead } from '@/components/seo';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetch } = useSubscription();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentType, setPaymentType] = useState<'subscription' | 'tokens'>('subscription');

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const type = searchParams.get('type');
      
      setPaymentType(type === 'tokens' ? 'tokens' : 'subscription');

      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          setIsSuccess(true);
          if (type !== 'tokens') {
            await supabase.functions.invoke('check-subscription');
          }
          await refetch();
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, refetch]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SEOHead title="Verifying Payment" description="Verifying your payment." noindex />
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title="Payment Successful" description="Your payment has been processed." noindex />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-chart-2/20 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-chart-2" />
          </div>
          <CardTitle className="text-2xl">
            {isSuccess ? 'Payment Successful!' : 'Payment Received'}
          </CardTitle>
          <CardDescription>
            {paymentType === 'tokens' 
              ? 'Your tokens have been added to your account.'
              : 'Your subscription has been activated.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {paymentType === 'tokens'
              ? 'You can now use your additional tokens for AI features.'
              : 'Enjoy your new plan features! Your account has been upgraded.'}
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings?tab=billing')} 
              className="w-full"
            >
              View Billing Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentSuccess;
