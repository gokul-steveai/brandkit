import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
import { z } from 'zod';
import { AuthNavbar, PasswordInput } from '@/components/auth';
import { Check, Shield, Zap, Users, FileText, Sparkles, UserPlus, AlertCircle, X } from 'lucide-react';
import { validateInvitation, acceptInvitation } from '@/hooks/useBrandKitInvitations';
import { SEOHead } from '@/components/seo';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from '@/components/ui/separator';

const emailSchema = z.string().email('Invalid email address');

// Strong password validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const REMEMBER_EMAIL_KEY = 'brandkitos_remember_email';

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
  if (score <= 4) return { label: 'Medium', color: 'bg-amber-500', width: '66%' };
  return { label: 'Strong', color: 'bg-green-500', width: '100%' };
}

function getPasswordRequirements(password: string) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
    { label: 'Contains special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

const features = [
  { icon: Zap, text: 'AI-powered brand management' },
  { icon: FileText, text: 'Export to GPT and Claude' },
  { icon: Users, text: 'Unlimited collaborators' },
  { icon: Shield, text: 'Enterprise-grade security' },
  { icon: Sparkles, text: 'Smart brand consistency' },
];

interface InvitationData {
  brandKitId: string;
  brandKitName: string;
  inviterName: string;
  role: string;
  email?: string;
}

export function SignUp() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  
  // Invitation state
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(!!inviteToken);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Validate invitation token on mount
  useEffect(() => {
    async function checkInvitation() {
      if (!inviteToken) return;
      
      setInvitationLoading(true);
      try {
        const result = await validateInvitation(inviteToken);
        
        if (result.valid && result.invitation) {
          setInvitationData({
            brandKitId: result.invitation.brandKitId,
            brandKitName: result.invitation.brandKitName,
            inviterName: result.invitation.inviterName,
            role: result.invitation.role,
            email: result.invitation.email,
          });
          // Pre-fill email if provided
          if (result.invitation.email) {
            setFormData(prev => ({ ...prev, email: result.invitation.email }));
          }
        } else {
          const errorMessages: Record<string, string> = {
            'expired': 'This invitation link has expired. Please ask for a new one.',
            'already_used': 'This invitation link has already been used.',
            'not_found': 'This invitation link is invalid or no longer exists.',
          };
          setInvitationError(errorMessages[result.error] || 'Invalid invitation link.');
        }
      } catch (error) {
        setInvitationError('Failed to validate invitation. Please try again.');
      } finally {
        setInvitationLoading(false);
      }
    }
    
    checkInvitation();
  }, [inviteToken]);

  useEffect(() => {
    if (user) {
      // If user is logged in and has an invitation, accept it
      if (inviteToken && invitationData) {
        acceptInvitationAndRedirect();
      } else {
        navigate('/dashboard');
      }
    }
    // Load saved email if exists and no invitation email
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail && !invitationData?.email) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, [user, navigate, inviteToken, invitationData]);

  const acceptInvitationAndRedirect = async () => {
    if (!inviteToken) return;
    
    try {
      const result = await acceptInvitation(inviteToken);
      if (result.success) {
        toast({ title: 'Welcome!', description: `You've joined ${invitationData?.brandKitName}.` });
        navigate(`/brand-kits/${result.brandKitId}`);
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/dashboard');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = () => {
    try {
      emailSchema.parse(formData.email);
      passwordSchema.parse(formData.password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.errors[0].message, variant: 'destructive' });
      }
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);

    if (error) {
      setIsLoading(false);
      const errorMessage = error.message.includes('already registered')
        ? 'This email is already registered. Please sign in instead.'
        : error.message;
      toast({ title: 'Sign up failed', description: errorMessage, variant: 'destructive' });
    } else {
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      
      // If there's an invitation, accept it
      if (inviteToken) {
        try {
          const result = await acceptInvitation(inviteToken);
          if (result.success) {
            toast({ title: 'Welcome!', description: `You've joined ${invitationData?.brandKitName}.` });
            setIsLoading(false);
            navigate(`/brand-kits/${result.brandKitId}`);
            return;
          }
        } catch {
          // Continue to dashboard if accepting fails
        }
      }
      
      toast({ title: 'Account created!', description: 'Welcome to Brand Kit OS!' });
      setIsLoading(false);
      navigate('/dashboard');
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // Show loading state while validating invitation
  if (invitationLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AuthNavbar />
        <div className="flex min-h-screen pt-16 items-center justify-center">
          <Card className="w-full max-w-md border-2 border-border shadow-md">
            <CardHeader className="text-center">
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state for invalid invitation
  if (inviteToken && invitationError) {
    return (
      <div className="min-h-screen bg-background">
        <AuthNavbar />
        <div className="flex min-h-screen pt-16 items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-destructive/50 shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl">Invalid Invitation</CardTitle>
              <CardDescription>{invitationError}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link to="/signup">Create a new account</Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/signin" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Create Account - Free Trial"
        description="Start your free trial of Brand Kit OS. Build AI-native brand kits for ChatGPT, Claude, and 50+ AI platforms."
        canonicalUrl="/signup"
        keywords={['sign up', 'free trial', 'brand kit account', 'AI brand management']}
      />
      <AuthNavbar />
      
      <div className="flex min-h-screen pt-16">
        {/* Left Panel - Benefits or Invitation Info */}
        <div className="hidden lg:flex lg:w-1/2 bg-muted/30 items-center justify-center p-12">
          <div className="max-w-md space-y-8">
            {invitationData ? (
              <>
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-4">
                    <UserPlus className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold mb-4">You've been invited!</h1>
                  <p className="text-muted-foreground text-lg">
                    <span className="font-medium text-foreground">{invitationData.inviterName}</span> invited you to collaborate on{' '}
                    <span className="font-medium text-foreground">"{invitationData.brandKitName}"</span> as{' '}
                    {invitationData.role === 'admin' ? 'an' : 'a'}{' '}
                    <span className="font-medium text-foreground capitalize">{invitationData.role}</span>.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                      <Check className="h-5 w-5 text-chart-2" />
                    </div>
                    <span className="text-foreground">Instant access to the brand kit</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                      <Check className="h-5 w-5 text-chart-2" />
                    </div>
                    <span className="text-foreground">Collaborate in real-time</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                      <Check className="h-5 w-5 text-chart-2" />
                    </div>
                    <span className="text-foreground">No credit card required</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-3xl font-bold mb-4">Create your free account</h1>
                  <p className="text-muted-foreground text-lg">
                    Get started with Brand Kit OS today. No credit card required.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-foreground">{feature.text}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-chart-2" />
                    <span>Free forever plan available</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Check className="h-4 w-4 text-chart-2" />
                    <span>10 free tokens to get started</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Check className="h-4 w-4 text-chart-2" />
                    <span>Upgrade or cancel anytime</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-8">
          <Card className="w-full max-w-md border-2 border-border shadow-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                {invitationData ? 'Join the Team' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {invitationData 
                  ? `Create your account to join "${invitationData.brandKitName}"`
                  : 'Start your free trial today'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>
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
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    showStrengthIndicator={!!formData.password}
                    strengthData={passwordStrength}
                  />
                  {formData.password ? (
                    <div className="space-y-1 mt-2">
                      {getPasswordRequirements(formData.password).map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {req.met ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Must be 8+ characters with uppercase, number, and special character
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rememberMe" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    Remember my email for next time
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                  {isLoading ? 'Creating account...' : (invitationData ? 'Create Account & Join' : 'Create Account')}
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
                Already have an account?{' '}
                <Link to="/signin" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
