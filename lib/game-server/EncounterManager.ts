import { GameEngine } from "./GameEngine";
import { SpawnMode } from "./types";

export interface EncounterProvider {
  type: string;
  trigger(accountId: string, mapId: string, x: number, y: number): void;
}

export class EncounterManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("triggerEncounter", (data) => this.handleEncounterTrigger(data));
  }

  private handleEncounterTrigger(data: { providerType: string, accountId: string, mapId: string, x: number, y: number }) {
    // Example: A generic handler for encounter sources like Grass, Fishing, Cave, Script
    // For now, it just rolls a random chance and spawns a creature.
    
    // In a real MMO, this looks up a loot/spawn table for the given mapId and providerType.
    const spawnChance = Math.random();
    
    if (spawnChance > 0.5) { // 50% chance for demo purposes
      const templates = ["Pebblad", "Vulcan", "Aquan"]; // Mock templates
      const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
      
      this.engine.events.emit("spawnCreature", {
        templateId: selectedTemplate,
        mapId: data.mapId,
        x: data.x,
        y: data.y,
        spawnMode: SpawnMode.ENCOUNTER_PRIVATE,
        ownerId: data.accountId // Bound to the player who triggered it
      });
      
      // Notify the player specifically that they triggered an encounter
      this.engine.events.emit("directMessage", {
        socketId: "lookup_socket_id", // We need the socketId, so we will broadcast via network event instead for now
        event: "encounter_triggered",
        data: { templateId: selectedTemplate }
      });
    }
  }
}
