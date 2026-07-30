import { useGameStore } from '../store';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardType: 'DAEMON' | 'XP' | 'ITEM';
  rewardValue: string | number;
  condition: (state: ReturnType<typeof useGameStore.getState>) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    title: 'First Decryption',
    description: 'Capture your first wild Anomaly.',
    rewardType: 'XP',
    rewardValue: 100,
    condition: (state) => state.player.caughtDaemons.length >= 2, // 1 starter + 1 caught
  },
  {
    id: 'collector_10',
    title: 'Data Hoarder',
    description: 'Register 10 unique Daemons to your Dex.',
    rewardType: 'DAEMON',
    rewardValue: '018', // Rewards a Wirebug
    condition: (state) => state.player.caughtDaemons.length >= 10,
  },
  {
    id: 'explorer_neon',
    title: 'Grid Runner',
    description: 'Bypass the Nexus firewall and enter Neon Grid City.',
    rewardType: 'XP',
    rewardValue: 250,
    condition: (state) => state.currentMapId === 'NEON_CITY',
  }
];

// Helper function that can be called periodically or on specific state changes
export const processAchievements = () => {
  const state = useGameStore.getState();
  
  // In a full implementation, we would check a `state.player.unlockedAchievements` array 
  // to ensure we only trigger the reward once.
  const newlyUnlocked = ACHIEVEMENTS.filter(ach => ach.condition(state));
  
  newlyUnlocked.forEach(ach => {
    // Fire event to parent application (e.g. window.dispatchEvent or props callback)
    console.log(`[SAINTS GAMING] Achievement Unlocked: ${ach.title}`);
    
    // Optionally trigger in-game rewards directly
    if (ach.rewardType === 'XP') {
      // state.addXp(ach.rewardValue);
    }
  });
};
