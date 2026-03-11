import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BrandKitMembership {
  brandKitId: string;
  brandKitName: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  ownerId: string;
  ownerName: string | null;
  isOwner: boolean;
  status: string | null;
}

export function useBrandKitMemberships() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['brand-kit-memberships', user?.id],
    queryFn: async (): Promise<BrandKitMembership[]> => {
      if (!user) return [];

      // 1. Fetch brand kits owned by the user
      const { data: ownedKits, error: ownedError } = await supabase
        .from('brand_kits')
        .select('id, name, user_id, status')
        .eq('user_id', user.id);

      if (ownedError) throw ownedError;

      // 2. Fetch brand kits user is a member of (not owner)
      const { data: membershipData, error: memberError } = await supabase
        .from('brand_kit_members')
        .select(`
          role,
          brand_kit_id,
          brand_kits!inner (
            id,
            name,
            user_id,
            status
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // 3. Get unique owner IDs from memberships to fetch their profiles
      const ownerIds = new Set<string>();
      membershipData?.forEach((m) => {
        const brandKit = m.brand_kits as unknown as { id: string; name: string; user_id: string; status: string | null };
        if (brandKit?.user_id && brandKit.user_id !== user.id) {
          ownerIds.add(brandKit.user_id);
        }
      });

      // 4. Fetch owner profiles if there are any
      let ownerProfiles: Record<string, string | null> = {};
      if (ownerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(ownerIds));
        
        profiles?.forEach((p) => {
          ownerProfiles[p.id] = p.full_name;
        });
      }

      // 5. Combine owned kits (role = 'owner')
      const ownedMemberships: BrandKitMembership[] = (ownedKits || []).map((kit) => ({
        brandKitId: kit.id,
        brandKitName: kit.name,
        role: 'owner' as const,
        ownerId: kit.user_id,
        ownerName: null, // It's the current user
        isOwner: true,
        status: kit.status,
      }));

      // 6. Combine memberships (exclude if user is also owner - shouldn't happen but safeguard)
      const ownedKitIds = new Set(ownedKits?.map((k) => k.id) || []);
      const memberMemberships: BrandKitMembership[] = (membershipData || [])
        .filter((m) => {
          const brandKit = m.brand_kits as unknown as { id: string; name: string; user_id: string; status: string | null };
          return brandKit && !ownedKitIds.has(brandKit.id);
        })
        .map((m) => {
          const brandKit = m.brand_kits as unknown as { id: string; name: string; user_id: string; status: string | null };
          return {
            brandKitId: brandKit.id,
            brandKitName: brandKit.name,
            role: m.role as 'admin' | 'editor' | 'viewer',
            ownerId: brandKit.user_id,
            ownerName: ownerProfiles[brandKit.user_id] || null,
            isOwner: false,
            status: brandKit.status,
          };
        });

      // 7. Combine and sort: owned first, then by name
      return [...ownedMemberships, ...memberMemberships].sort((a, b) => {
        if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
        return a.brandKitName.localeCompare(b.brandKitName);
      });
    },
    enabled: !!user,
  });
}
