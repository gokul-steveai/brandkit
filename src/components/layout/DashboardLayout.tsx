import { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBrandKit } from '@/hooks/useBrandKits';
import { PageHeaderProvider, usePageHeader } from '@/hooks/usePageHeader';
import { SupportTicketDialog, FeedbackDialog } from '@/components/support';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Settings, LogOut, ChevronDown, HelpCircle, LifeBuoy, BookOpen, MessageSquare, Users, Shield } from 'lucide-react';
import { ShareBrandKitDialog } from '@/components/brand-kit/share';

const getPageTitle = (pathname: string): string => {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/security') return 'Security';
  if (pathname === '/documentation') return 'Documentation';
  if (pathname === '/brand-kits/new') return 'Create Brand Kit';
  if (pathname.includes('/edit/overview')) return 'Overview';
  if (pathname.includes('/edit/core')) return 'Core';
  if (pathname.includes('/edit/personality')) return 'Personality';
  if (pathname.includes('/edit/expression')) return 'Expression';
  if (pathname.includes('/edit/products')) return 'Products';
  if (pathname.includes('/edit/audience')) return 'Target Audience';
  if (pathname.includes('/edit/governance')) return 'Governance';
  if (pathname.includes('/edit/personas')) return 'Personas';
  if (pathname.includes('/edit/knowledge')) return 'Knowledge Files';
  if (pathname.includes('/edit/export')) return 'Export';
  if (pathname.match(/^\/brand-kits\/[^/]+\/edit$/)) return 'Edit Brand Kit';
  if (pathname.match(/^\/brand-kits\/[^/]+$/)) return 'Brand Kit Details';
  return 'Dashboard';
};

function DashboardContent() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, getInitials } = useUserProfile();
  const { headerInfo } = usePageHeader();
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Collapse sidebar by default on dashboard, expand on brand kit edit pages
  const isDashboardPage = location.pathname === '/dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(!isDashboardPage);

  // Extract brand kit ID from URL if on edit route
  const isEditingBrandKit = location.pathname.includes('/brand-kits/') && location.pathname.includes('/edit');
  const brandKitId = isEditingBrandKit ? location.pathname.split('/brand-kits/')[1]?.split('/')[0] : null;
  const { data: brandKit } = useBrandKit(brandKitId || '');

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    }
  }, [user, isLoading, navigate]);

  // Update sidebar state when route changes
  useEffect(() => {
    setSidebarOpen(!isDashboardPage);
  }, [isDashboardPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <div className="w-64 shadow-[2px_0_8px_0_rgba(0,0,0,0.06)] p-4 hidden md:block">
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pageTitle = getPageTitle(location.pathname);

  return (
    <TooltipProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className="h-screen flex w-full overflow-hidden">
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-y-auto">
            <header className="sticky top-0 z-10 bg-background h-16 flex items-center shadow-[0_2px_8px_0_rgba(0,0,0,0.06)] px-4">
              {/* Left section */}
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Toggle Sidebar</TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold truncate">{pageTitle}</h1>
                  {headerInfo?.subtitle && (
                    <span className="text-sm text-muted-foreground hidden sm:inline truncate">{headerInfo.subtitle}</span>
                  )}
                  {headerInfo?.badge && (
                    <Badge variant={headerInfo.badge.variant || 'outline'} className="text-xs hidden sm:inline-flex shrink-0">
                      {headerInfo.badge.text}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Center section - Clickable link to Overview (hidden on mobile) */}
              {isEditingBrandKit && brandKit && (
                <div className="flex-shrink-0 mx-4 hidden md:flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(`/brand-kits/${brandKit.id}/edit/overview`)}
                        className="flex items-center gap-3 h-10 px-4 max-w-xs border border-border/30 rounded-md hover:bg-accent transition-colors"
                      >
                        <span className="font-medium truncate">{brandKit.name}</span>
                        <Progress value={brandKit.completion_percentage || 0} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground">{brandKit.completion_percentage || 0}%</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Go to Overview</TooltipContent>
                  </Tooltip>
                </div>
              )}
              
              {/* Right section */}
              <div className="flex items-center gap-2 flex-1 justify-end">
                {/* Share Button - only on brand kit edit pages */}
                {isEditingBrandKit && brandKit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShareDialogOpen(true)}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
                      >
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Share Brand Kit</TooltipContent>
                  </Tooltip>
                )}

                {/* Help Icon */}
                <Tooltip>
                  <Popover>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors">
                          <HelpCircle className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Help & Support</TooltipContent>
                    <PopoverContent align="end" className="w-48 p-2">
                      <div className="flex flex-col gap-1">
                        <a 
                          href="/documentation" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                        >
                          <BookOpen className="h-4 w-4" />
                          Documentation
                        </a>
                        <button 
                          onClick={() => setSupportDialogOpen(true)}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors w-full text-left"
                        >
                          <LifeBuoy className="h-4 w-4" />
                          File Support Ticket
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </Tooltip>

                {/* Feedback Icon */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setFeedbackDialogOpen(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
                    >
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Share Feedback</TooltipContent>
                </Tooltip>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 hover:bg-accent px-2 py-1.5 rounded-md transition-colors">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="bg-muted text-xs">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden sm:inline">
                        {profile?.full_name || user.email}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/security" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <div className="flex-1 p-6">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Dialogs */}
        <SupportTicketDialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen} />
        <FeedbackDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen} />
        {brandKit && (
          <ShareBrandKitDialog 
            open={shareDialogOpen} 
            onOpenChange={setShareDialogOpen} 
            brandKitId={brandKit.id}
            brandKitName={brandKit.name}
            ownerId={brandKit.user_id}
          />
        )}
      </SidebarProvider>
    </TooltipProvider>
  );
}

export function DashboardLayout() {
  return (
    <PageHeaderProvider>
      <DashboardContent />
    </PageHeaderProvider>
  );
}
