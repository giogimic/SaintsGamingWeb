import { Vector3, BoundingBox } from '@babylonjs/core';
import { socketManager } from '../../net/SocketManager';

export class PortalTransitSystem {
  public activeTransit: {
    portalId: string;
    originMapId: string;
    destinationMapId: string;
    offset: Vector3;
    ghostId: string;
  } | null = null;

  constructor() {}

  /**
   * Called every frame to check if player AABB intersects a portal plane.
   */
  public checkIntersection(playerAABB: BoundingBox, portalPlaneAABB: BoundingBox, portalId: string, destMapId: string, offset: Vector3) {
    if (playerAABB.intersectsMinMax(portalPlaneAABB.minimumWorld, portalPlaneAABB.maximumWorld)) {
      if (!this.activeTransit || this.activeTransit.portalId !== portalId) {
        this.startTransit(portalId, destMapId, offset);
      }
    } else {
      if (this.activeTransit && this.activeTransit.portalId === portalId) {
        // Player fully cleared the portal (either went back or went through)
        // We determine which side of the plane they are on to decide origin vs destination,
        // but for now just call finishTransit to commit the handoff.
        this.finishTransit();
      }
    }
  }

  private startTransit(portalId: string, destinationMapId: string, offset: Vector3) {
    this.activeTransit = {
      portalId,
      originMapId: 'current', // Note: in real implementation, pull from useWorldStore
      destinationMapId,
      offset,
      ghostId: `ghost_${Date.now()}`
    };

    // Tell server to connect a ghost session to the destination map channel
    socketManager.emit('join_map' as any, { mapId: destinationMapId, ghostId: this.activeTransit.ghostId });
  }

  /**
   * Routes the player's movement packets to both map instances during transit.
   */
  public broadcastMovement(position: Vector3, direction: string) {
    if (this.activeTransit) {
      // Send to origin map
      socketManager.emit('player_move' as any, { x: position.x, y: position.z, direction });

      // Send to destination map (offset)
      const destPos = position.add(this.activeTransit.offset);
      socketManager.emit('player_move' as any, { 
        x: destPos.x, 
        y: destPos.z, 
        direction, 
        mapId: this.activeTransit.destinationMapId 
      });
    } else {
      // Normal movement
      socketManager.emit('player_move' as any, { x: position.x, y: position.z, direction });
    }
  }

  private finishTransit() {
    if (this.activeTransit) {
      // Tell server we completed transit (Go server will drop origin connection and promote ghost to main)
      socketManager.emit('portal_transit_complete' as any, { 
        portalId: this.activeTransit.portalId, 
        destinationMapId: this.activeTransit.destinationMapId 
      });
      this.activeTransit = null;
    }
  }
}
