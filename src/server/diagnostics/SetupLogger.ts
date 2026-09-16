export type DiagnosticStageStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SKIPPED' | 'WARNING' | 'FAILED';

export interface DiagnosticEvent {
  id: string; // Unique ID for this specific event line
  initializationId: string;
  stageName: string; // Friendly name (e.g., '01. Validate Setup Input')
  stageCode: string; // Computer friendly name (e.g., 'validate_input')
  status: DiagnosticStageStatus;
  timestamp: number;
  durationMs?: number;
  message: string;
  metadata?: any;
  error?: string;
}

export class SetupLogger {
  private initializationId: string;
  private events: DiagnosticEvent[] = [];
  private startTime: number;

  constructor(initializationId: string) {
    this.initializationId = initializationId;
    this.startTime = Date.now();
  }

  private getElapsedTimeMs(): number {
    return Date.now() - this.startTime;
  }

  public log(params: {
    stageName: string;
    stageCode: string;
    status: DiagnosticStageStatus;
    message: string;
    metadata?: any;
    error?: string;
  }): DiagnosticEvent {
    const event: DiagnosticEvent = {
      id: Math.random().toString(36).substring(2, 9),
      initializationId: this.initializationId,
      stageName: params.stageName,
      stageCode: params.stageCode,
      status: params.status,
      timestamp: Date.now(),
      durationMs: this.getElapsedTimeMs(),
      message: params.message,
      metadata: params.metadata,
      error: params.error,
    };

    this.events.push(event);

    // Format for Node console
    const timeStr = new Date(event.timestamp).toISOString();
    let consoleMsg = `[setup] [${this.initializationId}] [${event.stageCode}] status=${event.status} msg="${event.message}"`;
    if (event.error) {
      consoleMsg += ` ERROR="${event.error}"`;
    }
    if (event.metadata) {
      consoleMsg += ` data=${JSON.stringify(event.metadata)}`;
    }
    console.log(consoleMsg);

    // Reset start time for the *next* operation so durationMs represents this step's time.
    this.startTime = Date.now();

    return event;
  }

  public getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }
}
