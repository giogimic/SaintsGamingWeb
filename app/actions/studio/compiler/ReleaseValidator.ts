import type { CompilerContext } from './types';

/**
 * ReleaseValidator
 * 
 * Rules:
 * 1. Emits hard aborts if the release is structurally unsound.
 * 2. Checks for empty releases or fundamental corruption.
 */
export async function validateRelease(ctx: CompilerContext): Promise<void> {
  if (ctx.manifest.maps.length === 0) {
    ctx.errors.push("Release validation failed: Project has no maps.");
  }

  // Ensure JSON serialization succeeds (catches circular references in memory)
  try {
    JSON.stringify(ctx.manifest);
  } catch (e: any) {
    ctx.errors.push(`Release validation failed: Manifest cannot be serialized to JSON. ${e.message}`);
  }

  // Check for any accumulated errors from previous compiler phases
  if (ctx.errors.length > 0) {
    // Note: The Orchestrator throws the final error, we just ensure everything is recorded in the context.
  }
}
