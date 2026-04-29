"use client";

import { useEffect, useState } from "react";
import type { CarouselArtist } from "@/components/types";

type SpotifyArtistSearchResult = {
  spotifyArtistId: string;
  name: string;
  spotifyUrl: string;
  imageUrl: string | null;
  monthlyListeners: number;
};

type CarouselArtistsAdminProps = {
  password: string;
};

function formatListeners(value: number) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.floor(value)));
}

type ArtistSearchInputProps = {
  password: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (artist: SpotifyArtistSearchResult) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
};

function ArtistSearchInput({ password, value, onChange, onSelect, placeholder, disabled }: ArtistSearchInputProps) {
  const [results, setResults] = useState<SpotifyArtistSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/carousel-artists/search?q=${encodeURIComponent(query)}`, {
          headers: { "x-admin-password": password }
        });
        const json = (await response.json()) as { artists?: SpotifyArtistSearchResult[] };
        if (!response.ok) {
          setResults([]);
          setIsOpen(false);
          setIsLoading(false);
          return;
        }
        setResults(json.artists ?? []);
        setIsOpen(true);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [value, password]);

  return (
    <div className="relative">
      <input
        name="jr-artists-spotify-search"
        autoComplete="off"
        placeholder={placeholder ?? "Search for an artist on Spotify..."}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (results.length) setIsOpen(true);
        }}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
      />
      {isLoading && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Searching...</span>
      )}
      {isOpen && !!results.length && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 shadow-xl">
          {results.map((artist) => (
            <button
              key={artist.spotifyArtistId}
              type="button"
              className="flex w-full items-center gap-3 border-b border-zinc-900 px-3 py-2 text-left hover:bg-zinc-900/70 last:border-b-0"
              onClick={async () => {
                await onSelect(artist);
                setIsOpen(false);
                setResults([]);
              }}
            >
              {artist.imageUrl ? (
                <img src={artist.imageUrl} alt={`${artist.name} profile`} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full border border-zinc-700 bg-zinc-900" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-100">{artist.name}</p>
                <p className="truncate text-xs text-zinc-400">{formatListeners(artist.monthlyListeners)} monthly listeners</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CarouselArtistsAdmin({ password }: CarouselArtistsAdminProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "error" | "success"; message: string }>({
    type: "idle",
    message: ""
  });

  const [artists, setArtists] = useState<CarouselArtist[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<SpotifyArtistSearchResult | null>(null);
  const [manualMonthlyListeners, setManualMonthlyListeners] = useState("");
  const [isAddingArtist, setIsAddingArtist] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    spotifyUrl: string;
    monthlyListeners: number;
    imageUrl: string | null;
    searchValue: string;
  }>({
    name: "",
    spotifyUrl: "",
    monthlyListeners: 0,
    imageUrl: null,
    searchValue: ""
  });

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

  const addArtist = async () => {
    setStatus({ type: "idle", message: "" });
    if (!selectedArtist) {
      setStatus({ type: "error", message: "Select an artist from Spotify search first." });
      return;
    }
    const listeners = Number(manualMonthlyListeners.replace(/,/g, "").trim());
    if (!Number.isFinite(listeners) || listeners < 0) {
      setStatus({ type: "error", message: "Enter a valid monthly listeners number." });
      return;
    }
    try {
      setIsAddingArtist(true);

      const res = await fetch("/api/admin/carousel-artists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password
        },
        body: JSON.stringify({
          name: selectedArtist.name,
          spotifyUrl: selectedArtist.spotifyUrl,
          monthlyListeners: Math.floor(listeners),
          imageUrl: selectedArtist.imageUrl ?? null
        })
      });

      const json = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !json.success) {
        setStatus({ type: "error", message: json.error ?? "Failed to add artist." });
        return;
      }

      const addedName = selectedArtist.name;
      setSearchInput("");
      setSelectedArtist(null);
      setManualMonthlyListeners("");
      setStatus({ type: "success", message: `Added ${addedName} to carousel.` });
      await loadArtists();
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to add artist." });
    } finally {
      setIsAddingArtist(false);
    }
  };

  const beginEdit = (artist: CarouselArtist) => {
    setEditingId(artist.id);
    setEditForm({
      name: artist.name,
      spotifyUrl: artist.spotifyUrl,
      monthlyListeners: artist.monthlyListeners ?? 0,
      imageUrl: artist.imageUrl,
      searchValue: artist.name
    });
    setStatus({ type: "idle", message: "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", spotifyUrl: "", monthlyListeners: 0, imageUrl: null, searchValue: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setStatus({ type: "idle", message: "" });

    try {
      const name = editForm.name.trim();
      const spotifyUrl = editForm.spotifyUrl.trim();
      const monthlyListeners = editForm.monthlyListeners;

      if (!name || !spotifyUrl) {
        setStatus({ type: "error", message: "Select a Spotify artist before saving." });
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
            <ArtistSearchInput
              password={password}
              value={searchInput}
              onChange={(value) => {
                setSearchInput(value);
                if (!value.trim()) {
                  setSelectedArtist(null);
                  setManualMonthlyListeners("");
                }
              }}
              onSelect={(artist) => {
                setSelectedArtist(artist);
                setSearchInput(artist.name);
                // Keep this empty so admin can type current Spotify number manually.
                setManualMonthlyListeners("");
              }}
              placeholder="Search for an artist on Spotify..."
              disabled={isAddingArtist}
            />
            <input
              name="jr-artists-manual-monthly-listeners"
              autoComplete="off"
              inputMode="numeric"
              type="number"
              min={0}
              step={1}
              placeholder="Monthly Listeners"
              disabled={isAddingArtist || !selectedArtist}
              value={manualMonthlyListeners}
              onChange={(event) => setManualMonthlyListeners(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-zinc-500">Select artist from Spotify, enter listeners, then click Add Artist.</p>
            {isAddingArtist && (
              <p className="text-xs text-zinc-400">Adding artist...</p>
            )}
            <button
              type="button"
              onClick={() => void addArtist()}
              disabled={!selectedArtist || !manualMonthlyListeners.trim() || isAddingArtist}
              className="w-max rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
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
                              <ArtistSearchInput
                                password={password}
                                value={editForm.searchValue}
                                onChange={(value) => setEditForm((p) => ({ ...p, searchValue: value }))}
                                onSelect={(artist) => {
                                  setEditForm((p) => ({
                                    ...p,
                                    searchValue: artist.name,
                                    name: artist.name,
                                    spotifyUrl: artist.spotifyUrl,
                                    imageUrl: artist.imageUrl,
                                    monthlyListeners: artist.monthlyListeners
                                  }));
                                }}
                                placeholder="Search for an artist..."
                              />
                              <div className="flex items-center gap-3">
                                {editForm.imageUrl ? (
                                  <img src={editForm.imageUrl} alt="Updated profile" className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                  <div className="h-12 w-12 rounded-full border border-zinc-700 bg-zinc-900" aria-hidden="true" />
                                )}
                                <div className="text-sm text-zinc-400">
                                  {formatListeners(editForm.monthlyListeners)} monthly listeners
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

