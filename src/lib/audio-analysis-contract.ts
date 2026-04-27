export type AnalyzeRequest = { id: number; buffer: ArrayBuffer };

export type AnalyzeResponse = {
  id: number;
  bpm: number | null;
  key: string | null;
  error?: string;
};
