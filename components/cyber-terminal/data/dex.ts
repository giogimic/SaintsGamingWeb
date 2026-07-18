import { ElementType } from '../combat';

export interface DaemonSpecies {
  id: string;
  name: string;
  type: ElementType;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  assetPath: string;
  description: string;
}

export const DAEMON_DEX: Record<string, DaemonSpecies> = {
  'd-001': {
    id: 'd-001',
    name: 'Arachno-Byte',
    type: 'Cyber',
    baseHp: 45,
    baseAttack: 60,
    baseDefense: 40,
    baseSpeed: 70,
    assetPath: '/game-assets/daemon_data.png',
    description: 'A robotic spider program designed to crawl through massive databases and index raw information.',
  },
  'v-001': {
    id: 'v-001',
    name: 'Paladin.exe',
    type: 'Solar',
    baseHp: 65,
    baseAttack: 50,
    baseDefense: 70,
    baseSpeed: 40,
    assetPath: '/game-assets/daemon_vaccine.png',
    description: 'A glowing knight-program made of pure light. Serves as heavy-duty firewall protection.',
  },
  'x-001': {
    id: 'x-001',
    name: 'Skull-Troj',
    type: 'Bio',
    baseHp: 50,
    baseAttack: 70,
    baseDefense: 35,
    baseSpeed: 60,
    assetPath: '/game-assets/daemon_virus.png',
    description: 'A corrupted skull surrounded by glitching digital energy. Highly aggressive and unpredictable.',
  },
};

export const getRandomEncounter = (): DaemonSpecies => {
  const keys = Object.keys(DAEMON_DEX);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return DAEMON_DEX[randomKey];
};
