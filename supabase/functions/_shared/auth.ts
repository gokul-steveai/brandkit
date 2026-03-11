/**
 * Shared Auth & Validation Utilities for Edge Functions
 * 
 * This module provides reusable security functions:
 * - JWT validation
 * - Brand kit ownership verification  
 * - UUID validation
 * - Input sanitization
 */

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.87.1";

// ========== TYPES ==========

export interface AuthResult {
    valid: boolean;
    user?: { id: string; email?: string };
    error?: string;
}

export interface OwnershipResult {
    isOwner: boolean;
    isMember: boolean;
    role?: string;
}

export type GrantType = 'authorization_code' | 'refresh_token';

export const ACCESS_TOKEN_EXPIRY_MS = 3600 * 1000; // 1 hour
export const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 3600 * 1000; // 30 days
export const SUPPORTED_GRANT_TYPES: GrantType[] = ['authorization_code', 'refresh_token'];


// ========== JWT VALIDATION ==========

/**
 * Validate JWT from Authorization header and return user
 */
export async function validateJWT(
    authHeader: string | null,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<AuthResult> {
    if (!authHeader) {
        return { valid: false, error: "Missing authorization header" };
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { valid: false, error: error?.message || "Invalid or expired token" };
    }

    return { valid: true, user: { id: user.id, email: user.email } };
}

// ========== OWNERSHIP VERIFICATION ==========

/**
 * Verify user owns or is member of a brand kit
 */
export async function verifyBrandKitAccess(
    supabase: SupabaseClient,
    brandKitId: string,
    userId: string
): Promise<OwnershipResult> {
    // Check if user owns the brand kit
    const { data: owned, error: ownedError } = await supabase
        .from("brand_kits")
        .select("user_id")
        .eq("id", brandKitId)
        .single();

    if (!ownedError && owned && owned.user_id === userId) {
        return { isOwner: true, isMember: true, role: "owner" };
    }

    // Check if user is a member
    const { data: member, error: memberError } = await supabase
        .from("brand_kit_members")
        .select("role")
        .eq("brand_kit_id", brandKitId)
        .eq("user_id", userId)
        .maybeSingle();

    if (!memberError && member) {
        return { isOwner: false, isMember: true, role: member.role };
    }

    return { isOwner: false, isMember: false };
}

/**
 * Simple ownership check (owner only, not members)
 */
export async function verifyBrandKitOwnership(
    supabase: SupabaseClient,
    brandKitId: string,
    userId: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from("brand_kits")
        .select("user_id")
        .eq("id", brandKitId)
        .single();

    if (error || !data) return false;
    return data.user_id === userId;
}

// ========== INPUT VALIDATION ==========

/**
 * Validate UUID format
 */
export function isValidUUID(id: unknown): boolean {
    if (typeof id !== "string") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Sanitize string input - remove null bytes and control characters
 */
export function sanitizeString(input: unknown, maxLength = 10000): string | null {
    if (input === null || input === undefined) return null;
    if (typeof input !== "string") return null;
    return input
        .replace(/\0/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
        .trim()
        .slice(0, maxLength);
}

/**
 * Validate URL is safe (not pointing to internal resources)
 */
export function isValidExternalUrl(urlString: string, maxLength = 2048): boolean {
    if (urlString.length > maxLength) return false;

    try {
        const url = new URL(urlString);

        if (!["http:", "https:"].includes(url.protocol)) {
            return false;
        }

        const hostname = url.hostname.toLowerCase();
        const blockedPatterns = [
            /^localhost$/,
            /^127\./,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[01])\./,
            /^192\.168\./,
            /^0\./,
            /^169\.254\./,
            /^\[::1\]$/,
            /^\[fc00:/,
            /^\[fe80:/,
        ];

        return !blockedPatterns.some(pattern => pattern.test(hostname));
    } catch {
        return false;
    }
}

// ========== USER ROLE CHECKING ==========

/**
 * Check if user has a specific role
 */
export async function checkUserRole(
    supabase: SupabaseClient,
    userId: string,
    requiredRole: "viewer" | "author" | "admin"
): Promise<boolean> {
    const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

    if (error || !data) return false;

    const roleHierarchy = { viewer: 1, author: 2, admin: 3 };
    const userRoleLevel = roleHierarchy[data.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    return userRoleLevel >= requiredRoleLevel;
}
