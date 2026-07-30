import { Howl } from 'howler';

let townBgm: Howl | null = null;
let battleBgm: Howl | null = null;
let victorySfx: Howl | null = null;

export const playTownBgm = () => {
  if (typeof window === 'undefined') return;
  if (!townBgm) {
    townBgm = new Howl({
      src: ['/tuxemon-assets/audio/music/town.ogg', '/tuxemon-assets/audio/music/town.mp3'],
      loop: true,
      volume: 0.3,
      html5: true
    });
  }
  if (battleBgm?.playing()) battleBgm.stop();
  if (!townBgm.playing()) {
    townBgm.play();
  }
};

export const playBattleBgm = () => {
  if (typeof window === 'undefined') return;
  if (!battleBgm) {
    battleBgm = new Howl({
      src: ['/tuxemon-assets/audio/music/battle.ogg', '/tuxemon-assets/audio/music/battle.mp3'],
      loop: true,
      volume: 0.4,
      html5: true
    });
  }
  if (townBgm?.playing()) townBgm.pause();
  if (!battleBgm.playing()) {
    battleBgm.play();
  }
};

export const playVictorySfx = () => {
  if (typeof window === 'undefined') return;
  if (!victorySfx) {
    victorySfx = new Howl({
      src: ['/tuxemon-assets/audio/sound/victory.wav'],
      volume: 0.5
    });
  }
  if (battleBgm?.playing()) battleBgm.pause();
  victorySfx.play();
};

export const stopBgm = () => {
  if (townBgm?.playing()) townBgm.stop();
  if (battleBgm?.playing()) battleBgm.stop();
};

export const setEncryptedAmbient = (active: boolean) => {
  if (active) playBattleBgm();
  else playTownBgm();
};
