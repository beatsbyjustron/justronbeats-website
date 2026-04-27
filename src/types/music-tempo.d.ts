declare module "music-tempo" {
  type MusicTempoParams = {
    bufferSize?: number;
    hopSize?: number;
    timeStep?: number;
    [key: string]: unknown;
  };

  export default class MusicTempo {
    constructor(audioData: number[] | Float32Array, params?: MusicTempoParams);
    tempo: number | string;
  }
}
