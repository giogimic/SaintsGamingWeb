import { Howl } from 'howler';

let encryptedTrack: Howl | null = null;

export const setEncryptedAmbient = (active: boolean) => {
  if (typeof window === 'undefined') return;

  if (!encryptedTrack) {
    encryptedTrack = new Howl({
      // Placeholder data URI for ambient track
      src: ['data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqq'],
      loop: true,
      volume: 0,
    });
  }

  if (active && !encryptedTrack.playing()) {
    encryptedTrack.play();
    encryptedTrack.fade(0, 0.5, 1000);
  } else if (!active && encryptedTrack.playing()) {
    encryptedTrack.fade(encryptedTrack.volume(), 0, 1000);
    encryptedTrack.once('fade', () => {
      encryptedTrack?.pause();
    });
  }
};
