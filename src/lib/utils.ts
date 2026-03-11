import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type AccountIdentityType = 'workspace' | 'user'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateSecureKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateIntegrationIdentity(
  clientId: string,
  externalUserId?: string,
  externalWorkspaceId?: string
): Promise<string> {
  if (!externalUserId && !externalWorkspaceId) {
    throw new Error("Either externalUserId or externalWorkspaceId must be provided");
  }

  const accountType: AccountIdentityType = externalWorkspaceId ? "workspace" : "user";
  const externalAccountId = externalWorkspaceId || externalUserId;
  const identityString = `${clientId}:${accountType}:${externalAccountId}`;

  return await sha256Hex(identityString);
}
