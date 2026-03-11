/**
 * Centralized storage configuration for file uploads
 * Use these constants across all upload features for consistency
 */

export const STORAGE_CONFIG = {
  /** Default bucket for user and brand kit images */
  BUCKET: 'user_images',
  
  /** Maximum file size in bytes (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  /** Allowed image MIME types */
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/x-icon',
    'image/svg+xml',
  ],
  
  /** Path prefixes for different contexts */
  PATHS: {
    /** User-specific files: users/{userId}/... */
    USER: 'users',
    /** Brand kit files: brand-kits/{brandKitId}/{userId}/... */
    BRAND_KIT: 'brand-kits',
    /** Support ticket screenshots: support-tickets/{userId}/... */
    SUPPORT_TICKETS: 'support-tickets',
  },
} as const;

/**
 * Build a storage path for user-specific files
 * Pattern: users/{userId}/{fileName}
 */
export function buildUserFilePath(userId: string, fileName: string): string {
  return `${STORAGE_CONFIG.PATHS.USER}/${userId}/${fileName}`;
}

/**
 * Build a storage path for brand kit files
 * Pattern: brand-kits/{brandKitId}/{userId}/{fileName}
 */
export function buildBrandKitFilePath(
  brandKitId: string,
  userId: string,
  fileName: string
): string {
  return `${STORAGE_CONFIG.PATHS.BRAND_KIT}/${brandKitId}/${userId}/${fileName}`;
}

/**
 * Build a storage path for support ticket screenshots
 * Pattern: support-tickets/{userId}/{fileName}
 */
export function buildSupportTicketFilePath(userId: string, fileName: string): string {
  return `${STORAGE_CONFIG.PATHS.SUPPORT_TICKETS}/${userId}/${fileName}`;
}

/**
 * Extract the file path from a Supabase storage URL
 * Useful for deletion operations
 */
export function extractPathFromStorageUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (pathMatch) {
      // Remove query params (like cache-busting timestamps)
      return pathMatch[1].split('?')[0];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate file type against allowed types
 */
export function isAllowedFileType(
  file: File,
  allowedTypes: readonly string[] = STORAGE_CONFIG.ALLOWED_IMAGE_TYPES
): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function isValidFileSize(
  file: File,
  maxSize: number = STORAGE_CONFIG.MAX_FILE_SIZE
): boolean {
  return file.size <= maxSize;
}
