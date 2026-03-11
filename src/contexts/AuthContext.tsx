import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'viewer' | 'author' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch role after auth state change
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setRole(data?.role as AppRole);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('viewer'); // Default to viewer if error
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to log auth events (fire and forget)
  const logAuthEvent = (action: string, userId?: string, email?: string, status = 'success') => {
    supabase.functions.invoke('log-auth-event', {
      body: { action, user_id: userId, email, status }
    }).catch(err => console.error('Failed to log auth event:', err));
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      logAuthEvent('login', data.user.id, email, 'success');
    } else {
      logAuthEvent('login', undefined, email, 'error');
    }
    
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName || '' }
      }
    });
    
    if (!error && data.user) {
      logAuthEvent('signup', data.user.id, email, 'success');
    } else {
      logAuthEvent('signup', undefined, email, 'error');
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const userId = user?.id;
    const email = user?.email;
    
    await supabase.auth.signOut();
    
    if (userId) {
      logAuthEvent('logout', userId, email, 'success');
    }
    
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    logAuthEvent('password_reset_request', undefined, email, error ? 'error' : 'success');
    
    return { error: error as Error | null };
  };

  // Role-based permissions
  const canCreate = role === 'author' || role === 'admin';
  const canEdit = role === 'author' || role === 'admin';
  const canDelete = role === 'author' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      canCreate,
      canEdit,
      canDelete,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
