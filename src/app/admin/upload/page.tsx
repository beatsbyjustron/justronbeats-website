"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = {
  type: "idle" | "error" | "success";
  message: string;
};

type UploadKey = "coverArt" | "mp3" | "wav" | "stems";
type UploadStage = "idle" | "queued" | "uploading" | "done" | "skipped" | "error";
type UploadProgress = Record<UploadKey, UploadStage>;

const initialStatus: Status = { type: "idle", message: "" };
const initialUploadProgress: UploadProgress = {
  coverArt: "idle",
  mp3: "idle",
  wav: "idle",
  stems: "idle"
};
const initialUploadForm = {
  title: "",
  producerCredits: "",
  key: "",
  bpm: "",
  tags: "",
  featured: false
};

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "bin";
}

export default function AdminUploadPage() {
  const router = useRouter();
  const [gatePassword, setGatePassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [formPassword, setFormPassword] = useState("");
  const [uploadForm, setUploadForm] = useState(initialUploadForm);
  const [coverArtFile, setCoverArtFile] = useState<File | null>(null);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [stemsFile, setStemsFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(initialUploadProgress);

  const expectedPassword = useMemo(() => process.env.NEXT_PUBLIC_ADMIN_PANEL_PASSWORD ?? "justron-admin", []);

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  useEffect(() => {
    if (status.type !== "success") return;
    const timeout = setTimeout(() => {
      router.push("/");
    }, 1800);
    return () => clearTimeout(timeout);
  }, [router, status.type]);

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (gatePassword === expectedPassword) {
      setIsUnlocked(true);
      setStatus(initialStatus);
      return;
    }
    setStatus({ type: "error", message: "Incorrect password." });
  };

  const uploadToBeatsBucket = async (file: File, folder: string) => {
    if (!supabase) throw new Error("Supabase client is not configured.");
    const extension = getFileExtension(file.name);
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;

    // Public bucket upload from client to bypass server body-size limits.
    const { error } = await supabase.storage.from("beats").upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream"
    });

    if (error) throw error;

    const { data } = supabase.storage.from("beats").getPublicUrl(path);
    return data.publicUrl;
  };

  const setUploadStage = (key: UploadKey, stage: UploadStage) => {
    setUploadProgress((prev) => ({ ...prev, [key]: stage }));
  };

  const uploadWithProgress = async (key: UploadKey, file: File, folder: string) => {
    setUploadStage(key, "uploading");
    try {
      const url = await uploadToBeatsBucket(file, folder);
      setUploadStage(key, "done");
      return url;
    } catch (error) {
      setUploadStage(key, "error");
      throw error;
    }
  };

  const submitBeat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(initialStatus);
    setUploadProgress(initialUploadProgress);

    if (!uploadForm.title.trim() || !coverArtFile || !mp3File) {
      setStatus({ type: "error", message: "Title, cover art, and MP3 are required." });
      setIsSubmitting(false);
      return;
    }

    if (!supabase) {
      setStatus({ type: "error", message: "Missing Supabase client configuration." });
      setIsSubmitting(false);
      return;
    }

    try {
      const folder = `${uploadForm.title.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

      setUploadProgress({
        coverArt: "queued",
        mp3: "queued",
        wav: wavFile ? "queued" : "skipped",
        stems: stemsFile ? "queued" : "skipped"
      });

      const coverArtUrl = await uploadWithProgress("coverArt", coverArtFile, folder);
      const mp3Url = await uploadWithProgress("mp3", mp3File, folder);
      const wavUrl = wavFile ? await uploadWithProgress("wav", wavFile, folder) : "";
      const stemsUrl = stemsFile ? await uploadWithProgress("stems", stemsFile, folder) : "";

      const formData = new FormData();
      formData.set("password", formPassword);
      formData.set("title", uploadForm.title.trim());
      formData.set("producerCredits", uploadForm.producerCredits.trim());
      formData.set("key", uploadForm.key.trim());
      formData.set("bpm", uploadForm.bpm.trim());
      formData.set("tags", uploadForm.tags.trim());
      formData.set("featured", uploadForm.featured ? "true" : "false");
      formData.set("coverArtUrl", coverArtUrl);
      formData.set("mp3Url", mp3Url);
      if (wavUrl) formData.set("wavUrl", wavUrl);
      if (stemsUrl) formData.set("stemsUrl", stemsUrl);

      const response = await fetch("/api/admin/beats", {
        method: "POST",
        body: formData
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus({ type: "error", message: result.error ?? "Upload failed." });
        setIsSubmitting(false);
        return;
      }

      setUploadForm(initialUploadForm);
      setCoverArtFile(null);
      setMp3File(null);
      setWavFile(null);
      setStemsFile(null);
      setFileInputKey((prev) => prev + 1);
      setUploadProgress(initialUploadProgress);
      setStatus({ type: "success", message: "Successfully Uploaded to the Store" });
      setIsSubmitting(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error";
      alert(`Supabase upload rejected: ${message}`);
      setStatus({ type: "error", message });
      setIsSubmitting(false);
    }
  };

  if (!isUnlocked) {
    return (
      <main className="mx-auto max-w-md space-y-6">
        <h1 className="text-3xl font-semibold text-zinc-100">Admin Upload</h1>
        <form onSubmit={unlock} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <label htmlFor="gatePassword" className="block text-sm text-zinc-400">
            Password
          </label>
          <input
            id="gatePassword"
            type="password"
            value={gatePassword}
            onChange={(event) => setGatePassword(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none ring-zinc-500 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-full bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
          >
            Enter Admin
          </button>
        </form>
        {status.message && <p className={status.type === "error" ? "text-sm text-red-400" : "text-sm text-zinc-400"}>{status.message}</p>}
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <h1 className="text-3xl font-semibold text-zinc-100">Upload Beat</h1>
      <form onSubmit={submitBeat} className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <input
          name="title"
          placeholder="Beat title"
          required
          value={uploadForm.title}
          onChange={(event) => setUploadForm((prev) => ({ ...prev, title: event.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
        />
        <input
          name="producerCredits"
          placeholder="Producer/collaborator credits"
          value={uploadForm.producerCredits}
          onChange={(event) => setUploadForm((prev) => ({ ...prev, producerCredits: event.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="key"
            placeholder="Key (optional)"
            value={uploadForm.key}
            onChange={(event) => setUploadForm((prev) => ({ ...prev, key: event.target.value }))}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
          />
          <input
            name="bpm"
            type="number"
            placeholder="BPM (optional)"
            value={uploadForm.bpm}
            onChange={(event) => setUploadForm((prev) => ({ ...prev, bpm: event.target.value }))}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
          />
        </div>
        <input
          name="tags"
          placeholder="Tags/genre (comma separated)"
          value={uploadForm.tags}
          onChange={(event) => setUploadForm((prev) => ({ ...prev, tags: event.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
          <p className="font-medium text-zinc-200">Client-side Uploading Enabled</p>
          <p className="mt-1">Files are uploaded directly to the public `beats` bucket via Supabase Storage.</p>
        </div>

        <div className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400 sm:grid-cols-2">
          <p>Cover art: <span className="font-medium text-zinc-200">{uploadProgress.coverArt}</span></p>
          <p>MP3: <span className="font-medium text-zinc-200">{uploadProgress.mp3}</span></p>
          <p>WAV: <span className="font-medium text-zinc-200">{uploadProgress.wav}</span></p>
          <p>Stems: <span className="font-medium text-zinc-200">{uploadProgress.stems}</span></p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            Cover art image
            <input
              key={`cover-${fileInputKey}`}
              name="coverArt"
              type="file"
              accept="image/*"
              required
              onChange={(event) => setCoverArtFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-xs text-zinc-400"
            />
          </label>
          <label className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            MP3 file
            <input
              key={`mp3-${fileInputKey}`}
              name="mp3File"
              type="file"
              accept=".mp3,audio/mpeg"
              required
              onChange={(event) => setMp3File(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-xs text-zinc-400"
            />
          </label>
          <label className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            WAV file
            <input
              key={`wav-${fileInputKey}`}
              name="wavFile"
              type="file"
              accept=".wav,audio/wav"
              onChange={(event) => setWavFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-xs text-zinc-400"
            />
          </label>
          <label className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            Stems ZIP
            <input
              key={`stems-${fileInputKey}`}
              name="stemsFile"
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => setStemsFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-xs text-zinc-400"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            name="featured"
            type="checkbox"
            checked={uploadForm.featured}
            onChange={(event) => setUploadForm((prev) => ({ ...prev, featured: event.target.checked }))}
            className="size-4 accent-zinc-100"
          />
          Mark beat as featured
        </label>

        <input
          name="password"
          type="password"
          value={formPassword}
          onChange={(event) => setFormPassword(event.target.value)}
          placeholder="Admin password to submit"
          required
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-max rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {isSubmitting ? "Uploading..." : "Upload Beat"}
        </button>
      </form>

      {status.message && status.type === "error" && <p className="text-sm text-red-400">{status.message}</p>}
      {status.message && status.type === "success" && (
        <div className="space-y-3 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-4">
          <p className="text-sm font-medium text-emerald-300">{status.message}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-emerald-400/50 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-900/50"
            >
              Return to Home
            </button>
            <p className="text-xs text-emerald-300/80">Redirecting shortly...</p>
          </div>
        </div>
      )}
    </main>
  );
}
