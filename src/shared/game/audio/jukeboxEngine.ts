/**
 * Saints Gaming — Music Track Playlist & Regional Song Unlock Jukebox Engine (Bible 28)
 * Manages background music tracks, map region discovery unlocks, playlist queues, and playback modes.
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  regionMapId: string;
  durationSec: number;
  audioUrl: string;
}

export const CANONICAL_MUSIC_TRACKS: Record<string, MusicTrack> = {
  track_saints_harmony: {
    id: 'track_saints_harmony',
    title: 'Saints Harmony',
    artist: 'Saints Soundworks',
    regionMapId: 'DEMO_SANDBOX',
    durationSec: 180,
    audioUrl: '/audio/music/saints_harmony.mp3',
  },
  track_whispering_pines: {
    id: 'track_whispering_pines',
    title: 'Whispering Pines',
    artist: 'Saints Soundworks',
    regionMapId: 'WILD_MEADOWS',
    durationSec: 210,
    audioUrl: '/audio/music/whispering_pines.mp3',
  },
  track_forge_of_ancients: {
    id: 'track_forge_of_ancients',
    title: 'Forge of the Ancients',
    artist: 'Saints Soundworks',
    regionMapId: 'QUARRY_MINE',
    durationSec: 165,
    audioUrl: '/audio/music/forge_of_ancients.mp3',
  },
  track_depths_of_despair: {
    id: 'track_depths_of_despair',
    title: 'Depths of Despair',
    artist: 'Saints Soundworks',
    regionMapId: 'WHISPERING_FOREST',
    durationSec: 240,
    audioUrl: '/audio/music/depths_of_despair.mp3',
  },
  track_new_beginnings: {
    id: 'track_new_beginnings',
    title: 'New Beginnings',
    artist: 'Saints Soundworks',
    regionMapId: 'TUTORIAL_ISLAND',
    durationSec: 150,
    audioUrl: '/audio/music/new_beginnings.mp3',
  },
  track_grand_coronation: {
    id: 'track_grand_coronation',
    title: 'Grand Coronation',
    artist: 'Saints Soundworks',
    regionMapId: 'SAINTS_CITADEL',
    durationSec: 200,
    audioUrl: '/audio/music/grand_coronation.mp3',
  },
};

export interface JukeboxState {
  unlockedTrackIds: string[];
  currentTrackId?: string;
  isPlaying: boolean;
  isLooping: boolean;
  isShuffling: boolean;
  playlistQueue: string[];
}

/**
 * Initializes a player's jukebox state.
 */
export function createJukeboxState(initialUnlockedIds: string[] = ['track_saints_harmony']): JukeboxState {
  return {
    unlockedTrackIds: Array.from(new Set(initialUnlockedIds)),
    currentTrackId: initialUnlockedIds[0],
    isPlaying: false,
    isLooping: false,
    isShuffling: false,
    playlistQueue: [],
  };
}

/**
 * Discovers and unlocks a region's theme song when the player enters a map.
 */
export function discoverRegionTrack(
  state: JukeboxState,
  mapId: string
): { newUnlock: boolean; track?: MusicTrack } {
  const match = Object.values(CANONICAL_MUSIC_TRACKS).find(
    (t) => t.regionMapId.toLowerCase() === mapId.toLowerCase()
  );

  if (!match) {
    return { newUnlock: false };
  }

  const isAlreadyUnlocked = state.unlockedTrackIds.includes(match.id);
  if (!isAlreadyUnlocked) {
    state.unlockedTrackIds.push(match.id);
    return { newUnlock: true, track: match };
  }

  return { newUnlock: false, track: match };
}

/**
 * Plays a specific music track if unlocked.
 */
export function playTrack(
  state: JukeboxState,
  trackId: string
): { success: boolean; track?: MusicTrack; reason?: string } {
  const track = CANONICAL_MUSIC_TRACKS[trackId];
  if (!track) {
    return { success: false, reason: 'Unknown music track.' };
  }

  if (!state.unlockedTrackIds.includes(trackId)) {
    return { success: false, reason: 'You have not unlocked this music track yet.' };
  }

  state.currentTrackId = trackId;
  state.isPlaying = true;
  return { success: true, track };
}

/**
 * Enqueues a music track to the jukebox playlist.
 */
export function queueTrack(
  state: JukeboxState,
  trackId: string
): { success: boolean; queuePosition: number; reason?: string } {
  if (!state.unlockedTrackIds.includes(trackId)) {
    return { success: false, queuePosition: -1, reason: 'Track is locked.' };
  }

  state.playlistQueue.push(trackId);
  return { success: true, queuePosition: state.playlistQueue.length };
}

/**
 * Skips to the serapht track in the queue, or loops/shuffles.
 */
export function seraphtTrack(state: JukeboxState): { trackId?: string; stopped: boolean } {
  if (state.playlistQueue.length > 0) {
    const seraphtId = state.playlistQueue.shift()!;
    state.currentTrackId = seraphtId;
    state.isPlaying = true;
    return { trackId: seraphtId, stopped: false };
  }

  if (state.isLooping && state.currentTrackId) {
    return { trackId: state.currentTrackId, stopped: false };
  }

  if (state.isShuffling && state.unlockedTrackIds.length > 0) {
    const randomId =
      state.unlockedTrackIds[Math.floor(Math.random() * state.unlockedTrackIds.length)];
    state.currentTrackId = randomId;
    state.isPlaying = true;
    return { trackId: randomId, stopped: false };
  }

  state.isPlaying = false;
  return { trackId: undefined, stopped: true };
}
