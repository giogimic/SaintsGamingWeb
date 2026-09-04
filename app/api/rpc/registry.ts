import * as achievements from '@/app/actions/achievements';
import * as assets from '@/app/actions/assets';
import * as auth from '@/app/actions/auth';
import * as characterClasses from '@/app/actions/character-classes';
import * as creatureDefs from '@/app/actions/creature-defs';
import * as crossReferences from '@/app/actions/cross-references';
import * as dungeons from '@/app/actions/dungeons';
import * as gameAdmin from '@/app/actions/game-admin';
import * as gameDev from '@/app/actions/game-dev';
import * as game from '@/app/actions/game';
import * as gtc from '@/app/actions/gtc';
import * as itemTemplates from '@/app/actions/item-templates';
import * as mapNpcs from '@/app/actions/map-npcs';
import * as mapSpawners from '@/app/actions/map-spawners';
import * as messenger from '@/app/actions/messenger';
import * as mounts from '@/app/actions/mounts';
import * as npcDialogue from '@/app/actions/npc-dialogue';
import * as prefabs from '@/app/actions/prefabs';
import * as professions from '@/app/actions/professions';
import * as profile from '@/app/actions/profile';
import * as publishing from '@/app/actions/publishing';
import * as questTemplates from '@/app/actions/quest-templates';
import * as recipes from '@/app/actions/recipes';
import * as settings from '@/app/actions/settings';
import * as shops from '@/app/actions/shops';
import * as simulationPresets from '@/app/actions/simulation-presets';
import * as socialFolders from '@/app/actions/social-folders';
import * as social from '@/app/actions/social';
import * as starterHeroes from '@/app/actions/starter-heroes';
import * as steam from '@/app/actions/steam';
import * as userSettings from '@/app/actions/user-settings';
import * as user from '@/app/actions/user';
import * as users from '@/app/actions/users';
import * as worldEvents from '@/app/actions/world-events';
import * as worldProfiles from '@/app/actions/world-profiles';

export const actionRegistry: Record<string, any> = {
  'achievements': achievements,
  'assets': assets,
  'auth': auth,
  'character-classes': characterClasses,
  'creature-defs': creatureDefs,
  'cross-references': crossReferences,
  'dungeons': dungeons,
  'game-admin': gameAdmin,
  'game-dev': gameDev,
  'game': game,
  'gtc': gtc,
  'item-templates': itemTemplates,
  'map-npcs': mapNpcs,
  'map-spawners': mapSpawners,
  'messenger': messenger,
  'mounts': mounts,
  'npc-dialogue': npcDialogue,
  'prefabs': prefabs,
  'professions': professions,
  'profile': profile,
  'publishing': publishing,
  'quest-templates': questTemplates,
  'recipes': recipes,
  'settings': settings,
  'shops': shops,
  'simulation-presets': simulationPresets,
  'social-folders': socialFolders,
  'social': social,
  'starter-heroes': starterHeroes,
  'steam': steam,
  'user-settings': userSettings,
  'user': user,
  'users': users,
  'world-events': worldEvents,
  'world-profiles': worldProfiles,
};
