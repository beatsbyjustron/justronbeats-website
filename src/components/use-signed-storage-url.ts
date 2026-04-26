"use client";

import { useEffect, useState } from "react";
import { parseStorageReference } from "@/lib/storage";
import { getSignedUrlFromApi } from "@/lib/signed-url-client";

export function useSignedStorageUrl(sourcePath: string) {
  const [signedUrl, setSignedUrl] = useState("");

  useEffect(() => {
    let active = true;
    const normalized = sourcePath.trim();

    if (!normalized) {
      setSignedUrl("");
      return () => {
        active = false;
      };
    }

    const storageRef = parseStorageReference(normalized);
    if (!storageRef) {
      setSignedUrl(normalized);
      return () => {
        active = false;
      };
    }

    void (async () => {
      const resolved = await getSignedUrlFromApi(normalized);
      if (active) {
        setSignedUrl(resolved);
      }
    })();

    return () => {
      active = false;
    };
  }, [sourcePath]);

  return signedUrl;
}
