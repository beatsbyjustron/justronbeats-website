type StopHandler = () => void;

const players = new Map<string, StopHandler>();
let activePlayerId: string | null = null;

export function registerAudioPlayer(playerId: string, stop: StopHandler) {
  players.set(playerId, stop);
}

export function unregisterAudioPlayer(playerId: string) {
  players.delete(playerId);
  if (activePlayerId === playerId) {
    activePlayerId = null;
  }
}

export function activateAudioPlayer(playerId: string) {
  if (activePlayerId && activePlayerId !== playerId) {
    const stopPrevious = players.get(activePlayerId);
    if (stopPrevious) stopPrevious();
  }
  activePlayerId = playerId;
}
