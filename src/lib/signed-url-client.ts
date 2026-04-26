"use client";

import { parseStorageReference } from "@/lib/storage";

const signedUrlCache = new Map<string, string>();

export async function getSignedUrlFromApi(sourcePath: string) {
  const normalized = sourcePath.trim();
  if (!normalized) return "";

  const storageRef = parseStorageReference(normalized);
  if (!storageRef) return normalized;

  const cached = signedUrlCache.get(normalized);
  if (cached) return cached;

  const response = await fetch("/api/signed-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ path: normalized })
  });

  if (!response.ok) {
    return "";
  }

  const result = (await response.json()) as { signedUrl?: string };
  const signedUrl = String(result.signedUrl ?? "").trim();
  if (!signedUrl) {
    return "";
  }

  signedUrlCache.set(normalized, signedUrl);
  return signedUrl;
}
