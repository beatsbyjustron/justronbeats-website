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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}
