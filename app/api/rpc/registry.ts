import * as achievements from '@/app/actions/game/achievements';
import * as assets from '@/app/actions/studio/assets';
import * as auth from '@/app/actions/user/auth';
import * as characterClasses from '@/app/actions/game/character-classes';
import * as creatureDefs from '@/app/actions/game/creature-defs';
import * as crossReferences from '@/app/actions/studio/cross-references';
import * as dungeons from '@/app/actions/game/dungeons';
import * as gameAdmin from '@/app/actions/admin/game-admin';
import * as gameDev from '@/app/actions/admin/game-dev';
import * as game from '@/app/actions/game';
import * as gtc from '@/app/actions/gtc';
import * as itemTemplates from '@/app/actions/game/item-templates';
import * as mapNpcs from '@/app/actions/studio/map-npcs';
import * as mapSpawners from '@/app/actions/studio/map-spawners';
import * as messenger from '@/app/actions/messenger';
import * as mounts from '@/app/actions/game/mounts';
import * as npcDialogue from '@/app/actions/studio/npc-dialogue';
import * as prefabs from '@/app/actions/studio/prefabs';
import * as professions from '@/app/actions/studio/professions';
import * as profile from '@/app/actions/user/profile';
import * as publishing from '@/app/actions/studio/publishing';
import * as questTemplates from '@/app/actions/game/quest-templates';
import * as recipes from '@/app/actions/game/recipes';
import * as settings from '@/app/actions/settings';
import * as shops from '@/app/actions/game/shops';
import * as simulationPresets from '@/app/actions/studio/simulation-presets';
import * as socialFolders from '@/app/actions/social-folders';
import * as social from '@/app/actions/social';
import * as starterHeroes from '@/app/actions/game/starter-heroes';
import * as steam from '@/app/actions/steam';
import * as userSettings from '@/app/actions/user/user-settings';
import * as user from '@/app/actions/user/user';
import * as users from '@/app/actions/user/users';
import * as worldEvents from '@/app/actions/game/world-events';
import * as worldProfiles from '@/app/actions/studio/world-profiles';

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
