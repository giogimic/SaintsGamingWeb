/**
 * Saints Gaming — World Event & Realm Mutation Engine (Studio Master Plan Phase 12)
 * Manages dynamic world events, timed global state modifiers, and composite realm mutation evaluation.
 */

export type WorldEventStatus = 'SCHEDULED' | 'ACTIVE' | 'DRAINING' | 'EXPIRED';

export interface RealmEventMutations {
  xpMultiplier?: number;
  goldMultiplier?: number;
  dropMultiplier?: number;
  gatheringYieldMultiplier?: number;
  spawnRateMultiplier?: number;
  magicPowerMultiplier?: number;
  weatherOverride?: string;
  lightingPresetOverride?: string;
  ambientMusicOverride?: string;
}

export interface WorldEventTemplate {
  slug: string;
  name: string;
  description: string;
  durationSeconds: number;
  mutations: RealmEventMutations;
  scheduleCron?: string;
}

export interface WorldEventState {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: WorldEventStatus;
  startedAt: number;
  endsAt: number;
  mutations: RealmEventMutations;
}

export interface CompiledRealmState {
  effectiveXpMultiplier: number;
  effectiveGoldMultiplier: number;
  effectiveDropMultiplier: number;
  effectiveGatheringMultiplier: number;
  effectiveSpawnRateMultiplier: number;
  effectiveMagicPowerMultiplier: number;
  activeWeather: string | null;
  activeLightingPreset: string | null;
  activeAmbientMusic: string | null;
  activeEvents: Array<{ id: string; slug: string; name: string; remainingSeconds: number }>;
}

export class WorldEventEngine {
  private templates = new Map<string, WorldEventTemplate>();
  private activeEvents = new Map<string, WorldEventState>();

  /**
   * Registers a reusable world event template.
   */
  public registerTemplate(template: WorldEventTemplate) {
    this.templates.set(template.slug, template);
  }

  /**
   * Starts an instance of a registered world event template.
   */
  public startEvent(slug: string, customDurationSeconds?: number, now: number = Date.now()): WorldEventState {
    const template = this.templates.get(slug);
    if (!template) {
      throw new Error(`World event template '${slug}' not registered`);
    }

    const durationSec = customDurationSeconds ?? template.durationSeconds ?? 3600;
    const eventId = `event_${slug}_${now}`;

    const eventState: WorldEventState = {
      id: eventId,
      slug: template.slug,
      name: template.name,
      description: template.description,
      status: 'ACTIVE',
      startedAt: now,
      endsAt: now + durationSec * 1000,
      mutations: { ...template.mutations },
    };

    this.activeEvents.set(eventId, eventState);
    return eventState;
  }

  /**
   * Manually ends or cancels an active world event.
   */
  public endEvent(eventId: string): boolean {
    const event = this.activeEvents.get(eventId);
    if (!event) return false;
    event.status = 'EXPIRED';
    this.activeEvents.delete(eventId);
    return true;
  }

  /**
   * Ticks the world event engine to prune expired events and return status transitions.
   */
  public tick(now: number = Date.now()): { started: WorldEventState[]; ended: WorldEventState[] } {
    const ended: WorldEventState[] = [];

    for (const [id, event] of this.activeEvents.entries()) {
      if (now >= event.endsAt) {
        event.status = 'EXPIRED';
        ended.push(event);
        this.activeEvents.delete(id);
      }
    }

    return { started: [], ended };
  }

  /**
   * Compiles the combined, effective realm mutation state across all active events.
   */
  public getCompiledRealmState(now: number = Date.now()): CompiledRealmState {
    this.tick(now);

    let xpMult = 1.0;
    let goldMult = 1.0;
    let dropMult = 1.0;
    let gatheringMult = 1.0;
    let spawnRateMult = 1.0;
    let magicPowerMult = 1.0;

    let weather: string | null = null;
    let lighting: string | null = null;
    let music: string | null = null;

    const eventList: Array<{ id: string; slug: string; name: string; remainingSeconds: number }> = [];

    for (const event of this.activeEvents.values()) {
      const m = event.mutations;
      if (m.xpMultiplier) xpMult *= m.xpMultiplier;
      if (m.goldMultiplier) goldMult *= m.goldMultiplier;
      if (m.dropMultiplier) dropMult *= m.dropMultiplier;
      if (m.gatheringYieldMultiplier) gatheringMult *= m.gatheringYieldMultiplier;
      if (m.spawnRateMultiplier) spawnRateMult *= m.spawnRateMultiplier;
      if (m.magicPowerMultiplier) magicPowerMult *= m.magicPowerMultiplier;

      // Latest active overrides take precedence for weather / lighting / music
      if (m.weatherOverride) weather = m.weatherOverride;
      if (m.lightingPresetOverride) lighting = m.lightingPresetOverride;
      if (m.ambientMusicOverride) music = m.ambientMusicOverride;

      const remainingSeconds = Math.max(0, Math.round((event.endsAt - now) / 1000));
      eventList.push({
        id: event.id,
        slug: event.slug,
        name: event.name,
        remainingSeconds,
      });
    }

    return {
      effectiveXpMultiplier: Number(xpMult.toFixed(2)),
      effectiveGoldMultiplier: Number(goldMult.toFixed(2)),
      effectiveDropMultiplier: Number(dropMult.toFixed(2)),
      effectiveGatheringMultiplier: Number(gatheringMult.toFixed(2)),
      effectiveSpawnRateMultiplier: Number(spawnRateMult.toFixed(2)),
      effectiveMagicPowerMultiplier: Number(magicPowerMult.toFixed(2)),
      activeWeather: weather,
      activeLightingPreset: lighting,
      activeAmbientMusic: music,
      activeEvents: eventList,
    };
  }
}
