import { useState, useEffect } from 'react';

import { Plus, Target, Heart, Megaphone, Users, Shield, ChevronRight, Share2, FileText, Lock, Globe, Image, ChevronsUpDown } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandKit, useBrandKits } from '@/hooks/useBrandKits';
import { useSubscription } from '@/hooks/useSubscription';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import brandKitIcon from '@/assets/brand-kit-icon.png';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CreateBrandKitDialog } from '@/components/brand-kit/dashboard';
import { TokenBalanceIndicator } from '@/components/subscription/TokenBalanceIndicator';
import type { FeatureKey } from '@/lib/subscription/constants';
const LAST_BRAND_KIT_KEY = 'lastActiveBrandKitId';
interface NavItem {
  label: string;
  icon: typeof Target;
  path: string;
  description: string;
  feature?: FeatureKey;
}
const brandKitNavItems: NavItem[] = [{
  label: 'Core',
  icon: Target,
  path: 'core',
  description: 'Mission, Vision, Products',
  feature: 'core'
}, {
  label: 'Personality',
  icon: Heart,
  path: 'personality',
  description: 'Traits, Values, Moods',
  feature: 'personality'
}, {
  label: 'Expression',
  icon: Megaphone,
  path: 'expression',
  description: 'Tone, Style, Terminology',
  feature: 'expression'
}, {
  label: 'Personas & Audience',
  icon: Users,
  path: 'audience',
  description: 'Personas, Demographics',
  feature: 'audience'
}, {
  label: 'Governance',
  icon: Shield,
  path: 'governance',
  description: 'Constraints, Guidelines',
  feature: 'governance'
}, {
  label: 'Knowledge Files',
  icon: FileText,
  path: 'knowledge',
  description: 'Supporting documents',
  feature: 'knowledgeFiles'
}, {
  label: 'Visual Assets',
  icon: Image,
  path: 'visual-assets',
  description: 'Images and media',
  feature: 'visualAssets'
}, {
  label: 'Web',
  icon: Globe,
  path: 'web',
  description: 'Social, Competitors, SEO',
  feature: 'social'
}, {
  label: 'Export',
  icon: Share2,
  path: 'export',
  description: 'Export for AI tools',
  feature: 'export'
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const {
    canCreate
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [lastBrandKitId, setLastBrandKitId] = useState<string | null>(null);

  // Check if we're on a brand kit edit route or settings page
  const isEditingBrandKit = location.pathname.includes('/brand-kits/') && location.pathname.includes('/edit');
  const isSettingsPage = location.pathname.startsWith('/settings');
  const currentBrandKitId = isEditingBrandKit ? location.pathname.split('/brand-kits/')[1]?.split('/')[0] : null;

  // Determine which brand kit ID to use for the sidebar
  const activeBrandKitId = currentBrandKitId || (isSettingsPage ? lastBrandKitId : null);
  const {
    data: brandKit
  } = useBrandKit(activeBrandKitId || '');

  // Fetch all brand kits for the selector
  const { brandKits: allBrandKits } = useBrandKits();

  // Use brand kit owner's subscription for feature access when viewing a brand kit
  const { canAccessFeature: userCanAccess } = useSubscription();
  const { canAccessFeature: brandKitCanAccess } = useBrandKitSubscription(activeBrandKitId || undefined);
  const canAccessFeature = activeBrandKitId ? brandKitCanAccess : userCanAccess;

  // Store brand kit ID in localStorage when on edit pages
  useEffect(() => {
    if (currentBrandKitId) {
      localStorage.setItem(LAST_BRAND_KIT_KEY, currentBrandKitId);
      setLastBrandKitId(currentBrandKitId);
    }
  }, [currentBrandKitId]);

  // Read from localStorage on mount and when on settings page
  useEffect(() => {
    if (isSettingsPage) {
      const storedId = localStorage.getItem(LAST_BRAND_KIT_KEY);
      setLastBrandKitId(storedId);
    }
  }, [isSettingsPage]);
  const handleDashboardClick = () => {
    localStorage.removeItem(LAST_BRAND_KIT_KEY);
    setLastBrandKitId(null);
  };
  const isActive = (path: string) => location.pathname === path;
  const isEditSectionActive = (section: string) => location.pathname.includes(`/edit/${section}`);

  // Show brand kit sidebar if editing or on settings with stored brand kit
  const showBrandKitSidebar = (isEditingBrandKit || isSettingsPage && lastBrandKitId) && brandKit;

  const handleBrandKitSelect = (kitId: string) => {
    navigate(`/brand-kits/${kitId}/edit/overview`);
  };

  return <Sidebar className="shadow-[2px_0_8px_0_rgba(0,0,0,0.06)]">
      <SidebarHeader className="h-16 px-3 flex flex-row items-center gap-3 shadow-[0_2px_8px_0_rgba(0,0,0,0.06)]">
        <NavLink to="/dashboard" onClick={handleDashboardClick} className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" title="Go to Dashboard">
          <img alt="BrandKitOS" className="h-9 w-auto object-contain" src={brandKitIcon} />
        </NavLink>
        {!collapsed && (
          showBrandKitSidebar ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="default" className="flex-1 min-w-0 justify-between gap-2 px-2 h-9">
                  <span className="truncate text-sm font-semibold">{brandKit.name}</span>
                  <ChevronsUpDown className="h-4 w-4 flex-shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {allBrandKits.map((kit) => (
                  <DropdownMenuItem
                    key={kit.id}
                    onClick={() => handleBrandKitSelect(kit.id)}
                    className={cn(kit.id === activeBrandKitId && 'bg-accent')}
                  >
                    <span className="truncate">{kit.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="font-bold text-base flex-1 truncate">Brand Kit OS</span>
          )
        )}
      </SidebarHeader>

      <SidebarContent className="p-2">
        {showBrandKitSidebar ? <>
            {/* Brand kit edit navigation */}
            <ul className="space-y-1">
              {brandKitNavItems.map((item) => {
            const isLocked = item.feature ? !canAccessFeature(item.feature) : false;
            return <li key={item.path}>
                    <NavLink to={`/brand-kits/${activeBrandKitId}/edit/${item.path}`} className={cn('flex items-center gap-3 px-3 py-3 text-sm transition-colors border-2 border-transparent', isEditSectionActive(item.path) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent hover:border-border', isLocked && 'opacity-60')}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs opacity-80 truncate">{item.description}</p>
                          </div>
                          {isLocked ? <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />}
                        </>}
                    </NavLink>
                  </li>;
          })}
            </ul>
          </> : <>
            {canCreate && !collapsed && <div className="mb-4 px-2">
                <Button onClick={() => setShowCreateDialog(true)} className="w-full justify-start gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  New Brand Kit
                </Button>
              </div>}

            {canCreate && collapsed && <div className="mb-4 flex justify-center">
                <Button onClick={() => setShowCreateDialog(true)} size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>}
            
            <CreateBrandKitDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
          </>}
      </SidebarContent>

      <SidebarFooter className="shadow-[0_-2px_8px_0_rgba(0,0,0,0.06)] p-2">
        {/* Token Balance Indicator */}
        <TokenBalanceIndicator collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>;
}