import crypto from "crypto";
import { cookies } from "next/headers";
import { AuthUser, PermissionModule, PermissionAction, GranularPermission } from "./types";
import { DEFAULT_ROLE_PERMISSIONS, ALL_MODULE_ACTIONS, hasPermission } from "./permissions";

export { DEFAULT_ROLE_PERMISSIONS, ALL_MODULE_ACTIONS, hasPermission };

const AUTH_SECRET = process.env.AUTH_SECRET || "enterprise-secure-barcode-secret-key-2026-xyz";
export const AUTH_COOKIE_NAME = "enterprise_admin_session";

// 1. Password Hashing (PBKDF2 SHA512)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(":")) return false;
    const [salt, originalHash] = storedHash.split(":");
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, "sha512")
      .toString("hex");
    return hash === originalHash;
  } catch {
    return false;
  }
}

// 2. JWT / Secure Session Token (HMAC-SHA256 Token with Expiry)
export function signAuthToken(payload: AuthUser, expiresInDays: number = 7): string {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
      department: payload.department,
      branch: payload.branch,
      avatar: payload.avatar,
    };
  } catch {
    return null;
  }
}

// 3. Extract Authenticated User from Request / Next Headers (Server Only)
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!sessionCookie?.value) return null;
    return verifyAuthToken(sessionCookie.value);
  } catch {
    return null;
  }
}
