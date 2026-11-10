import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

function normalize(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

/** Service-role client for account tables (not in the generated Database types). */
export function getAdminClient(): SupabaseClient | null {
  const url = normalize(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? normalize(process.env.SUPABASE_URL);
  const key = normalize(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The signed-in user behind a request's `Authorization: Bearer <access token>` header. */
export async function getRequestUser(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const admin = getAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Escape LIKE wildcards so an email can be matched case-insensitively with ilike. */
export function likeExact(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
