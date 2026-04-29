import { CarouselArtist } from "@/components/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type CarouselArtistRow = {
  id: string;
  name: string;
  spotify_url: string;
  image_url: string | null;
  monthly_listeners: number | null;
  display_order: number | null;
};

export async function fetchCarouselArtists(): Promise<CarouselArtist[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("carousel_artists")
    .select("id, name, spotify_url, image_url, monthly_listeners, display_order")
    .order("display_order", { ascending: true });

  if (error || !data) return [];

  return (data as CarouselArtistRow[]).map((row, index) => ({
    id: row.id,
    name: row.name,
    spotifyUrl: row.spotify_url,
    imageUrl: row.image_url ?? null,
    monthlyListeners: Number(row.monthly_listeners ?? 0) || 0,
    displayOrder: Number(row.display_order ?? index) || 0
  }));
}

