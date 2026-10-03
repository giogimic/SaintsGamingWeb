import { applyAnimationProfileFallback, isAnimationProfileCompatible } from './animationProfiles';
import { getCanonicalModelDef } from './worldModelPresentation';

/** Resolve the same actor/source/profile precedence in Studio and both runtimes. */
export function resolveActorAnimationPresentation(actor: Record<string, any> = {}, sourceAsset?: Record<string, any> | null): {
  animationProfileId?: string;
  animations?: Record<string, any>;
} {
  const source = sourceAsset?.presentation || sourceAsset?.metadata?.presentation || {};
  const sourceDefinition = source.assetDefinition || sourceAsset?.metadata?.assetDefinition || {};
  const actorDefinition = actor.assetDefinition || {};
  const sourceAnimations = source.animations || sourceDefinition.animations || sourceAsset?.metadata?.animations;
  const actorAnimations = actor.animations || actorDefinition.animations;
  const animations = {
    ...(sourceAnimations || {}),
    ...(actorAnimations || {}),
    mapped: { ...(sourceAnimations?.mapped || {}), ...(actorAnimations?.mapped || {}) },
  };
  const canonical = getCanonicalModelDef(actor.assetId)
    || getCanonicalModelDef(actor.modelUrl)
    || getCanonicalModelDef(sourceAsset?.source);
  let animationProfileId = actor.animationProfileId || actorDefinition.animationProfileId
    || source.animationProfileId || sourceDefinition.animationProfileId
    || sourceAsset?.metadata?.animationProfileId || canonical?.defaultAnimationProfileId;
  const rig = actor.rigAnalysis || actorDefinition.rigAnalysis || source.rigAnalysis
    || sourceDefinition.rigAnalysis || sourceAsset?.metadata?.rigAnalysis;
  const boneNames = animations.rigBoneNames || animations.boneNames || rig?.boneNames || [];
  if (!animationProfileId && isAnimationProfileCompatible('quaternius_native', rig?.family, boneNames)) {
    animationProfileId = 'quaternius_native';
  }
  if (!animationProfileId && canonical?.skeleton === 'manny') animationProfileId = 'GreystoneManny';
  return { animationProfileId, animations: applyAnimationProfileFallback(animations, animationProfileId) };
}
