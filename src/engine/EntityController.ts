import { BabylonEngine } from './BabylonEngine';

import { Mesh, TransformNode, Vector3, Color3, StandardMaterial, ParticleSystem, Animation, MeshBuilder } from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';
import { ItemBillboardRenderer } from './ItemBillboardRenderer';
import { resolveEntitySpriteUrl } from '../shared/game/creatureCatalog';
import { resolveSpriteDefinition, spriteDefinitionToBabylonConfig } from '../shared/game/spriteDefinitions';
import { ENTITY_GROUND_CLEARANCE } from './helpers/babylonViewHelpers';


export class EntityController {
  public engine: BabylonEngine;
  constructor(engine: BabylonEngine) {
    this.engine = engine;
  }

public nameplates: Map<string, Rectangle> = new Map();
public updateTargetSelectionIndicator(deltaTime: number) {
    if (!this.engine.activeTargetEntityId) {
      if (this.engine.selectionRingMesh && this.engine.selectionRingMesh.isVisible) {
        this.engine.selectionRingMesh.isVisible = false;
      }
      return;
    }

    const targetMesh = this.engine.getTargetEntityMesh(this.engine.activeTargetEntityId);
    if (!targetMesh || targetMesh.isDisposed()) {
      if (this.engine.selectionRingMesh && this.engine.selectionRingMesh.isVisible) {
        this.engine.selectionRingMesh.isVisible = false;
      }
      return;
    }

    const ring = this.engine.ensureSelectionRingMesh();
    if (!ring.isVisible) ring.isVisible = true;

    // Follow target's real-time position smoothly
    ring.position.x = targetMesh.position.x;
    ring.position.z = targetMesh.position.z;
    ring.position.y = targetMesh.position.y + 0.03;

    // Continuous smooth rotation
    ring.rotation.y += deltaTime * 2.2;

    // Subtle breathing pulse
    const pulse = 1.0 + Math.sin(performance.now() * 0.005) * 0.05;
    const baseScale = (this.engine.currentTileSize || 1) * pulse;
    ring.scaling.set(baseScale, baseScale, baseScale);

    // Dynamic color coding based on entity type
    if (this.engine.selectionRingMaterial) {
      const isCreature =
        targetMesh.metadata?.isCreature ||
        this.engine.activeTargetEntityId.startsWith('creature_') ||
        this.engine.activeTargetEntityId.startsWith('mob_') ||
        this.engine.activeTargetEntityId.startsWith('wild_');
      const isNpc = targetMesh.metadata?.isNpc || this.engine.activeTargetEntityId.startsWith('npc_');

      if (isCreature) {
        // Crimson / Rose for hostile creatures
        this.engine.selectionRingMaterial.emissiveColor.set(1.0, 0.2, 0.3);
        this.engine.selectionRingMaterial.diffuseColor.set(1.0, 0.2, 0.3);
      } else if (isNpc) {
        // Warm Amber / Gold for NPCs
        this.engine.selectionRingMaterial.emissiveColor.set(1.0, 0.75, 0.15);
        this.engine.selectionRingMaterial.diffuseColor.set(1.0, 0.75, 0.15);
      } else {
        // Cyan / Electric Blue for Players
        this.engine.selectionRingMaterial.emissiveColor.set(0.2, 0.85, 1.0);
        this.engine.selectionRingMaterial.diffuseColor.set(0.2, 0.85, 1.0);
      }
    }
  }

}
