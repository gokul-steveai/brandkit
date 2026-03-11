/**
 * Collaboration limits per subscription tier
 * Shared between frontend and edge functions
 */
export const COLLABORATION_LIMITS = {
  free: { editors: 0, admins: 0, viewers: 0 },
  base: { editors: 1, admins: 0, viewers: 10 },
  premium: { editors: 5, admins: 2, viewers: 25 },
} as const;

export type SubscriptionTier = keyof typeof COLLABORATION_LIMITS;
export type CollaborationRole = 'editor' | 'admin' | 'viewer';

/**
 * Check if adding a member of a given role would exceed the plan limit
 * @param tier - The subscription tier of the brand kit owner
 * @param role - The role being added
 * @param currentCount - Current count of members with this role
 * @returns true if within limit, false if would exceed
 */
export function canAddCollaborator(
  tier: SubscriptionTier,
  role: CollaborationRole,
  currentCount: number
): boolean {
  const limit = getCollaboratorLimit(tier, role);
  return currentCount < limit;
}

/**
 * Get the limit for a specific role on a tier
 */
export function getCollaboratorLimit(tier: SubscriptionTier, role: CollaborationRole): number {
  const limits = COLLABORATION_LIMITS[tier];
  return limits[`${role}s` as keyof typeof limits];
}
