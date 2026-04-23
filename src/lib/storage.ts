import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type StorageReference = {
  bucket: string;
  path: string;
};

const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "beats";

const PUBLIC_OBJECT_RE = /\/storage\/v1\/object\/public\/([^/]+)\/([^?]+)/i;
const SIGNED_OBJECT_RE = /\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i;

export function getSignedUrlExpirySeconds() {
  const raw = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS ?? 3600);
  if (!Number.isFinite(raw)) return 3600;
  return Math.min(60 * 60 * 24 * 7, Math.max(60, Math.floor(raw)));
}

function decodePath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseStorageReference(value: string | null | undefined): StorageReference | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const signedMatch = trimmed.match(SIGNED_OBJECT_RE);
  if (signedMatch) {
    return {
      bucket: signedMatch[1],
      path: decodePath(signedMatch[2])
    };
  }

  const publicMatch = trimmed.match(PUBLIC_OBJECT_RE);
  if (publicMatch) {
    return {
      bucket: publicMatch[1],
      path: decodePath(publicMatch[2])
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  if (withoutLeadingSlash.startsWith(`${DEFAULT_BUCKET}/`)) {
    return {
      bucket: DEFAULT_BUCKET,
      path: withoutLeadingSlash.slice(DEFAULT_BUCKET.length + 1)
    };
  }

  return {
    bucket: DEFAULT_BUCKET,
    path: withoutLeadingSlash
  };
}

export function isSupabasePublicObjectUrl(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  return PUBLIC_OBJECT_RE.test(trimmed);
}

export async function toSignedStorageUrl(
  supabase: SupabaseClient<Database>,
  value: string | null | undefined,
  expiresInSeconds = getSignedUrlExpirySeconds()
) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  const ref = parseStorageReference(trimmed);
  // Non-Supabase/external URLs pass through unchanged.
  if (!ref) return trimmed;

  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    // Never fall back to public object URLs for private buckets.
    return "";
  }

  return data.signedUrl;
}
