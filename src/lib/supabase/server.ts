import "server-only";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function normalize(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    loadEnvConfig(process.cwd());
  }

  const url = normalize(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? normalize(process.env.SUPABASE_URL);
  const serviceRoleKey =
    normalize(process.env.SUPABASE_SERVICE_ROLE_KEY) ??
    normalize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    normalize(process.env.SUPABASE_ANON_KEY);

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}
