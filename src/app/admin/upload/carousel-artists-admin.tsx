"use client";

import { useEffect, useState } from "react";
import type { CarouselArtist } from "@/components/types";

type SpotifyImageFetchResult = {
  imageUrl: string | null;
  name: string | null;
  spotifyArtistId: string;
};

type CarouselArtistsAdminProps = {
  password: string;
};

function formatListeners(value: number) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.floor(value)));
}

function parseMonthlyListeners(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function CarouselArtistsAdmin({ password }: CarouselArtistsAdminProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "error" | "success"; message: string }>({
    type: "idle",
    message: ""
  });

  const [artists, setArtists] = useState<CarouselArtist[]>([]);
  const [newForm, setNewForm] = useState<{
    name: string;
    spotifyUrl: string;
    monthlyListeners: string;
    imageUrl: string | null;
  }>({
    name: "",
    spotifyUrl: "",
    monthlyListeners: "",
    imageUrl: null
  });
  const [isFetchingNewImage, setIsFetchingNewImage] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    spotifyUrl: string;
    monthlyListeners: string;
    imageUrl: string | null;
  }>({
    name: "",
    spotifyUrl: "",
    monthlyListeners: "",
    imageUrl: null
  });
  const [isFetchingEditImage, setIsFetchingEditImage] = useState(false);

  const loadArtists = async () => {
    setIsLoading(true);
    setStatus({ type: "idle", message: "" });
    try {
      const res = await fetch("/api/admin/carousel-artists", {
        method: "GET",
        headers: { "x-admin-password": password }
      });
      const json = (await res.json()) as { error?: string; artists?: CarouselArtist[] };
      if (!res.ok) {
        setStatus({ type: "error", message: json.error ?? "Failed to load artists." });
        setIsLoading(false);
        return;
      }
      setArtists((json.artists ?? []).map((a) => ({ ...a })));
      setIsLoading(false);
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to load artists." });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArtists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSpotifyImage = async (spotifyUrl: string, mode: "new" | "edit") => {
    const trimmed = spotifyUrl.trim();
    if (!trimmed) return;
    if (!trimmed.includes("spotify.com/artist/")) return;

    if (mode === "new") setIsFetchingNewImage(true);
    if (mode === "edit") setIsFetchingEditImage(true);

    try {
      const res = await fetch("/api/admin/carousel-artists/spotify-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password
        },
        body: JSON.stringify({ spotifyUrl: trimmed })
      });

      const json = (await res.json()) as { error?: string; imageUrl?: string | null; name?: string | null };
      if (!res.ok) {
        setStatus({ type: "error", message: json.error ?? "Failed to fetch Spotify artist image." });
        return;
      }

      const imageUrl = json.imageUrl ?? null;
      const autoName = json.name ? String(json.name).trim() : null;

      if (mode === "new") {
        setNewForm((prev) => ({
          ...prev,
          imageUrl,
          ...(prev.name.trim() ? {} : autoName ? { name: autoName } : {})
        }));
      } else {
        setEditForm((prev) => ({
          ...prev,
          imageUrl,
          ...(prev.name.trim() ? {} : autoName ? { name: autoName } : {})
        }));

        // Persist the photo immediately for existing artists.
        if (editingId) {
          await fetch("/api/admin/carousel-artists", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": password
            },
            body: JSON.stringify({
              id: editingId,
              spotifyUrl: trimmed,
              imageUrl
            })
          });
        }
      }
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to fetch Spotify image." });
    } finally {
      if (mode === "new") setIsFetchingNewImage(false);
      if (mode === "edit") setIsFetchingEditImage(false);
    }
  };

  const addArtist = async () => {
    setStatus({ type: "idle", message: "" });
    try {
      const name = newForm.name.trim();
      const spotifyUrl = newForm.spotifyUrl.trim();
      const monthlyListeners = parseMonthlyListeners(newForm.monthlyListeners);
      if (!name || !spotifyUrl) {
        setStatus({ type: "error", message: "Name and Spotify artist URL are required." });
        return;
      }

      const res = await fetch("/api/admin/carousel-artists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password
        },
        body: JSON.stringify({
          name,
          spotifyUrl,
          monthlyListeners,
          imageUrl: newForm.imageUrl ?? null
        })
      });

      const json = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !json.success) {
        setStatus({ type: "error", message: json.error ?? "Failed to add artist." });
        return;
      }

      setNewForm({ name: "", spotifyUrl: "", monthlyListeners: "", imageUrl: null });
      setStatus({ type: "success", message: "Artist added." });
      await loadArtists();
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to add artist." });
    }
  };

  const beginEdit = (artist: CarouselArtist) => {
    setEditingId(artist.id);
    setEditForm({
      name: artist.name,
      spotifyUrl: artist.spotifyUrl,
      monthlyListeners: String(artist.monthlyListeners ?? ""),
      imageUrl: artist.imageUrl
    });
    setStatus({ type: "idle", message: "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", spotifyUrl: "", monthlyListeners: "", imageUrl: null });
    setIsFetchingEditImage(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setStatus({ type: "idle", message: "" });

    try {
      const name = editForm.name.trim();
      const spotifyUrl = editForm.spotifyUrl.trim();
      const monthlyListeners = parseMonthlyListeners(editForm.monthlyListeners);

      if (!name || !spotifyUrl) {
        setStatus({ type: "error", message: "Name and Spotify artist URL are required." });
        return;
      }

      const res = await fetch("/api/admin/carousel-artists", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password
        },
        body: JSON.stringify({
          id: editingId,
          name,
          spotifyUrl,
          monthlyListeners,
          imageUrl: editForm.imageUrl ?? null
        })
      });

      const json = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !json.success) {
        setStatus({ type: "error", message: json.error ?? "Failed to update artist." });
        return;
      }

      setStatus({ type: "success", message: "Artist updated." });
      setEditingId(null);
      await loadArtists();
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to update artist." });
    }
  };

  const deleteArtist = async (id: string) => {
    const ok = window.confirm("Delete this artist from the carousel?");
    if (!ok) return;

    setStatus({ type: "idle", message: "" });
    try {
      const res = await fetch("/api/admin/carousel-artists", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password
        },
        body: JSON.stringify({ id })
      });
      const json = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !json.success) {
        setStatus({ type: "error", message: json.error ?? "Failed to delete artist." });
        return;
      }
      setStatus({ type: "success", message: "Artist deleted." });
      await loadArtists();
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to delete artist." });
    }
  };

  const saveOrder = async (order: string[]) => {
    const res = await fetch("/api/admin/carousel-artists/reorder", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password
      },
      body: JSON.stringify({ order })
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setStatus({ type: "error", message: json.error ?? "Failed to reorder artists." });
      await loadArtists();
    }
  };

  const [draggingId, setDraggingId] = useState<string>("");
  const [dragOverId, setDragOverId] = useState<string>("");

  const onDropReorder = async (targetId: string, dt: DataTransfer) => {
    const sourceId = dt.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;

    const fromIndex = artists.findIndex((a) => a.id === sourceId);
    const toIndex = artists.findIndex((a) => a.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...artists];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const reordered = next.map((a, idx) => ({ ...a, displayOrder: idx }));
    setArtists(reordered);
    setDraggingId("");
    setDragOverId("");
    await saveOrder(reordered.map((a) => a.id));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Artists Carousel</h2>
          <p className="mt-1 text-sm text-zinc-400">Manage “Produced For” artists (photo, listeners, order).</p>
        </div>
        <button
          type="button"
          onClick={() => void loadArtists()}
          className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
        >
          Refresh
        </button>
      </div>

      {status.type !== "idle" && (
        <p className={status.type === "error" ? "text-sm text-red-400" : "text-sm text-emerald-300"}>{status.message}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Add Artist</h3>
          <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <input
              name="jr-artists-add-name"
              autoComplete="off"
              placeholder="Name"
              value={newForm.name}
              onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            <input
              name="jr-artists-add-spotify-url"
              autoComplete="off"
              placeholder="Spotify artist URL"
              value={newForm.spotifyUrl}
              onChange={(e) => setNewForm((p) => ({ ...p, spotifyUrl: e.target.value }))}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text.includes("spotify.com/artist/")) {
                  // Let the input update, then fetch.
                  setTimeout(() => void fetchSpotifyImage(text, "new"), 0);
                }
              }}
              onBlur={() => void fetchSpotifyImage(newForm.spotifyUrl, "new")}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />

            <input
              name="jr-artists-add-monthly-listeners"
              autoComplete="off"
              inputMode="numeric"
              type="number"
              step={1}
              placeholder="Monthly listeners"
              value={newForm.monthlyListeners}
              onChange={(e) => setNewForm((p) => ({ ...p, monthlyListeners: e.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />

            <div className="flex items-center gap-3">
              {newForm.imageUrl ? (
                <img src={newForm.imageUrl} alt="Artist profile" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full border border-zinc-700 bg-zinc-900" aria-hidden="true" />
              )}
              <div className="text-sm text-zinc-400">
                {isFetchingNewImage ? "Fetching Spotify image..." : "Spotify image will be fetched automatically."}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void addArtist()}
              className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              Add Artist
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Reorder & Edit</h3>
          {isLoading ? (
            <p className="text-sm text-zinc-400">Loading artists...</p>
          ) : !artists.length ? (
            <p className="text-sm text-zinc-400">No artists found.</p>
          ) : (
            <div className="space-y-2">
              {artists.map((artist) => {
                const isEditing = editingId === artist.id;
                return (
                  <div
                    key={artist.id}
                    className={`rounded-xl border p-3 ${
                      isEditing
                        ? "border-emerald-500/50 bg-zinc-900/40"
                        : dragOverId === artist.id
                          ? "border-emerald-400/70 bg-zinc-900/20"
                          : "border-zinc-800 bg-zinc-950"
                    }`}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(artist.id);
                      setDragOverId(artist.id);
                      e.dataTransfer.setData("text/plain", artist.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId && draggingId !== artist.id && dragOverId !== artist.id) setDragOverId(artist.id);
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDragEnd={() => {
                      setDraggingId("");
                      setDragOverId("");
                    }}
                    onDrop={(e) => void onDropReorder(artist.id, e.dataTransfer)}
                  >
                    <div className="flex items-start gap-3">
                      {artist.imageUrl ? (
                        <img src={artist.imageUrl} alt={`${artist.name} profile`} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-full border border-zinc-700 bg-zinc-900" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        {!isEditing ? (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <p className="break-words text-sm font-semibold text-zinc-100">{artist.name}</p>
                              <p className="shrink-0 text-xs text-zinc-500">
                                #{artist.displayOrder + 1}
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-zinc-400">
                              {formatListeners(artist.monthlyListeners)} monthly listeners
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => beginEdit(artist)}
                                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 transition hover:border-zinc-500"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteArtist(artist.id)}
                                className="rounded-full border border-red-500/50 px-3 py-1 text-xs text-red-200 transition hover:border-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid gap-2">
                              <input
                                name="jr-artists-edit-name"
                                autoComplete="off"
                                placeholder="Name"
                                value={editForm.name}
                                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                              />
                              <input
                                name="jr-artists-edit-spotify-url"
                                autoComplete="off"
                                placeholder="Spotify artist URL"
                                value={editForm.spotifyUrl}
                                onChange={(e) => setEditForm((p) => ({ ...p, spotifyUrl: e.target.value }))}
                                onPaste={(e) => {
                                  const text = e.clipboardData.getData("text");
                                  if (text.includes("spotify.com/artist/")) {
                                    setTimeout(() => void fetchSpotifyImage(text, "edit"), 0);
                                  }
                                }}
                                onBlur={() => void fetchSpotifyImage(editForm.spotifyUrl, "edit")}
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                              />
                              <input
                                name="jr-artists-edit-monthly-listeners"
                                autoComplete="off"
                                inputMode="numeric"
                                type="number"
                                step={1}
                                placeholder="Monthly listeners"
                                value={editForm.monthlyListeners}
                                onChange={(e) => setEditForm((p) => ({ ...p, monthlyListeners: e.target.value }))}
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                              />
                              <div className="flex items-center gap-3">
                                {editForm.imageUrl ? (
                                  <img src={editForm.imageUrl} alt="Updated profile" className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                  <div className="h-12 w-12 rounded-full border border-zinc-700 bg-zinc-900" aria-hidden="true" />
                                )}
                                <div className="text-sm text-zinc-400">
                                  {isFetchingEditImage ? "Fetching Spotify image..." : "Photo updates when you paste a new Spotify URL."}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => void saveEdit()}
                                  className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

