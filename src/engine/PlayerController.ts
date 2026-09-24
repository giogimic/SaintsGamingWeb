export type MovementState = 
  // Grounded
  | 'IDLE' | 'WALK' | 'RUN' | 'SPRINT' | 'CROUCH' | 'SLIDE'
  // Airborne
  | 'JUMP' | 'FALL' | 'DIVE' | 'AIR_CONTROL' | 'ROLL_PREPARATION'
  // Surface Interaction
  | 'WALL_CONTACT' | 'WALL_RUN' | 'WALL_SLIDE' | 'WALL_JUMP' | 'WALL_GRAB' | 'LEDGE_GRAB'
  // Traversal
  | 'VAULT' | 'LEDGE_CLIMB' | 'MANTLE' | 'CRAWL' | 'CLIMB'
  // Recovery
  | 'LANDING' | 'HARD_LANDING' | 'ROLL' | 'STUMBLE';

export class PlayerController {
  private currentState: MovementState = 'IDLE';

  // State Context
  private isGrounded: boolean = true;
  private velocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private timeInState: number = 0;

  constructor() {
    this.currentState = 'IDLE';
  }

  public getState(): MovementState {
    return this.currentState;
  }

  public setState(newState: MovementState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.timeInState = 0;
      // Emit state change event if needed for animations
    }
  }

  public update(deltaTime: number, input: { dx: number, dz: number, jump: boolean, sprint: boolean }, environment: { obstacleDetected: boolean, wallDetected: boolean, ledgeDetected: boolean }) {
    this.timeInState += deltaTime;

    switch (this.currentState) {
      case 'IDLE':
        if (input.jump) {
          this.setState('JUMP');
        } else if (input.dx !== 0 || input.dz !== 0) {
          if (input.sprint) this.setState('SPRINT');
          else this.setState('RUN');
        }
        break;

      case 'RUN':
      case 'WALK':
        if (input.jump) {
          this.setState('JUMP');
        } else if (input.dx === 0 && input.dz === 0) {
          this.setState('IDLE');
        } else if (input.sprint) {
          this.setState('SPRINT');
        }
        break;

      case 'SPRINT':
        if (environment.obstacleDetected) {
          this.setState('VAULT');
        } else if (input.jump) {
          this.setState('JUMP');
        } else if (input.dx === 0 && input.dz === 0) {
          this.setState('IDLE');
        } else if (!input.sprint) {
          this.setState('RUN');
        }
        break;

      case 'VAULT':
        // Wait for vault animation/time to finish
        if (this.timeInState > 0.5) { // Assuming 0.5s vault
          this.setState('LANDING');
        }
        break;

      case 'JUMP':
        if (environment.wallDetected && input.sprint) {
          this.setState('WALL_RUN');
        } else if (environment.ledgeDetected) {
          this.setState('LEDGE_GRAB');
        } else if (this.velocity.y < 0) {
          this.setState('FALL');
        }
        break;

      case 'FALL':
        if (this.isGrounded) {
          this.setState('LANDING');
        } else if (environment.ledgeDetected) {
          this.setState('LEDGE_GRAB');
        }
        break;

      case 'WALL_RUN':
        if (input.jump) {
          this.setState('WALL_JUMP');
        } else if (this.timeInState > 1.0) { // Wall run expires
          this.setState('FALL');
        }
        break;
        
      case 'WALL_JUMP':
        if (this.velocity.y < 0) {
          this.setState('FALL');
        }
        break;

      case 'LEDGE_GRAB':
        if (input.dx !== 0 || input.dz !== 0 || input.jump) {
          this.setState('CLIMB');
        }
        break;
        
      case 'CLIMB':
        if (this.timeInState > 0.6) {
          this.setState(input.sprint ? 'SPRINT' : 'RUN');
        }
        break;

      case 'LANDING':
        if (this.timeInState > 0.2) {
          this.setState(input.sprint ? 'SPRINT' : (input.dx !== 0 || input.dz !== 0 ? 'RUN' : 'IDLE'));
        }
        break;
        
      default:
        // Basic fallback
        this.setState('IDLE');
        break;
    }
  }

  // Setters for physics callbacks
  public setGrounded(grounded: boolean) {
    this.isGrounded = grounded;
    if (grounded && (this.currentState === 'FALL' || this.currentState === 'JUMP')) {
      this.setState('LANDING');
    }
  }

  public setVelocity(y: number) {
    this.velocity.y = y;
  }
}
