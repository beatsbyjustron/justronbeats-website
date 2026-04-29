export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Minimal schema so PostgREST queries type-check under @supabase/supabase-js GenericSchema rules. */

export interface Database {
  public: {
    Tables: {
      beats: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          producer_credits: string | null;
          key: string;
          bpm: number;
          tags: string[];
          cover_art_url: string | null;
          mp3_url: string;
          wav_url: string | null;
          stems_url: string | null;
          featured: boolean;
          lease_price: number | null;
          lease_terms: string | null;
          premium_price: number | null;
          premium_terms: string | null;
          exclusive_price: number | null;
          exclusive_terms: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          producer_credits?: string | null;
          key: string;
          bpm: number;
          tags?: string[];
          cover_art_url?: string | null;
          mp3_url: string;
          wav_url?: string | null;
          stems_url?: string | null;
          featured?: boolean;
          lease_price?: number | null;
          lease_terms?: string | null;
          premium_price?: number | null;
          premium_terms?: string | null;
          exclusive_price?: number | null;
          exclusive_terms?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["beats"]["Insert"]>;
        Relationships: [];
      };
      beat_offers: {
        Row: {
          id: string;
          created_at: string;
          beat_id: string;
          buyer_email: string;
          offer_amount: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          beat_id: string;
          buyer_email: string;
          offer_amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["beat_offers"]["Insert"]>;
        Relationships: [];
      };
      productions: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          artist: string;
          cover_url: string;
          spotify_url: string | null;
          apple_url: string | null;
          youtube_url: string | null;
          soundcloud_url: string | null;
          year: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          artist: string;
          cover_url: string;
          spotify_url?: string | null;
          apple_url?: string | null;
          youtube_url?: string | null;
          soundcloud_url?: string | null;
          year?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["productions"]["Insert"]>;
        Relationships: [];
      };
      drum_kits: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string | null;
          price: number;
          image_path: string | null;
          zip_path: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          description?: string | null;
          price?: number;
          image_path?: string | null;
          zip_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["drum_kits"]["Insert"]>;
        Relationships: [];
      };
      carousel_artists: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          spotify_url: string;
          image_url: string | null;
          monthly_listeners: number;
          display_order: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          spotify_url: string;
          image_url?: string | null;
          monthly_listeners?: number;
          display_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["carousel_artists"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}
