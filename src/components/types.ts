export type Beat = {
  id: string;
  title: string;
  bpm: number;
  key: string;
  producedBy: string[];
  tags: string[];
  coverArtUrl: string;
  mp3Url: string;
  wavUrl: string;
  stemsUrl: string;
  featured: boolean;
};

export type FeaturedProduction = {
  id: string;
  song: string;
  artist: string;
  coverArt: string;
};
