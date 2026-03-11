import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/useToast';
import { z } from 'zod';
import { AuthNavbar, PasswordInput } from '@/components/auth';
import { Shield, ArrowLeft } from 'lucide-react';
import { SEOHead } from '@/components/seo';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from '@/components/ui/separator';

const emailSchema = z.string().email('Invalid email address');
// Simple password validation for sign-in (just check it's not empty)
// Strong password validation is only enforced on sign-up
const signInPasswordSchema = z.string().min(1, 'Password is required');

const REMEMBER_EMAIL_KEY = 'brandkitos_remember_email';

export function SignIn() {
  const { user, signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    // Load saved email if exists
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = () => {
    try {
      emailSchema.parse(formData.email);
      signInPasswordSchema.parse(formData.password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.errors[0].message, variant: 'destructive' });
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(formData.email, formData.password);
    setIsLoading(false);

    if (error) {
      toast({ 
        title: 'Sign in failed', 
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.' 
          : error.message, 
        variant: 'destructive' 
      });
    } else {
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      const redirectUrl = searchParams.get('redirect')

      if(redirectUrl) {
        window.location.href = redirectUrl
      }

      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(resetEmail);
    } catch {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setIsResettingPassword(true);
    const { error } = await resetPassword(resetEmail);
    setIsResettingPassword(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Check your email', 
        description: 'We sent you a password reset link. Please check your inbox.' 
      });
      setShowForgotPassword(false);
      setResetEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Sign In"
        description="Sign in to manage your AI-native brand kits. Access your brand guidelines, personas, and exports."
        canonicalUrl="/signin"
        noindex
      />
      <AuthNavbar />
      
      <div className="flex min-h-screen pt-16">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-muted/30 items-center justify-center p-12">
          <div className="max-w-md space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-4">Welcome back</h1>
              <p className="text-muted-foreground text-lg">
                Sign in to continue managing your brand kits and AI personas.
              </p>
            </div>
            
            <div className="p-6 bg-card rounded-lg border border-border">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Your data is secure</h3>
                  <p className="text-sm text-muted-foreground">
                    Brand Kit OS uses enterprise-grade encryption to protect your brand assets and information.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Create one for free
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-8">
          <Card className="w-full max-w-md border-2 border-border shadow-md">
            {!showForgotPassword ? (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                  <CardDescription>Sign in to manage your brand kits</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotPassword(true);
                            setResetEmail(formData.email);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <PasswordInput
                        id="password"
                        name="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="rememberMe" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                        Remember my email
                      </Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>

                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      or
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || isGoogleLoading}
                    onClick={async () => {
                      setIsGoogleLoading(true);
                      const { error } = await lovable.auth.signInWithOAuth('google', {
                        redirect_uri: window.location.origin,
                      });
                      if (error) {
                        toast({ title: 'Google sign-in failed', description: String(error), variant: 'destructive' });
                        setIsGoogleLoading(false);
                      }
                    }}
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                  </Button>
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-medium text-primary hover:underline">
                      Sign up
                    </Link>
                  </p>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </button>
                  <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                  <CardDescription>
                    Enter your email address and we'll send you a link to reset your password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Email</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isResettingPassword}>
                      {isResettingPassword ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
