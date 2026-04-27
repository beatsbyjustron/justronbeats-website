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
type AdminBeat = {
  id: string;
  title: string;
  producer_credits: string | null;
  key: string;
  bpm: number;
  tags: string[];
  featured: boolean;
  cover_art_url: string | null;
};
type AdminProduction = {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  spotify_url: string | null;
  apple_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  year: number | null;
};
type AdminDrumKit = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_path: string | null;
  zip_path: string;
};
type AdminSaleRow = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  itemName: string;
  licenseType: string;
  amountPaid: number;
  purchasedAt: string;
};

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
const initialProductionForm = {
  title: "",
  artist: "",
  spotifyUrl: "",
  appleUrl: "",
  youtubeUrl: "",
  soundcloudUrl: "",
  year: ""
};
const initialDrumKitForm = {
  name: "",
  description: "",
  price: "0"
};

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "bin";
}

function parseTagsInput(value: string) {
  const segments = value.match(/#[^#,\n]+|[^,\n]+/g) ?? [];
  return segments
    .map((segment) => segment.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase())
    .filter(Boolean);
}

export default function AdminUploadPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"beats" | "productions" | "drumKits" | "sales">("beats");
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
  const [productionFileInputKey, setProductionFileInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(initialUploadProgress);
  const [beats, setBeats] = useState<AdminBeat[]>([]);
  const [productions, setProductions] = useState<AdminProduction[]>([]);
  const [drumKits, setDrumKits] = useState<AdminDrumKit[]>([]);
  const [sales, setSales] = useState<AdminSaleRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoadingBeats, setIsLoadingBeats] = useState(false);
  const [isLoadingProductions, setIsLoadingProductions] = useState(false);
  const [isLoadingDrumKits, setIsLoadingDrumKits] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingBeatId, setDeletingBeatId] = useState<string | null>(null);
  const [deletingProductionId, setDeletingProductionId] = useState<string | null>(null);
  const [editingProductionId, setEditingProductionId] = useState<string | null>(null);
  const [isSavingProductionEdit, setIsSavingProductionEdit] = useState(false);
  const [isSubmittingProduction, setIsSubmittingProduction] = useState(false);
  const [productionStatus, setProductionStatus] = useState<Status>(initialStatus);
  const [productionForm, setProductionForm] = useState(initialProductionForm);
  const [productionEditForm, setProductionEditForm] = useState(initialProductionForm);
  const [productionCoverArtFile, setProductionCoverArtFile] = useState<File | null>(null);
  const [productionEditCoverArtFile, setProductionEditCoverArtFile] = useState<File | null>(null);
  const [productionEditCoverPreview, setProductionEditCoverPreview] = useState("");
  const [productionEditCoverPath, setProductionEditCoverPath] = useState("");
  const [productionEditInputKey, setProductionEditInputKey] = useState(0);
  const [drumKitImageFile, setDrumKitImageFile] = useState<File | null>(null);
  const [drumKitZipFile, setDrumKitZipFile] = useState<File | null>(null);
  const [drumKitFileInputKey, setDrumKitFileInputKey] = useState(0);
  const [drumKitForm, setDrumKitForm] = useState(initialDrumKitForm);
  const [drumKitStatus, setDrumKitStatus] = useState<Status>(initialStatus);
  const [salesStatus, setSalesStatus] = useState<Status>(initialStatus);
  const [isSubmittingDrumKit, setIsSubmittingDrumKit] = useState(false);
  const [editingDrumKitId, setEditingDrumKitId] = useState<string | null>(null);
  const [drumKitEditForm, setDrumKitEditForm] = useState(initialDrumKitForm);
  const [drumKitEditImageFile, setDrumKitEditImageFile] = useState<File | null>(null);
  const [drumKitEditZipFile, setDrumKitEditZipFile] = useState<File | null>(null);
  const [drumKitEditPreview, setDrumKitEditPreview] = useState("");
  const [drumKitEditImagePath, setDrumKitEditImagePath] = useState("");
  const [drumKitEditZipPath, setDrumKitEditZipPath] = useState("");
  const [drumKitEditInputKey, setDrumKitEditInputKey] = useState(0);
  const [isSavingDrumKitEdit, setIsSavingDrumKitEdit] = useState(false);
  const [deletingDrumKitId, setDeletingDrumKitId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    producerCredits: "",
    key: "",
    bpm: "",
    tags: "",
    featured: false
  });
  const [editStatus, setEditStatus] = useState<Status>(initialStatus);
  const [editCoverArtFile, setEditCoverArtFile] = useState<File | null>(null);
  const [editCoverArtPreview, setEditCoverArtPreview] = useState("");
  const [editCoverArtPath, setEditCoverArtPath] = useState("");
  const [editCoverInputKey, setEditCoverInputKey] = useState(0);

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

  const loadBeats = async () => {
    setIsLoadingBeats(true);
    setEditStatus(initialStatus);
    try {
      const password = gatePassword || formPassword;
      const response = await fetch("/api/admin/beats", {
        method: "GET",
        headers: {
          "x-admin-password": password
        }
      });

      const result = (await response.json()) as { error?: string; beats?: AdminBeat[] };
      if (!response.ok) {
        setEditStatus({ type: "error", message: result.error ?? "Failed to fetch beats." });
        setIsLoadingBeats(false);
        return;
      }

      setBeats(result.beats ?? []);
      setIsLoadingBeats(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch beats.";
      setEditStatus({ type: "error", message });
      setIsLoadingBeats(false);
    }
  };

  const loadProductions = async () => {
    setIsLoadingProductions(true);
    setProductionStatus(initialStatus);
    try {
      const password = gatePassword || formPassword;
      const response = await fetch("/api/admin/productions", {
        method: "GET",
        headers: {
          "x-admin-password": password
        }
      });

      const result = (await response.json()) as { error?: string; productions?: AdminProduction[] };
      if (!response.ok) {
        setProductionStatus({ type: "error", message: result.error ?? "Failed to fetch productions." });
        setIsLoadingProductions(false);
        return;
      }

      setProductions(result.productions ?? []);
      setIsLoadingProductions(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch productions.";
      setProductionStatus({ type: "error", message });
      setIsLoadingProductions(false);
    }
  };

  const loadDrumKits = async () => {
    setIsLoadingDrumKits(true);
    setDrumKitStatus(initialStatus);
    try {
      const password = gatePassword || formPassword;
      const response = await fetch("/api/admin/drum-kits", {
        method: "GET",
        headers: {
          "x-admin-password": password
        }
      });
      const result = (await response.json()) as { error?: string; kits?: AdminDrumKit[] };
      if (!response.ok) {
        setDrumKitStatus({ type: "error", message: result.error ?? "Failed to fetch drum kits." });
        setIsLoadingDrumKits(false);
        return;
      }
      setDrumKits(result.kits ?? []);
      setIsLoadingDrumKits(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch drum kits.";
      setDrumKitStatus({ type: "error", message });
      setIsLoadingDrumKits(false);
    }
  };

  const loadSales = async () => {
    setIsLoadingSales(true);
    setSalesStatus(initialStatus);
    try {
      const password = gatePassword || formPassword;
      const response = await fetch("/api/admin/sales", {
        method: "GET",
        headers: {
          "x-admin-password": password
        }
      });
      const result = (await response.json()) as { error?: string; rows?: AdminSaleRow[]; totalRevenue?: number };
      if (!response.ok) {
        setSalesStatus({ type: "error", message: result.error ?? "Failed to fetch sales." });
        setIsLoadingSales(false);
        return;
      }
      setSales(result.rows ?? []);
      setTotalRevenue(Number(result.totalRevenue ?? 0));
      setIsLoadingSales(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch sales.";
      setSalesStatus({ type: "error", message });
      setIsLoadingSales(false);
    }
  };

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (gatePassword === expectedPassword) {
      setIsUnlocked(true);
      setFormPassword(gatePassword);
      setStatus(initialStatus);
      return;
    }
    setStatus({ type: "error", message: "Incorrect password." });
  };

  useEffect(() => {
    if (!isUnlocked) return;
    void loadBeats();
    void loadProductions();
    void loadDrumKits();
    void loadSales();
  }, [isUnlocked]);

  const formatUsd = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(value || 0);

  const formatSaleDate = (value: string) => {
    if (!value) return "";
    return new Date(value).toLocaleString();
  };

  const exportSalesCsv = () => {
    if (!sales.length) {
      setSalesStatus({ type: "error", message: "No sales records to export." });
      return;
    }
    const escapeCell = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      [
        "Buyer Name",
        "Buyer Email",
        "Item Purchased",
        "License",
        "Amount Paid (USD)",
        "Date of Purchase"
      ].join(","),
      ...sales.map((row) =>
        [
          escapeCell(row.buyerName || "N/A"),
          escapeCell(row.buyerEmail || "N/A"),
          escapeCell(row.itemName),
          escapeCell(row.licenseType),
          escapeCell(row.amountPaid.toFixed(2)),
          escapeCell(formatSaleDate(row.purchasedAt))
        ].join(",")
      )
    ];
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const day = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `justron-sales-${day}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!editCoverArtPreview.startsWith("blob:")) return;
    return () => {
      URL.revokeObjectURL(editCoverArtPreview);
    };
  }, [editCoverArtPreview]);

  useEffect(() => {
    if (!productionEditCoverPreview.startsWith("blob:")) return;
    return () => {
      URL.revokeObjectURL(productionEditCoverPreview);
    };
  }, [productionEditCoverPreview]);

  const resolveSignedCoverPreview = async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed) return "";
    const response = await fetch("/api/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: trimmed })
    });
    if (!response.ok) return "";
    const result = (await response.json()) as { signedUrl?: string };
    return String(result.signedUrl ?? "").trim();
  };

  const uploadToBeatsBucket = async (file: File, folder: string) => {
    if (!supabase) throw new Error("Supabase client is not configured.");
    const extension = getFileExtension(file.name);
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage.from("beats").upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream"
    });

    if (error) throw error;

    return path;
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
      void loadBeats();
      setIsSubmitting(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error";
      alert(`Supabase upload rejected: ${message}`);
      setStatus({ type: "error", message });
      setIsSubmitting(false);
    }
  };

  const submitProduction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingProduction(true);
    setProductionStatus(initialStatus);

    if (!productionForm.title.trim() || !productionForm.artist.trim() || !productionCoverArtFile) {
      setProductionStatus({ type: "error", message: "Song title, artist name, and cover art are required." });
      setIsSubmittingProduction(false);
      return;
    }

    if (!supabase) {
      setProductionStatus({ type: "error", message: "Missing Supabase client configuration." });
      setIsSubmittingProduction(false);
      return;
    }

    try {
      const folder = `productions/${productionForm.title.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      const coverArtUrl = await uploadToBeatsBucket(productionCoverArtFile, folder);

      const response = await fetch("/api/admin/productions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: formPassword,
          title: productionForm.title.trim(),
          artist: productionForm.artist.trim(),
          coverUrl: coverArtUrl,
          spotifyUrl: productionForm.spotifyUrl.trim(),
          appleUrl: productionForm.appleUrl.trim(),
          youtubeUrl: productionForm.youtubeUrl.trim(),
          soundcloudUrl: productionForm.soundcloudUrl.trim(),
          year: productionForm.year ? Number(productionForm.year) : null
        })
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setProductionStatus({ type: "error", message: result.error ?? "Failed to add production." });
        setIsSubmittingProduction(false);
        return;
      }

      setProductionForm(initialProductionForm);
      setProductionCoverArtFile(null);
      setProductionFileInputKey((prev) => prev + 1);
      setProductionStatus({ type: "success", message: "Production added successfully." });
      await loadProductions();
      setIsSubmittingProduction(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add production.";
      alert(`Supabase upload rejected: ${message}`);
      setProductionStatus({ type: "error", message });
      setIsSubmittingProduction(false);
    }
  };

  const submitDrumKit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingDrumKit(true);
    setDrumKitStatus(initialStatus);
    if (!drumKitForm.name.trim() || !drumKitZipFile) {
      setDrumKitStatus({ type: "error", message: "Kit name and ZIP file are required." });
      setIsSubmittingDrumKit(false);
      return;
    }
    if (!supabase) {
      setDrumKitStatus({ type: "error", message: "Missing Supabase client configuration." });
      setIsSubmittingDrumKit(false);
      return;
    }
    try {
      const folder = `drum-kits/${drumKitForm.name.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      const imagePath = drumKitImageFile ? await uploadToBeatsBucket(drumKitImageFile, folder) : "";
      const zipPath = await uploadToBeatsBucket(drumKitZipFile, folder);
      const response = await fetch("/api/admin/drum-kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: formPassword,
          name: drumKitForm.name.trim(),
          description: drumKitForm.description.trim(),
          price: Number(drumKitForm.price || 0),
          imagePath,
          zipPath
        })
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setDrumKitStatus({ type: "error", message: result.error ?? "Failed to add drum kit." });
        setIsSubmittingDrumKit(false);
        return;
      }
      setDrumKitForm(initialDrumKitForm);
      setDrumKitImageFile(null);
      setDrumKitZipFile(null);
      setDrumKitFileInputKey((prev) => prev + 1);
      setDrumKitStatus({ type: "success", message: "Drum kit added successfully." });
      await loadDrumKits();
      setIsSubmittingDrumKit(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add drum kit.";
      setDrumKitStatus({ type: "error", message });
      setIsSubmittingDrumKit(false);
    }
  };

  const beginDrumKitEdit = (kit: AdminDrumKit) => {
    setEditingDrumKitId(kit.id);
    setDrumKitStatus(initialStatus);
    setDrumKitEditForm({
      name: kit.name,
      description: kit.description ?? "",
      price: String(kit.price ?? 0)
    });
    setDrumKitEditImagePath(String(kit.image_path ?? "").trim());
    setDrumKitEditZipPath(String(kit.zip_path ?? "").trim());
    setDrumKitEditImageFile(null);
    setDrumKitEditZipFile(null);
    setDrumKitEditInputKey((prev) => prev + 1);
    setDrumKitEditPreview("");
    if (kit.image_path) {
      void resolveSignedCoverPreview(kit.image_path).then((url) => setDrumKitEditPreview(url));
    }
  };

  const saveDrumKitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDrumKitId) return;
    setIsSavingDrumKitEdit(true);
    setDrumKitStatus(initialStatus);
    try {
      let nextImagePath = drumKitEditImagePath.trim();
      let nextZipPath = drumKitEditZipPath.trim();
      const folder = `drum-kits/edits/${editingDrumKitId}-${Date.now()}`;
      if (drumKitEditImageFile) {
        nextImagePath = await uploadToBeatsBucket(drumKitEditImageFile, folder);
      }
      if (drumKitEditZipFile) {
        nextZipPath = await uploadToBeatsBucket(drumKitEditZipFile, folder);
      }
      const response = await fetch("/api/admin/drum-kits", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": gatePassword || formPassword
        },
        body: JSON.stringify({
          id: editingDrumKitId,
          name: drumKitEditForm.name.trim(),
          description: drumKitEditForm.description.trim(),
          price: Number(drumKitEditForm.price || 0),
          imagePath: nextImagePath || null,
          zipPath: nextZipPath
        })
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setDrumKitStatus({ type: "error", message: result.error ?? "Failed to update drum kit." });
        setIsSavingDrumKitEdit(false);
        return;
      }
      setDrumKitStatus({ type: "success", message: "Drum kit updated successfully." });
      setEditingDrumKitId(null);
      await loadDrumKits();
      setIsSavingDrumKitEdit(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update drum kit.";
      setDrumKitStatus({ type: "error", message });
      setIsSavingDrumKitEdit(false);
    }
  };

  const deleteDrumKit = async (id: string) => {
    const confirmed = window.confirm("Delete this drum kit permanently?");
    if (!confirmed) return;
    setDeletingDrumKitId(id);
    setDrumKitStatus(initialStatus);
    try {
      const response = await fetch("/api/admin/drum-kits", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": gatePassword || formPassword
        },
        body: JSON.stringify({ id })
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setDrumKitStatus({ type: "error", message: result.error ?? "Failed to delete drum kit." });
        setDeletingDrumKitId(null);
        return;
      }
      setDrumKitStatus({ type: "success", message: "Drum kit deleted successfully." });
      await loadDrumKits();
      setDeletingDrumKitId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete drum kit.";
      setDrumKitStatus({ type: "error", message });
      setDeletingDrumKitId(null);
    }
  };

  const beginProductionEdit = (production: AdminProduction) => {
    setEditingProductionId(production.id);
    setProductionStatus(initialStatus);
    setProductionEditForm({
      title: production.title,
      artist: production.artist,
      spotifyUrl: production.spotify_url ?? "",
      appleUrl: production.apple_url ?? "",
      youtubeUrl: production.youtube_url ?? "",
      soundcloudUrl: production.soundcloud_url ?? "",
      year: production.year ? String(production.year) : ""
    });
    const currentCoverPath = String(production.cover_url ?? "").trim();
    setProductionEditCoverArtFile(null);
    setProductionEditCoverPath(currentCoverPath);
    setProductionEditInputKey((prev) => prev + 1);
    setProductionEditCoverPreview("");
    if (currentCoverPath) {
      void resolveSignedCoverPreview(currentCoverPath).then((url) => setProductionEditCoverPreview(url));
    }
  };

  const saveProductionEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProductionId) return;

    setIsSavingProductionEdit(true);
    setProductionStatus(initialStatus);
    try {
      let nextCoverPath = productionEditCoverPath.trim();
      if (productionEditCoverArtFile) {
        const folder = `productions/edits/${editingProductionId}-${Date.now()}`;
        nextCoverPath = await uploadToBeatsBucket(productionEditCoverArtFile, folder);
      }

      const response = await fetch("/api/admin/productions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": gatePassword || formPassword
        },
        body: JSON.stringify({
          id: editingProductionId,
          title: productionEditForm.title.trim(),
          artist: productionEditForm.artist.trim(),
          spotifyUrl: productionEditForm.spotifyUrl.trim(),
          appleUrl: productionEditForm.appleUrl.trim(),
          youtubeUrl: productionEditForm.youtubeUrl.trim(),
          soundcloudUrl: productionEditForm.soundcloudUrl.trim(),
          year: productionEditForm.year ? Number(productionEditForm.year) : null,
          coverUrl: nextCoverPath || undefined
        })
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setProductionStatus({ type: "error", message: result.error ?? "Failed to update production." });
        setIsSavingProductionEdit(false);
        return;
      }

      setProductionStatus({ type: "success", message: "Production updated successfully." });
      setEditingProductionId(null);
      setProductionEditCoverArtFile(null);
      setProductionEditCoverPreview("");
      setProductionEditCoverPath("");
      setProductionEditInputKey((prev) => prev + 1);
      await loadProductions();
      setIsSavingProductionEdit(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update production.";
      setProductionStatus({ type: "error", message });
      setIsSavingProductionEdit(false);
    }
  };

  const deleteProduction = async (id: string) => {
    const confirmed = window.confirm("Delete this production permanently?");
    if (!confirmed) return;

    setDeletingProductionId(id);
    setProductionStatus(initialStatus);
    try {
      const response = await fetch("/api/admin/productions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": gatePassword || formPassword
        },
        body: JSON.stringify({ id })
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setProductionStatus({ type: "error", message: result.error ?? "Failed to delete production." });
        setDeletingProductionId(null);
        return;
      }

      setProductionStatus({ type: "success", message: "Production deleted successfully." });
      await loadProductions();
      setDeletingProductionId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete production.";
      setProductionStatus({ type: "error", message });
      setDeletingProductionId(null);
    }
  };

  const beginEdit = (beat: AdminBeat) => {
    setEditingBeatId(beat.id);
    setEditStatus(initialStatus);
    setEditForm({
      title: beat.title,
      producerCredits: beat.producer_credits ?? "",
      key: beat.key === "Unknown" ? "" : beat.key,
      bpm: beat.bpm ? String(beat.bpm) : "",
      tags: beat.tags.join(", "),
      featured: beat.featured
    });
    const currentCoverPath = String(beat.cover_art_url ?? "").trim();
    setEditCoverArtFile(null);
    setEditCoverArtPath(currentCoverPath);
    setEditCoverInputKey((prev) => prev + 1);
    setEditCoverArtPreview("");
    if (currentCoverPath) {
      void resolveSignedCoverPreview(currentCoverPath).then((url) => {
        setEditCoverArtPreview(url);
      });
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBeatId) return;

    setIsSavingEdit(true);
    setEditStatus(initialStatus);
    try {
      let nextCoverPath = editCoverArtPath.trim();
      if (editCoverArtFile) {
        const folder = `edits/${editingBeatId}-${Date.now()}`;
        nextCoverPath = await uploadToBeatsBucket(editCoverArtFile, folder);
      }

      const response = await fetch("/api/admin/beats", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": gatePassword || formPassword
        },
        body: JSON.stringify({
          id: editingBeatId,
          title: editForm.title.trim(),
          producerCredits: editForm.producerCredits.trim(),
          key: editForm.key.trim(),
          bpm: Number(editForm.bpm || 0),
          tags: editForm.tags
            ? parseTagsInput(editForm.tags)
            : [],
          featured: editForm.featured,
          coverArtPath: nextCoverPath || null
        })
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setEditStatus({ type: "error", message: result.error ?? "Failed to update beat." });
        setIsSavingEdit(false);
        return;
      }

      setEditStatus({ type: "success", message: "Beat updated successfully." });
      setEditingBeatId(null);
      setEditCoverArtFile(null);
      setEditCoverArtPreview("");
      setEditCoverArtPath("");
      setEditCoverInputKey((prev) => prev + 1);
      await loadBeats();
      setIsSavingEdit(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update beat.";
      setEditStatus({ type: "error", message });
      setIsSavingEdit(false);
    }
  };

  const deleteBeat = async (id: string) => {
    const confirmed = window.confirm("Delete this beat permanently?");
    if (!confirmed) return;

    setDeletingBeatId(id);
    setEditStatus(initialStatus);
    try {
      const response = await fetch("/api/admin/beats", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": gatePassword || formPassword
        },
        body: JSON.stringify({ id })
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setEditStatus({ type: "error", message: result.error ?? "Failed to delete beat." });
        setDeletingBeatId(null);
        return;
      }

      setEditStatus({ type: "success", message: "Beat deleted successfully." });
      await loadBeats();
      setDeletingBeatId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete beat.";
      setEditStatus({ type: "error", message });
      setDeletingBeatId(null);
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
      <h1 className="text-3xl font-semibold text-zinc-100">Admin Dashboard</h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("beats")}
          className={`rounded-full px-4 py-2 text-sm transition ${
            activeTab === "beats"
              ? "bg-zinc-100 font-semibold text-zinc-900"
              : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          Beats
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("productions")}
          className={`rounded-full px-4 py-2 text-sm transition ${
            activeTab === "productions"
              ? "bg-zinc-100 font-semibold text-zinc-900"
              : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          Productions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("drumKits")}
          className={`rounded-full px-4 py-2 text-sm transition ${
            activeTab === "drumKits"
              ? "bg-zinc-100 font-semibold text-zinc-900"
              : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          Drum Kits
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={`rounded-full px-4 py-2 text-sm transition ${
            activeTab === "sales"
              ? "bg-zinc-100 font-semibold text-zinc-900"
              : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          Sales
        </button>
      </div>

      {activeTab === "beats" && (
        <>
      <form onSubmit={submitBeat} autoComplete="off" className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
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
          autoComplete="off"
          placeholder="Tags (comma separated, e.g. lil uzi vert, osamason, drill)"
          value={uploadForm.tags}
          onChange={(event) => setUploadForm((prev) => ({ ...prev, tags: event.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
          <p className="font-medium text-zinc-200">Client-side Uploading Enabled</p>
          <p className="mt-1">Files are uploaded directly to Supabase Storage and served via expiring signed URLs.</p>
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

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-100">Uploaded Beats</h2>
          <button
            type="button"
            onClick={() => void loadBeats()}
            className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
          >
            Refresh
          </button>
        </div>

        {editStatus.message && (
          <p className={editStatus.type === "error" ? "text-sm text-red-400" : "text-sm text-emerald-400"}>
            {editStatus.message}
          </p>
        )}

        {isLoadingBeats ? (
          <p className="text-sm text-zinc-400">Loading beats...</p>
        ) : !beats.length ? (
          <p className="text-sm text-zinc-400">No beats uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {beats.map((beat) => (
              <article key={beat.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                {editingBeatId === beat.id ? (
                  <form onSubmit={saveEdit} className="grid gap-3">
                    <input
                      value={editForm.title}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Beat title"
                      required
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                    />
                    <input
                      value={editForm.producerCredits}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, producerCredits: event.target.value }))}
                      placeholder="Collaborators"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={editForm.key}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, key: event.target.value }))}
                        placeholder="Key"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                      <input
                        type="number"
                        value={editForm.bpm}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, bpm: event.target.value }))}
                        placeholder="BPM"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                    </div>
                    <input
                      value={editForm.tags}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="Tags (comma separated)"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                    />
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={editForm.featured}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, featured: event.target.checked }))}
                        className="size-4 accent-zinc-100"
                      />
                      Featured on homepage carousel
                    </label>
                    <div className="grid gap-2">
                      <p className="text-xs text-zinc-400">Cover art</p>
                      {editCoverArtPreview ? (
                        <img src={editCoverArtPreview} alt="Cover preview" className="h-24 w-24 rounded-lg object-cover" />
                      ) : (
                        <p className="text-xs text-zinc-500">No cover image found.</p>
                      )}
                      <label className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                        Replace cover image
                        <input
                          key={`edit-cover-${editCoverInputKey}`}
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setEditCoverArtFile(file);
                            if (!file) {
                              void resolveSignedCoverPreview(editCoverArtPath).then((url) => setEditCoverArtPreview(url));
                              return;
                            }
                            const previewUrl = URL.createObjectURL(file);
                            setEditCoverArtPreview(previewUrl);
                          }}
                          className="mt-2 block w-full text-xs text-zinc-400"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
                      >
                        {isSavingEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBeatId(null);
                          setEditCoverArtFile(null);
                          setEditCoverArtPreview("");
                          setEditCoverArtPath("");
                          setEditCoverInputKey((prev) => prev + 1);
                        }}
                        className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-zinc-100">{beat.title}</p>
                      <p className="text-xs text-zinc-400">{beat.producer_credits || "No collaborators listed"}</p>
                      <p className="text-xs text-zinc-500">
                        {beat.bpm || 0} BPM • {beat.key || "Unknown"}
                      </p>
                      <p className="text-xs text-zinc-500">{beat.tags.length ? beat.tags.join(", ") : "No tags"}</p>
                      {beat.featured && <p className="text-xs text-emerald-400">Featured</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(beat)}
                        className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteBeat(beat.id)}
                        disabled={deletingBeatId === beat.id}
                        className="rounded-full border border-red-500/60 px-4 py-2 text-xs text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
                      >
                        {deletingBeatId === beat.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
        </>
      )}

      {activeTab === "productions" && (
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-100">Productions Management</h2>
          <button
            type="button"
            onClick={() => void loadProductions()}
            className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
          >
            Refresh
          </button>
        </div>

        <form onSubmit={submitProduction} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Song title"
              required
              value={productionForm.title}
              onChange={(event) => setProductionForm((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <input
              placeholder="Artist name"
              required
              value={productionForm.artist}
              onChange={(event) => setProductionForm((prev) => ({ ...prev, artist: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Spotify link (optional)"
              value={productionForm.spotifyUrl}
              onChange={(event) => setProductionForm((prev) => ({ ...prev, spotifyUrl: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <input
              placeholder="Apple Music link (optional)"
              value={productionForm.appleUrl}
              onChange={(event) => setProductionForm((prev) => ({ ...prev, appleUrl: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <input
              placeholder="YouTube link (optional)"
              value={productionForm.youtubeUrl}
              onChange={(event) => setProductionForm((prev) => ({ ...prev, youtubeUrl: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <input
              placeholder="SoundCloud link (optional)"
              value={productionForm.soundcloudUrl}
              onChange={(event) => setProductionForm((prev) => ({ ...prev, soundcloudUrl: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={1900}
              max={2100}
              placeholder="Year (optional)"
              value={productionForm.year}
              onChange={(event) => setProductionForm((prev) => ({ ...prev, year: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <label className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
              Cover art image
              <input
                key={`production-cover-${productionFileInputKey}`}
                type="file"
                accept="image/*"
                required
                onChange={(event) => setProductionCoverArtFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-xs text-zinc-400"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmittingProduction}
            className="w-max rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
          >
            {isSubmittingProduction ? "Adding..." : "Add Production"}
          </button>
        </form>

        {productionStatus.message && (
          <p className={productionStatus.type === "error" ? "text-sm text-red-400" : "text-sm text-emerald-400"}>
            {productionStatus.message}
          </p>
        )}

        {isLoadingProductions ? (
          <p className="text-sm text-zinc-400">Loading productions...</p>
        ) : !productions.length ? (
          <p className="text-sm text-zinc-400">No productions added yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {productions.map((production) => (
              <article key={production.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                {editingProductionId === production.id ? (
                  <form onSubmit={saveProductionEdit} className="grid gap-3">
                    <input
                      value={productionEditForm.title}
                      onChange={(event) => setProductionEditForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Song title"
                      required
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                    />
                    <input
                      value={productionEditForm.artist}
                      onChange={(event) => setProductionEditForm((prev) => ({ ...prev, artist: event.target.value }))}
                      placeholder="Artist name"
                      required
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={productionEditForm.spotifyUrl}
                        onChange={(event) => setProductionEditForm((prev) => ({ ...prev, spotifyUrl: event.target.value }))}
                        placeholder="Spotify link"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                      <input
                        value={productionEditForm.appleUrl}
                        onChange={(event) => setProductionEditForm((prev) => ({ ...prev, appleUrl: event.target.value }))}
                        placeholder="Apple Music link"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                      <input
                        value={productionEditForm.youtubeUrl}
                        onChange={(event) => setProductionEditForm((prev) => ({ ...prev, youtubeUrl: event.target.value }))}
                        placeholder="YouTube link"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                      <input
                        value={productionEditForm.soundcloudUrl}
                        onChange={(event) => setProductionEditForm((prev) => ({ ...prev, soundcloudUrl: event.target.value }))}
                        placeholder="SoundCloud link"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                    </div>
                    <input
                      type="number"
                      value={productionEditForm.year}
                      onChange={(event) => setProductionEditForm((prev) => ({ ...prev, year: event.target.value }))}
                      placeholder="Year"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                    />
                    <div className="grid gap-2">
                      <p className="text-xs text-zinc-400">Cover art</p>
                      {productionEditCoverPreview ? (
                        <img src={productionEditCoverPreview} alt="Production cover preview" className="h-24 w-24 rounded-lg object-cover" />
                      ) : (
                        <p className="text-xs text-zinc-500">No cover image found.</p>
                      )}
                      <label className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                        Replace cover image
                        <input
                          key={`production-edit-cover-${productionEditInputKey}`}
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setProductionEditCoverArtFile(file);
                            if (!file) {
                              void resolveSignedCoverPreview(productionEditCoverPath).then((url) => setProductionEditCoverPreview(url));
                              return;
                            }
                            setProductionEditCoverPreview(URL.createObjectURL(file));
                          }}
                          className="mt-2 block w-full text-xs text-zinc-400"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSavingProductionEdit}
                        className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
                      >
                        {isSavingProductionEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProductionId(null);
                          setProductionEditCoverArtFile(null);
                          setProductionEditCoverPreview("");
                          setProductionEditCoverPath("");
                          setProductionEditInputKey((prev) => prev + 1);
                        }}
                        className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{production.title}</p>
                      <p className="text-xs text-zinc-400">{production.artist}</p>
                      {production.year && <p className="text-xs text-zinc-500">{production.year}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => beginProductionEdit(production)}
                        className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduction(production.id)}
                        disabled={deletingProductionId === production.id}
                        className="rounded-full border border-red-500/60 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
                      >
                        {deletingProductionId === production.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      {activeTab === "drumKits" && (
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">Drum Kits Management</h2>
            <button
              type="button"
              onClick={() => void loadDrumKits()}
              className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
            >
              Refresh
            </button>
          </div>
          <form onSubmit={submitDrumKit} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <input
              placeholder="Kit name"
              required
              value={drumKitForm.name}
              onChange={(event) => setDrumKitForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <textarea
              placeholder="Description"
              rows={3}
              value={drumKitForm.description}
              onChange={(event) => setDrumKitForm((prev) => ({ ...prev, description: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Price (USD) - 0 for free"
              value={drumKitForm.price}
              onChange={(event) => setDrumKitForm((prev) => ({ ...prev, price: event.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                Cover image (optional)
                <input
                  key={`drumkit-image-${drumKitFileInputKey}`}
                  type="file"
                  accept="image/*"
                  onChange={(event) => setDrumKitImageFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-xs text-zinc-400"
                />
              </label>
              <label className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                ZIP file
                <input
                  key={`drumkit-zip-${drumKitFileInputKey}`}
                  type="file"
                  accept=".zip,application/zip"
                  required
                  onChange={(event) => setDrumKitZipFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-xs text-zinc-400"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isSubmittingDrumKit}
              className="w-max rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {isSubmittingDrumKit ? "Adding..." : "Add Drum Kit"}
            </button>
          </form>

          {drumKitStatus.message && (
            <p className={drumKitStatus.type === "error" ? "text-sm text-red-400" : "text-sm text-emerald-400"}>{drumKitStatus.message}</p>
          )}

          {isLoadingDrumKits ? (
            <p className="text-sm text-zinc-400">Loading drum kits...</p>
          ) : !drumKits.length ? (
            <p className="text-sm text-zinc-400">No drum kits added yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {drumKits.map((kit) => (
                <article key={kit.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  {editingDrumKitId === kit.id ? (
                    <form onSubmit={saveDrumKitEdit} className="grid gap-3">
                      <input
                        value={drumKitEditForm.name}
                        onChange={(event) => setDrumKitEditForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Kit name"
                        required
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                      <textarea
                        rows={3}
                        value={drumKitEditForm.description}
                        onChange={(event) => setDrumKitEditForm((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Description"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={drumKitEditForm.price}
                        onChange={(event) => setDrumKitEditForm((prev) => ({ ...prev, price: event.target.value }))}
                        placeholder="Price (USD)"
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                      />
                      <div className="grid gap-2">
                        <p className="text-xs text-zinc-400">Cover image</p>
                        {drumKitEditPreview ? (
                          <img src={drumKitEditPreview} alt="Kit preview" className="h-24 w-24 rounded-lg object-cover" />
                        ) : (
                          <p className="text-xs text-zinc-500">No cover image</p>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                          Replace cover image
                          <input
                            key={`drumkit-edit-image-${drumKitEditInputKey}`}
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setDrumKitEditImageFile(file);
                              if (!file) {
                                void resolveSignedCoverPreview(drumKitEditImagePath).then((url) => setDrumKitEditPreview(url));
                                return;
                              }
                              setDrumKitEditPreview(URL.createObjectURL(file));
                            }}
                            className="mt-2 block w-full text-xs text-zinc-400"
                          />
                        </label>
                        <label className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                          Replace ZIP file
                          <input
                            key={`drumkit-edit-zip-${drumKitEditInputKey}`}
                            type="file"
                            accept=".zip,application/zip"
                            onChange={(event) => setDrumKitEditZipFile(event.target.files?.[0] ?? null)}
                            className="mt-2 block w-full text-xs text-zinc-400"
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={isSavingDrumKitEdit}
                          className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
                        >
                          {isSavingDrumKitEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDrumKitId(null);
                            setDrumKitEditImageFile(null);
                            setDrumKitEditZipFile(null);
                            setDrumKitEditPreview("");
                          }}
                          className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-100">{kit.name}</p>
                        <p className="text-xs text-zinc-400">{kit.description || "No description"}</p>
                        <p className="text-xs text-zinc-500">{Number(kit.price) <= 0 ? "Free" : `$${Number(kit.price).toFixed(2)}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => beginDrumKitEdit(kit)}
                          className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDrumKit(kit.id)}
                          disabled={deletingDrumKitId === kit.id}
                          className="rounded-full border border-red-500/60 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
                        >
                          {deletingDrumKitId === kit.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "sales" && (
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-zinc-100">Sales Dashboard</h2>
              <p className="text-sm text-zinc-400">Total revenue: <span className="font-medium text-emerald-300">{formatUsd(totalRevenue)}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadSales()}
                className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={exportSalesCsv}
                className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
              >
                Export CSV
              </button>
            </div>
          </div>

          {salesStatus.message && (
            <p className={salesStatus.type === "error" ? "text-sm text-red-400" : "text-sm text-emerald-400"}>
              {salesStatus.message}
            </p>
          )}

          {isLoadingSales ? (
            <p className="text-sm text-zinc-400">Loading sales...</p>
          ) : !sales.length ? (
            <p className="text-sm text-zinc-400">No Stripe sales found yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
              <table className="min-w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Buyer Name</th>
                    <th className="px-3 py-2 font-medium">Buyer Email</th>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">License</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-zinc-900/80 last:border-0">
                      <td className="px-3 py-2">{sale.buyerName || "N/A"}</td>
                      <td className="px-3 py-2">{sale.buyerEmail || "N/A"}</td>
                      <td className="px-3 py-2">{sale.itemName}</td>
                      <td className="px-3 py-2 capitalize">{sale.licenseType}</td>
                      <td className="px-3 py-2">{formatUsd(sale.amountPaid)}</td>
                      <td className="px-3 py-2">{formatSaleDate(sale.purchasedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
