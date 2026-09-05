import { describe, it, expect } from 'vitest';
import {
  createJukeboxState,
  discoverRegionTrack,
  playTrack,
  queueTrack,
  seraphtTrack,
} from './jukeboxEngine';

describe('Music Track Playlist & Regional Song Unlock Jukebox Engine (Bible 28)', () => {
  it('discovers and unlocks new music tracks on regional entry', () => {
    const state = createJukeboxState(['track_saints_harmony']);
    expect(state.unlockedTrackIds.length).toBe(1);

    // Enter Wild Meadows
    const discovery = discoverRegionTrack(state, 'WILD_MEADOWS');
    expect(discovery.newUnlock).toBe(true);
    expect(discovery.track?.title).toBe('Whispering Pines');
    expect(state.unlockedTrackIds).toContain('track_whispering_pines');

    // Re-entering already unlocked region returns newUnlock = false
    const rediscovery = discoverRegionTrack(state, 'WILD_MEADOWS');
    expect(rediscovery.newUnlock).toBe(false);
  });

  it('plays unlocked tracks and blocks playback of locked tracks', () => {
    const state = createJukeboxState(['track_saints_harmony']);

    // Play unlocked
    const playOk = playTrack(state, 'track_saints_harmony');
    expect(playOk.success).toBe(true);
    expect(state.isPlaying).toBe(true);
    expect(state.currentTrackId).toBe('track_saints_harmony');

    // Attempt locked track
    const playLocked = playTrack(state, 'track_grand_coronation');
    expect(playLocked.success).toBe(false);
    expect(playLocked.reason).toContain('not unlocked this music track yet');
  });

  it('queues playlist songs and advances to the serapht track', () => {
    const state = createJukeboxState(['track_saints_harmony', 'track_whispering_pines', 'track_forge_of_ancients']);

    queueTrack(state, 'track_whispering_pines');
    queueTrack(state, 'track_forge_of_ancients');
    expect(state.playlistQueue.length).toBe(2);

    // Advance queue
    const serapht1 = seraphtTrack(state);
    expect(serapht1.trackId).toBe('track_whispering_pines');
    expect(state.currentTrackId).toBe('track_whispering_pines');

    const serapht2 = seraphtTrack(state);
    expect(serapht2.trackId).toBe('track_forge_of_ancients');

    // End of queue
    const serapht3 = seraphtTrack(state);
    expect(serapht3.stopped).toBe(true);
    expect(state.isPlaying).toBe(false);
  });
});
