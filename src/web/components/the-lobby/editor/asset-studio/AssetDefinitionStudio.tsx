'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { parseGLB, ParsedGLB, syncParsedMaterialsFromScene } from './glbParser';
import { AssetInspector3D, AssetInspector3DRef, LightingPreset, AttachedSceneItem } from './AssetInspector3D';
import {
  Loader2,
  CheckCircle2,
  Box,
  Users,
  Puzzle,
  Bone,
  Maximize2,
  AlertTriangle,
  Image as ImageIcon,
  Sun,
  Moon,
  Sparkles,
  Layers,
  Sliders,
  Eye,
  EyeOff,
  Sparkle,
  RefreshCw,
} from 'lucide-react';
import { useGameStore } from '../../store';
import { AssetManager } from '@/engine/assets/AssetManager';
import { RegistryCombobox } from '../components/RegistryCombobox';
import {
  CHARACTER_COMPONENT_CATEGORIES,
  CHARACTER_BASE_BODY_TYPES,
  CharacterComponentCategory,
  CharacterBaseBodyType,
} from '@/shared/game/assetImportProfiles';
import { ANIMATION_PROFILES, getAnimationProfile, type AnimationSlot } from '@/shared/game/animationProfiles';
import {
  ANIMATION_ACTIONS,
  animationSetChoiceId,
  buildAnimationClipCatalog,
  embeddedAnimationChoiceId,
  getAnimationChoicesForSlot,
} from '@/shared/game/animationCatalog';
import { GLTFExporter, GLTFLoader } from 'three-stdlib';
import {
  loadTextureFromFile,
  detectPbrChannel,
  convertObjToGlb,
  convertVoxToGlb,
  convertDaeToGlb,
  convertStlToGlb,
  convertPlyToGlb,
  PbrChannel,
  attachTextureFilesToMaterials,
} from '@/web/lib/modelPackage';
import { convertFbxToGlb } from '@/web/lib/fbxConverter';
import { RIG_FAMILIES, type CategorizedAnimationClip } from '@/shared/game/modelRigTaxonomy';
import { detectAssetTaxonomy, AssetTaxonomyResult, DetectedAssetCategory } from '@/web/lib/assetTaxonomy';

// ── Types ────────────────────────────────────────────────────────────
interface Props {
  file: File;
  previewUrl: string;
  onSuccess: (asset: any) => void;
  onCancel: () => void;
  companionAnimationFiles?: File[];
  companionTextureFiles?: File[];
  intentHint?: DetectedAssetCategory;
}

type TabId = 'roles' | 'transform' | 'skeleton' | 'attachments' | 'animations' | 'materials' | 'items';
type StructureType = 'Complete' | 'Modular' | 'ModularItem';

interface StructureOption {
  value: StructureType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ── Constants ────────────────────────────────────────────────────────
const SUPPORTED_ROLES = ['Character', 'NPC', 'Enemy', 'Creature', 'Player', 'Prop', 'Equipment', 'Weapon'] as const;

const STRUCTURE_OPTIONS: StructureOption[] = [
  {
    value: 'Complete',
    label: 'Complete Model',
    description: 'A single, self-contained 3D model. Use for props, full characters, or standalone objects.',
    icon: <Box className="w-5 h-5" />,
  },
  {
    value: 'Modular',
    label: 'Modular Base Character',
    description: 'A base body that other pieces (hair, armor, weapons) can be attached to dynamically.',
    icon: <Users className="w-5 h-5" />,
  },
  {
    value: 'ModularItem',
    label: 'Modular Piece',
    description: 'A single attachment piece (hair, armor, helmet) designed to fit onto a base character.',
    icon: <Puzzle className="w-5 h-5" />,
  },
];

const STANDARD_BONES = ['Root', 'Pelvis', 'Spine', 'Neck', 'Head', 'Clavicle_L', 'Arm_L', 'Hand_L', 'Clavicle_R', 'Arm_R', 'Hand_R', 'Leg_L', 'Foot_L', 'Leg_R', 'Foot_R'];

const COMPONENT_CATEGORY_ICONS: Record<string, string> = {
  face: '😐', hair: '💇', hat: '🎩', head_accessory: '👓',
  clothing: '👔', shirt: '👕', jacket: '🧥', pants: '👖',
  shoes: '👟', accessory: '💍', other: '📦',
};

function guessComponentInfo(filename: string): { structure: StructureType, category: string } {
  const lower = filename.toLowerCase();
  
  if (lower.includes('body') || lower.includes('base') || lower.includes('skeleton')) {
    return { structure: 'Modular', category: 'base' };
  }
  
  let category = 'other';
  if (lower.includes('hair') || lower.includes('beard') || lower.includes('moustache') || lower.includes('eyebrow')) category = 'hair';
  else if (lower.includes('clown_nose') || lower.includes('pacifier') || lower.includes('emotion') || lower.includes('face') || lower.includes('head')) category = 'face';
  else if (lower.includes('glass') || lower.includes('headphone') || lower.includes('mask')) category = 'head_accessory';
  else if (lower.includes('hat') || lower.includes('helmet')) category = 'hat';
  else if (lower.includes('costume') || lower.includes('outwear') || lower.includes('jacket') || lower.includes('shirt') || lower.includes('torso')) category = 'shirt';
  else if (lower.includes('pant') || lower.includes('short') || lower.includes('leg')) category = 'pants';
  else if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('slipper') || lower.includes('sock') || lower.includes('foot')) category = 'shoes';
  else if (lower.includes('glove') || lower.includes('hand')) category = 'accessory';
  
  return { structure: 'ModularItem', category };
}

// ── Component ────────────────────────────────────────────────────────
export function AssetDefinitionStudio({
  file,
  previewUrl,
  onSuccess,
  onCancel,
  companionAnimationFiles,
  companionTextureFiles,
  intentHint,
}: Props) {
  const showToast = useGameStore((s) => s.showToast);
  const [parsedGLB, setParsedGLB] = useState<ParsedGLB | null>(null);
  const [isParsing, setIsParsing] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('roles');
  
  const initialGuess = useMemo(() => guessComponentInfo(file.name), [file.name]);

  // Model viewport state
  const [activeAnimationIndex, setActiveAnimationIndex] = useState<number | undefined>(undefined);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showBounds, setShowBounds] = useState(true);
  
  const inspectorRef = useRef<AssetInspector3DRef>(null);

  // Form State
  const [assetName, setAssetName] = useState(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
  const [visibility, _setVisibility] = useState('COMMUNITY');
  const [tagsInput, setTagsInput] = useState('3d, model');
  
  // Roles
  const [roles, setRoles] = useState<string[]>(['Character']);
  const [structure, setStructure] = useState<StructureType>(initialGuess.structure);
  const [perspective, setPerspective] = useState<'Third Person' | 'First Person'>('Third Person');
  
  // Modular Settings
  const [modularSetName, setModularSetName] = useState('');
  const [skeletonConnectionPoints, _setSkeletonConnectionPoints] = useState('');
  
  // Skeleton
  const [boneMap, setBoneMap] = useState<Record<string, string>>({});
  
  // Attachments
  const [attachments, setAttachments] = useState<Array<{ id: string, name: string, bone: string, position: [number,number,number], rotation: [number,number,number], scale: [number,number,number] }>>([]);
  
  // Animations
  const [animMap, setAnimMap] = useState<Partial<Record<AnimationSlot, string>>>({});
  
  const [materialConfig, setMaterialConfig] = useState<Record<string, { tintable: boolean, slot: string }>>({});
  const [hasModifiedTextures, setHasModifiedTextures] = useState(false);

  // Modern Viewport & Taxonomy state
  const [taxonomyResult, setTaxonomyResult] = useState<AssetTaxonomyResult | null>(null);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showHumanReference, setShowHumanReference] = useState<boolean>(true);
  const [isDraggingOverViewport, setIsDraggingOverViewport] = useState<boolean>(false);
  const [publishingMode, setPublishingMode] = useState<'COMPOSITE_MODEL' | 'MODULAR_SET'>('COMPOSITE_MODEL');

  // Additional Items for Modular Set & Live Composition
  const [additionalItems, setAdditionalItems] = useState<Array<{
    id: string;
    file: File;
    name?: string;
    category: string;
    scene?: THREE.Group;
    enabled: boolean;
  }>>([]);

  const assignTextureToMaterialChannel = async (matName: string, channel: PbrChannel, textureFile: File) => {
    if (!parsedGLB) return;
    try {
      showToast?.(`Loading ${textureFile.name}...`);
      const texture = await loadTextureFromFile(textureFile);
      parsedGLB.scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            if (m.name === matName) {
              m[channel] = texture;
              m.needsUpdate = true;
            }
          });
        }
      });

      syncParsedMaterialsFromScene(parsedGLB.scene, parsedGLB.materials);
      setHasModifiedTextures(true);
      setMaterialConfig(prev => ({ ...prev }));
      showToast?.(`Connected ${channel} to material ${matName}`);
    } catch (err: any) {
      console.error(`Failed to load texture for ${matName} (${channel}):`, err);
      showToast?.(`Failed to load texture: ${err.message}`);
    }
  };

  const handleBatchAssignTextures = async (files: File[]) => {
    if (!parsedGLB || files.length === 0) return;
    try {
      showToast?.(`Attaching ${files.length} texture file(s)...`);
      let count = await attachTextureFilesToMaterials(parsedGLB.scene, files);
      for (const item of additionalItems) {
        if (item.scene) {
          count += await attachTextureFilesToMaterials(item.scene, files);
        }
      }
      if (count > 0) {
        syncParsedMaterialsFromScene(parsedGLB.scene, parsedGLB.materials);
        setHasModifiedTextures(true);
        setMaterialConfig(prev => ({ ...prev }));
        showToast?.(`Auto-attached ${count} textures to model materials!`);
      } else {
        showToast?.('No matching materials found for dropped textures.');
      }
    } catch (err: any) {
      console.warn('Batch texture load failed:', err);
      showToast?.(`Texture attachment failed: ${err.message}`);
    }
  };

  const handleAddCompanionAnimation = async (animFile: File) => {
    if (!parsedGLB) return;
    try {
      showToast?.(`Processing companion animation ${animFile.name}...`);
      let glbFile = animFile;
      if (animFile.name.toLowerCase().endsWith('.fbx')) {
        glbFile = await convertFbxToGlb(animFile);
      }
      const url = URL.createObjectURL(glbFile);
      const extraParsed = await parseGLB(url, {
        fileName: animFile.name,
        modelBoneNames: parsedGLB.bones.map((b) => b.name),
      });
      URL.revokeObjectURL(url);

      if (extraParsed.rawAnimations.length === 0) {
        showToast?.(`No animation tracks found in ${animFile.name}`);
        return;
      }

      parsedGLB.rawAnimations.push(...extraParsed.rawAnimations);
      parsedGLB.animations.push(...extraParsed.animations);
      parsedGLB.categorizedAnimations.push(...extraParsed.categorizedAnimations);

      // Auto-assign suggested slots
      const nextAnimMap = { ...animMap };
      extraParsed.categorizedAnimations.forEach((catAnim) => {
        const choiceId = embeddedAnimationChoiceId(catAnim.clipName);
        catAnim.suggestedSlots.forEach((slot) => {
          if (!nextAnimMap[slot]) nextAnimMap[slot] = choiceId;
        });
      });
      setAnimMap(nextAnimMap);
      setParsedGLB({ ...parsedGLB });
      setHasModifiedTextures(true); // Flag to ensure GLTFExporter bakes in the new clips!
      showToast?.(`Added ${extraParsed.rawAnimations.length} clips from ${animFile.name}!`);
    } catch (err: any) {
      showToast?.(`Failed to add animation: ${err.message}`);
    }
  };

  const handleAutoMapAllAnimations = () => {
    if (!parsedGLB?.categorizedAnimations || parsedGLB.categorizedAnimations.length === 0) return;
    const nextAnimMap = { ...animMap };
    let mappedCount = 0;
    parsedGLB.categorizedAnimations.forEach((catAnim) => {
      const choiceId = embeddedAnimationChoiceId(catAnim.clipName);
      catAnim.suggestedSlots.forEach((slot) => {
        if (!nextAnimMap[slot]) {
          nextAnimMap[slot] = choiceId;
          mappedCount++;
        }
      });
    });
    setAnimMap(nextAnimMap);
    showToast?.(`Auto-mapped ${mappedCount} animation action slots!`);
  };

  // Mesh -> Component mapping
  const [modularComponents, _setModularComponents] = useState<Record<string, string>>({});

  // Modular Item state
  const [componentCategory, setComponentCategory] = useState<string>(initialGuess.category);
  const [baseBodyType, setBaseBodyType] = useState<string>('unspecified');

  const [animationProfileId, setAnimationProfileId] = useState<string>('');

  // Model Transform
  const [modelScale, setModelScale] = useState<number>(0.8);
  const [modelRotationY, setModelRotationY] = useState<number>(0);
  const [modelGrounding, setModelGrounding] = useState<number>(0);
  const [modelCameraYOffset, setModelCameraYOffset] = useState<number>(0);

  const [isPublishing, setIsPublishing] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────
  const componentCategoryEntries = useMemo(() => 
    Object.entries(CHARACTER_COMPONENT_CATEGORIES) as [CharacterComponentCategory, { label: string; layer: string }][],
    []
  );
  const bodyTypeEntries = useMemo(() => 
    Object.entries(CHARACTER_BASE_BODY_TYPES) as [CharacterBaseBodyType, { label: string }][],
    []
  );

  // Tab completeness for visual indicators
  const tabStatus = useMemo(() => {
    const status: Record<TabId, 'empty' | 'partial' | 'complete'> = {
      roles: roles.length > 0 ? 'complete' : 'empty',
      transform: 'complete',
      skeleton: Object.values(boneMap).filter(Boolean).length > 0 
        ? (boneMap['Pelvis'] || boneMap['Root'] ? 'complete' : 'partial') 
        : 'empty',
      attachments: attachments.length > 0 ? 'complete' : 'empty',
      animations: Object.values(animMap).filter(Boolean).length > 0
        ? (animMap['idle'] || animationProfileId ? 'complete' : 'partial')
        : (animationProfileId ? 'complete' : 'empty'),
      materials: Object.values(materialConfig).some(m => m.tintable) ? 'complete' : 'empty',
      items: additionalItems.length > 0 ? 'complete' : 'empty',
    };
    return status;
  }, [roles, boneMap, attachments, animMap, materialConfig, additionalItems, animationProfileId]);

  // One browser catalog combines embedded model clips with clips referenced by every set.
  const animationChoices = useMemo(
    () => buildAnimationClipCatalog(parsedGLB?.animations || []),
    [parsedGLB],
  );
  const animationChoiceById = useMemo(
    () => new Map(animationChoices.map((choice) => [choice.id, choice])),
    [animationChoices],
  );
  const hasEmbeddedAnimations = (parsedGLB?.animations.length || 0) > 0;

  // Handle automatic prepopulation of animation map based on selected profile
  useEffect(() => {
    if (animationProfileId) {
      const profile = getAnimationProfile(animationProfileId);
      if (profile) {
        const newMap = { ...animMap };
        let changed = false;

        for (const slot of Object.keys(profile.slotMap) as AnimationSlot[]) {
          const mapping = profile.slotMap[slot];
          if (!mapping) continue;
          const choiceId = animationSetChoiceId(profile.id, mapping.clip);
          if (animationChoiceById.has(choiceId) && !newMap[slot]) {
            newMap[slot] = choiceId;
            changed = true;
          }
        }
        if (changed) {
          setAnimMap(newMap);
        }
      }
    }
  }, [animationProfileId, animationChoiceById, animMap]);

  // ── GLB Parsing ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setIsParsing(true);
        const parsed = await parseGLB(previewUrl, { fileName: file.name, isSingleClipOnActor: true });

        // Auto-assign companion textures if provided
        if (companionTextureFiles && companionTextureFiles.length > 0) {
          const count = await attachTextureFilesToMaterials(parsed.scene, companionTextureFiles);
          if (count > 0) {
            syncParsedMaterialsFromScene(parsed.scene, parsed.materials);
            setHasModifiedTextures(true);
            showToast?.(`Auto-attached ${count} companion textures to model!`);
          }
        }

        // Process companion animation files if provided
        if (companionAnimationFiles && companionAnimationFiles.length > 0) {
          let addedClips = 0;
          for (const animFile of companionAnimationFiles) {
            try {
              let glbAnimFile = animFile;
              if (animFile.name.toLowerCase().endsWith('.fbx')) {
                glbAnimFile = await convertFbxToGlb(animFile);
              }
              const animUrl = URL.createObjectURL(glbAnimFile);
              const extraParsed = await parseGLB(animUrl, {
                fileName: animFile.name,
                modelBoneNames: parsed.bones.map((b) => b.name),
              });
              URL.revokeObjectURL(animUrl);

              if (extraParsed.rawAnimations.length > 0) {
                parsed.rawAnimations.push(...extraParsed.rawAnimations);
                parsed.animations.push(...extraParsed.animations);
                parsed.categorizedAnimations.push(...extraParsed.categorizedAnimations);
                addedClips += extraParsed.rawAnimations.length;
              }
            } catch (animErr) {
              console.warn("Failed to load companion animation:", animFile.name, animErr);
            }
          }
          if (addedClips > 0) {
            setHasModifiedTextures(true); // Flag to ensure GLTFExporter bakes companion animation clips!
            showToast?.(`Loaded ${addedClips} companion animation clips!`);
          }
        }

        setParsedGLB(parsed);

        // Auto-detect asset taxonomy (character, modular base, modular piece, weapon, prop, creature)
        const taxonomy = detectAssetTaxonomy(
          file.name,
          parsed.dimensions,
          parsed.rigAnalysis,
          parsed.meshes.length,
          intentHint
        );
        setTaxonomyResult(taxonomy);
        setStructure(taxonomy.structure);
        setRoles(taxonomy.suggestedRoles);
        if (taxonomy.modularSlot) {
          setComponentCategory(taxonomy.modularSlot);
        }
        if (taxonomy.scaleSuggestion.recommendedScale !== 1.0) {
          setModelScale(taxonomy.scaleSuggestion.recommendedScale);
        }
        
        // Auto-detect bones using comprehensive rigAnalysis
        const autoMap: Record<string, string> = {};
        if (parsed.rigAnalysis && parsed.rigAnalysis.detectedStandardBones) {
          Object.entries(parsed.rigAnalysis.detectedStandardBones).forEach(([standardBone, actualBone]) => {
            autoMap[standardBone] = actualBone;
          });
        }
        setBoneMap(autoMap);
        
        // Auto-detect animations using categorizedAnimations
        const autoAnimMap: Partial<Record<AnimationSlot, string>> = {};
        parsed.categorizedAnimations.forEach((catAnim) => {
          const choiceId = embeddedAnimationChoiceId(catAnim.clipName);
          catAnim.suggestedSlots.forEach((slot) => {
            if (!autoAnimMap[slot]) autoAnimMap[slot] = choiceId;
          });
        });

        // Fallback: If no slots were mapped and there is at least one clip, map the first to idle
        if (Object.keys(autoAnimMap).length === 0 && parsed.animations.length > 0) {
          autoAnimMap['idle'] = embeddedAnimationChoiceId(parsed.animations[0].name);
        }

        setAnimMap(autoAnimMap);
        
        // Auto-materials
        const mats: Record<string, { tintable: boolean, slot: string }> = {};
        Object.values(parsed.materials).forEach(m => {
          mats[m.name] = { tintable: false, slot: 'Base' };
        });
        setMaterialConfig(mats);
        
      } catch (err: any) {
        setParseError(err.message);
      } finally {
        setIsParsing(false);
      }
    }
    load();
  }, [previewUrl, file.name, companionTextureFiles, companionAnimationFiles]);

  const untexturedCount = useMemo(() => {
    if (!parsedGLB) return 0;
    return Object.values(parsedGLB.materials).filter((m) => !m.hasTexture).length;
  }, [parsedGLB, materialConfig, hasModifiedTextures]);

  const attachedModularScenes: AttachedSceneItem[] = useMemo(() => {
    return additionalItems
      .filter((item) => item.enabled && item.scene)
      .map((item) => ({
        id: item.id,
        scene: item.scene!,
      }));
  }, [additionalItems]);

  // ── Handlers ───────────────────────────────────────────────────────
  const toggleRole = (role: string) => {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handlePublish = async () => {
    // Validation Engine
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!roles.length) {
      warnings.push("No roles assigned. This asset might not show up in typical Studio filters.");
    }

    const isActor = roles.includes('Character') || roles.includes('NPC') || roles.includes('Enemy') || roles.includes('Player');
    if (isActor) {
      if (!animMap.idle && !animationProfileId) errors.push("Actor roles require an 'Idle' animation to be mapped, or a default Animation Set selected.");
      if (!boneMap['Root'] && !boneMap['Pelvis']) warnings.push("Actor roles typically need a Root or Pelvis bone mapped for movement.");
    }
    
    if (roles.includes('Weapon')) {
      if (!boneMap['Root']) warnings.push("Weapons typically require a Root bone to attach to hands properly.");
    }

    if (errors.length > 0) {
      showToast?.(`Validation Failed:\n${errors.join('\n')}`);
      return;
    }
    if (warnings.length > 0) {
      showToast?.(`Warnings (Proceeding):\n${warnings.join('\n')}`);
    }

    setIsPublishing(true);
    try {
      const thumbnailDataUrl = inspectorRef.current?.takeSnapshot();

      let uploadFile = file;
      let finalStructure = structure;
      let finalRoles = [...roles];

      // If user authored a modular character and chose "Publish as Pre-Assembled Composite Character":
      if (
        structure === 'Modular' &&
        publishingMode === 'COMPOSITE_MODEL' &&
        additionalItems.some((i) => i.enabled && i.scene)
      ) {
        showToast?.('Merging base body and modular pieces into single composite character GLB...');
        const compositeGroup = new THREE.Group();
        compositeGroup.name = `${assetName}_Composite`;
        compositeGroup.add(parsedGLB!.scene.clone(true));

        for (const item of additionalItems) {
          if (item.enabled && item.scene) {
            compositeGroup.add(item.scene.clone(true));
          }
        }

        const exporter = new GLTFExporter();
        const gltfBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(
            compositeGroup,
            (res) => {
              if (res instanceof ArrayBuffer) resolve(res);
              else reject(new Error('GLTFExporter did not return an ArrayBuffer'));
            },
            (err) => reject(err),
            {
              binary: true,
              embedImages: true,
              animations: parsedGLB!.rawAnimations || [],
            }
          );
        });

        uploadFile = new File(
          [new Blob([gltfBuffer], { type: 'model/gltf-binary' })],
          `${file.name.replace(/\.[^/.]+$/, '')}_Composite.glb`,
          { type: 'model/gltf-binary' }
        );
        finalStructure = 'Complete';
        if (!finalRoles.includes('Character')) finalRoles.push('Character');
      } else if (hasModifiedTextures && parsedGLB) {
        showToast?.('Baking connected textures into GLB binary...');
        const exporter = new GLTFExporter();
        const gltfBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(
            parsedGLB.scene,
            (res) => {
              if (res instanceof ArrayBuffer) resolve(res);
              else reject(new Error('GLTFExporter did not return an ArrayBuffer'));
            },
            (err) => reject(err),
            {
              binary: true,
              embedImages: true,
              animations: parsedGLB.rawAnimations || [],
            }
          );
        });
        uploadFile = new File(
          [new Blob([gltfBuffer], { type: 'model/gltf-binary' })],
          file.name.replace(/\.[^/.]+$/, '.glb'),
          { type: 'model/gltf-binary' }
        );
      }
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', assetName);
      formData.append('type', 'MODEL');
      formData.append('createUsable', 'true');
      formData.append('visibility', visibility);
      formData.append('characterPresentationType', '3D_MODEL');
      
      // Thumbnail
      if (thumbnailDataUrl) {
        const res = await fetch(thumbnailDataUrl);
        const blob = await res.blob();
        formData.append('thumbnail', blob, 'thumbnail.jpg');
      }

      const tagList = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      tagList.push(...finalRoles.map(r => r.toLowerCase()));
      if (finalStructure === 'Modular') tagList.push('modular');
      formData.append('tags', JSON.stringify(tagList));

      if (finalStructure === 'Modular') {
        formData.append('isCharacterCustomizable', 'true');
      }
      
      if (finalStructure === 'ModularItem') {
        formData.append('isModularComponent', 'true');
        formData.append('componentCategory', componentCategory);
        if (baseBodyType.trim()) {
          formData.append('baseBodyType', baseBodyType.trim());
        }
      }
      
      const attachmentNames = attachments.map(a => a.name).filter(Boolean).join(',');
      if (attachmentNames) {
        formData.append('attachmentPoints', attachmentNames);
      }

      const mappedAnimationChoices = Object.fromEntries(
        Object.entries(animMap).flatMap(([slot, choiceId]) => {
          const choice = animationChoiceById.get(choiceId);
          if (!choice) return [];
          return [[slot, {
            clip: choice.clip,
            sourceKind: choice.sourceKind,
            sourceId: choice.sourceId,
            sourceLabel: choice.sourceLabel,
            sourcePath: choice.sourcePath,
            rigFamily: choice.rigFamily,
            loop: choice.loop,
            speed: choice.speed,
          }]];
        }),
      );

      const assetDefinition = {
        roles: finalRoles,
        structure: finalStructure,
        perspective,
        animationProfileId,
        modularSetName: finalStructure === 'Modular' ? modularSetName : undefined,
        skeletonConnectionPoints: finalStructure === 'Modular' ? skeletonConnectionPoints : undefined,
        transform: {
          scale: modelScale,
          rotationY: modelRotationY,
          grounding: modelGrounding,
          cameraYOffset: modelCameraYOffset
        },
        skeleton: {
          isSkinned: parsedGLB?.isSkinned,
          boneMap,
          rigFamily: parsedGLB?.rigAnalysis?.family,
          detectedBones: parsedGLB?.rigAnalysis?.detectedStandardBones,
          missingBones: parsedGLB?.rigAnalysis?.missingEssentialBones,
        },
        rigAnalysis: parsedGLB?.rigAnalysis,
        categorizedAnimations: parsedGLB?.categorizedAnimations,
        skeletonRequirements: {
          family: parsedGLB?.rigAnalysis?.family,
          label: parsedGLB?.rigAnalysis?.label,
          essentialBones: parsedGLB?.rigAnalysis?.family
            ? RIG_FAMILIES[parsedGLB.rigAnalysis.family]?.essentialBones || []
            : [],
          recommendedBones: parsedGLB?.rigAnalysis?.family
            ? RIG_FAMILIES[parsedGLB.rigAnalysis.family]?.recommendedBones || []
            : [],
          missingEssentialBones: parsedGLB?.rigAnalysis?.missingEssentialBones || [],
          detectedBones: parsedGLB?.rigAnalysis?.detectedStandardBones || {},
          totalBones: parsedGLB?.rigAnalysis?.totalBones || 0,
          isHumanoid: parsedGLB?.rigAnalysis?.isHumanoid,
          isQuadruped: parsedGLB?.rigAnalysis?.isQuadruped,
          isFlyer: parsedGLB?.rigAnalysis?.isFlyer,
        },
        attachments,
        animations: {
          available: parsedGLB?.animations.map(a => a.name) || [],
          mapped: mappedAnimationChoices,
          categorized: parsedGLB?.categorizedAnimations || [],
        },
        materials: materialConfig,
        meshes: parsedGLB?.meshes.map(m => m.name) || [],
        modularComponents: finalStructure === 'Modular' ? modularComponents : undefined,
      };
      
      formData.append('assetDefinition', JSON.stringify(assetDefinition));

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload asset');
      }

      // Upload additional items (only when publishing as dynamic Modular Set)
      if (finalStructure === 'Modular' && publishingMode === 'MODULAR_SET' && additionalItems.length > 0) {
        for (const item of additionalItems) {
          const itemFormData = new FormData();
          itemFormData.append('file', item.file);
          itemFormData.append('name', `${modularSetName || assetName} - ${item.file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')}`);
          itemFormData.append('type', 'MODEL');
          itemFormData.append('createUsable', 'true');
          itemFormData.append('visibility', visibility);
          itemFormData.append('characterPresentationType', '3D_MODEL');
          itemFormData.append('isModularComponent', 'true');
          itemFormData.append('componentCategory', item.category);
          itemFormData.append('baseBodyType', assetName);
          itemFormData.append('tags', JSON.stringify(['3d', 'model', 'modular', item.category]));
          
          await fetch('/api/assets/upload', { method: 'POST', body: itemFormData });
        }
      }

      showToast?.(`3D Asset Published: ${assetName}`);
      AssetManager.getInstance().broadcastRefresh();
      onSuccess(data.gameAsset || data.usableAsset || data.asset || data);
    } catch (err: any) {
      console.error(err);
      showToast?.(`Error: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Loading / Error States ─────────────────────────────────────────
  if (isParsing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <div className="text-amber-200 font-bold">Importing & Parsing 3D Model...</div>
        <div className="text-[10px] text-slate-400">Extracting meshes, bones, materials, and animations</div>
      </div>
    );
  }

  if (parseError || !parsedGLB) {
    return (
      <div className="text-red-400 p-4 bg-red-950/40 border border-red-900 rounded">
        Failed to parse GLB: {parseError}
        <button onClick={onCancel} className="mt-4 px-3 py-1 bg-slate-800 rounded">Cancel</button>
      </div>
    );
  }

  const mappedBoneCount = Object.values(boneMap).filter(Boolean).length;
  const mappedAnimCount = Object.values(animMap).filter(Boolean).length;

  // ── Tab Dot Indicator ──────────────────────────────────────────────
  function TabDot({ status }: { status: 'empty' | 'partial' | 'complete' }) {
    if (status === 'complete') return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block ml-1.5" />;
    if (status === 'partial') return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block ml-1.5" />;
    return null;
  }

  // ── Render ─────────────────────────────────────────────────────────
  const availableTabs: TabId[] = ['roles', 'transform', 'skeleton', 'attachments', 'animations', 'materials', ...(structure === 'Modular' ? ['items' as TabId] : [])];

  return (
    <div className="flex flex-col space-y-4 text-xs font-mono text-slate-300">
      
      {/* Header */}
      <div className="bg-[#0b1320]/80 border border-[#cbb26a]/30 rounded p-3 flex justify-between items-center">
        <div>
          <div className="text-[#e2d5b3] font-bold text-sm">3D Asset Definition Studio</div>
          <div className="text-[10px] text-slate-400">Configure and validate {file.name}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-white font-bold transition-all">Cancel</button>
          <button onClick={handlePublish} disabled={isPublishing} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-white font-bold transition-all flex items-center gap-2">
            {isPublishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Publish Asset
          </button>
        </div>
      </div>

      {/* Auto-Detection Vetting Bar */}
      {taxonomyResult && (
        <div className="bg-[#0b1320] border border-amber-600/40 rounded p-2.5 flex items-center justify-between flex-wrap gap-2 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600/20 text-amber-300 border border-amber-500/40">
              ⚡ Auto-Detected: {taxonomyResult.label}
            </span>
            <span className="text-[10px] text-slate-300">
              {taxonomyResult.reason}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              Confidence: <strong className={taxonomyResult.confidence === 'high' ? 'text-emerald-400' : 'text-amber-400'}>{taxonomyResult.confidence.toUpperCase()}</strong>
            </span>
            {parsedGLB?.dimensions && (
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                Height: {parsedGLB.dimensions.height > 50 ? `${(parsedGLB.dimensions.height * 0.01).toFixed(2)}m (${parsedGLB.dimensions.height}cm)` : `${parsedGLB.dimensions.height}m`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 h-[720px] min-h-[640px]">
        {/* Left Side: 3D Preview (Interactive Dropzone) */}
        <div
          className={`col-span-5 flex flex-col space-y-2 relative rounded overflow-hidden transition-all ${
            isDraggingOverViewport ? 'ring-2 ring-amber-500 bg-amber-950/20' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOverViewport(true);
          }}
          onDragLeave={() => setIsDraggingOverViewport(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDraggingOverViewport(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length > 0) {
              const imgFiles = files.filter(f => /\.(png|jpe?g|webp|tga|dds|bmp)$/i.test(f.name));
              if (imgFiles.length > 0) {
                await handleBatchAssignTextures(imgFiles);
              } else {
                showToast?.('Please drop image/texture files (.png, .tga, .jpg, .dds)');
              }
            }
          }}
        >
          {/* Viewport Canvas with missing-textures overlay */}
          <div className="flex-1 rounded overflow-hidden relative">
            {untexturedCount > 0 && (
              <div className="absolute top-2 left-2 right-2 bg-amber-950/90 backdrop-blur-md border border-amber-600/60 rounded p-2 text-amber-200 text-[10px] flex items-center justify-between z-10 shadow-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    <strong>{untexturedCount} material{untexturedCount > 1 ? 's' : ''} untextured</strong> (white model). Drop textures here.
                  </span>
                </div>
                <label className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded cursor-pointer transition-colors text-[9px] shrink-0 ml-2">
                  Browse Textures
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                    className="hidden"
                    onChange={(e) => {
                      const f = Array.from(e.target.files || []);
                      if (f.length > 0) handleBatchAssignTextures(f);
                    }}
                  />
                </label>
              </div>
            )}

            <AssetInspector3D
              ref={inspectorRef}
              parsedGLB={parsedGLB}
              activeAnimationIndex={activeAnimationIndex}
              showSkeleton={showSkeleton}
              showBounds={showBounds}
              showHumanReference={showHumanReference}
              wireframe={wireframe}
              lightingPreset={lightingPreset}
              modelScale={modelScale}
              modelRotationY={modelRotationY}
              modelGrounding={modelGrounding}
              modelCameraYOffset={modelCameraYOffset}
              attachedScenes={attachedModularScenes}
            />
          </div>

          {/* View Controls Toolbar */}
          <div className="flex items-center justify-between gap-1.5 bg-[#050b14] p-1.5 border border-slate-800 rounded flex-wrap">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowHumanReference(!showHumanReference)}
                title="Toggle 1.75m Standard Humanoid Height Silhouette"
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  showHumanReference ? 'bg-amber-600/30 text-amber-300 border border-amber-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                }`}
              >
                🧍 1.75m Ref
              </button>
              <button
                type="button"
                onClick={() => setShowSkeleton(!showSkeleton)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  showSkeleton ? 'bg-amber-600/30 text-amber-300 border border-amber-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                }`}
              >
                <Bone className="w-3 h-3 inline mr-1" /> Bones
              </button>
              <button
                type="button"
                onClick={() => setShowBounds(!showBounds)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  showBounds ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3 h-3 inline mr-1" /> Bounds
              </button>
              <button
                type="button"
                onClick={() => setWireframe(!wireframe)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  wireframe ? 'bg-purple-600/30 text-purple-300 border border-purple-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                }`}
              >
                Wireframe
              </button>
            </div>

            {/* Lighting mode pills */}
            <div className="flex items-center gap-1">
              {(['studio', 'sunset', 'dramatic', 'night'] as LightingPreset[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLightingPreset(mode)}
                  title={`Lighting: ${mode}`}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                    lightingPreset === mode ? 'bg-amber-500 text-black' : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'studio' ? '☀️ Studio' : mode === 'sunset' ? '🌅 Sun' : mode === 'dramatic' ? '✨ Rim' : '🌙 Night'}
                </button>
              ))}
            </div>
          </div>

          {/* Animation selector */}
          <div className="flex items-center gap-2 bg-[#050b14] px-2 py-1.5 border border-slate-800 rounded">
            <span className="text-[10px] text-slate-400 shrink-0">Preview Clip:</span>
            <select
              value={activeAnimationIndex ?? ''}
              onChange={e => setActiveAnimationIndex(e.target.value === '' ? undefined : Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-white cursor-pointer hover:border-slate-500 transition-colors"
            >
              <option value="">(No Animation / Default Pose)</option>
              {parsedGLB.animations.map((a, i) => (
                <option key={i} value={i}>{a.name} ({a.duration.toFixed(2)}s)</option>
              ))}
            </select>
          </div>
          
          {/* Detected Specs & Height */}
          <div className="bg-[#050b14] p-2.5 border border-slate-800 rounded space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-amber-400 font-bold text-[11px] flex items-center gap-1.5">
                <span>Model Specifications</span>
                {taxonomyResult && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/60 border border-amber-700/50 text-amber-300 font-normal">
                    {taxonomyResult.label}
                  </span>
                )}
              </div>
              {parsedGLB.dimensions && (
                <div className="text-[10px] text-cyan-400 font-mono font-bold">
                  Height: {parsedGLB.dimensions.height > 50 ? `${(parsedGLB.dimensions.height * 0.01).toFixed(2)}m (${parsedGLB.dimensions.height}cm)` : `${parsedGLB.dimensions.height}m`}
                </div>
              )}
            </div>
            <div className="text-[10px] grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div className="flex justify-between"><span className="text-slate-500">Meshes</span><span className="text-white">{parsedGLB.meshes.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Bones</span><span className="text-white">{parsedGLB.bones.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Animations</span><span className="text-white">{parsedGLB.animations.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Materials</span><span className="text-white">{Object.keys(parsedGLB.materials).length}</span></div>
              <div className="col-span-2 flex justify-between">
                <span className="text-slate-500">Rig Classification</span>
                <span className="text-emerald-400 font-mono">{parsedGLB.rigAnalysis?.label || (parsedGLB.isSkinned ? 'Skinned Rig' : 'Static Mesh')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Config Steps */}
        <div className="col-span-7 bg-[#050b14] border border-slate-800 rounded flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-[#0b1320]">
            {availableTabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center ${activeTab === tab ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-950/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab}
                <TabDot status={tabStatus[tab]} />
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* ═══════════════ ROLES TAB ═══════════════ */}
            {activeTab === 'roles' && (
              <div className="space-y-5">
                {/* Asset Name */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Asset Name</label>
                  <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white focus:border-amber-600/60 focus:outline-none transition-colors" />
                </div>

                {/* Supported Roles — Visual chips */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Supported Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_ROLES.map(r => {
                      const active = roles.includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() => toggleRole(r)}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${
                            active 
                              ? 'bg-amber-600/20 border-amber-500/60 text-amber-200 shadow-[0_0_6px_rgba(202,162,66,0.15)]' 
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {active && <span className="mr-1">✓</span>}
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Structure — Visual card selector */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Structure</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STRUCTURE_OPTIONS.map(opt => {
                      const active = structure === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setStructure(opt.value)}
                          className={`p-3 rounded-lg text-left transition-all border flex flex-col gap-1.5 ${
                            active 
                              ? 'bg-amber-600/15 border-amber-500/60 shadow-[0_0_12px_rgba(202,162,66,0.1)]' 
                              : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className={`flex items-center gap-1.5 font-bold text-[11px] ${active ? 'text-amber-300' : 'text-slate-300'}`}>
                            {opt.icon} {opt.label}
                          </div>
                          <div className="text-[9px] text-slate-500 leading-tight">{opt.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Perspective */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Perspective</label>
                  <div className="flex gap-2">
                    {(['Third Person', 'First Person'] as const).map(p => {
                      const active = perspective === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setPerspective(p)}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${
                            active 
                              ? 'bg-slate-700/60 border-slate-500 text-white' 
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Modular Base Character Settings ── */}
                {structure === 'Modular' && (
                  <div className="bg-amber-950/15 border border-amber-900/30 rounded-lg p-4 space-y-3">
                    <div className="text-amber-400 font-bold text-[11px] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Modular Base Settings
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-200/70 mb-1">Set Name</label>
                      <input 
                        type="text" 
                        value={modularSetName} 
                        onChange={e => setModularSetName(e.target.value)} 
                        placeholder="e.g. KnightArmorSet" 
                        className="w-full bg-black/50 border border-amber-900/40 rounded px-2 py-1.5 text-white placeholder:text-slate-600 focus:border-amber-600/60 focus:outline-none" 
                      />
                    </div>
                    <div className="text-[9px] text-amber-200/50 leading-tight flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      Add attachment pieces (hair, armor, weapons) in the &quot;Items&quot; tab at the top.
                    </div>
                  </div>
                )}
                
                {/* ── Modular Item / Component Settings ── */}
                {structure === 'ModularItem' && (
                  <div className="bg-amber-950/15 border border-amber-900/30 rounded-lg p-4 space-y-4">
                    <div className="text-amber-400 font-bold text-[11px] flex items-center gap-1.5">
                      <Puzzle className="w-3.5 h-3.5" /> Modular Piece Settings
                    </div>

                    {/* Component Category — Visual chip grid */}
                    <div>
                      <label className="block text-[10px] text-amber-200/70 mb-2">What kind of piece is this?</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {componentCategoryEntries.map(([key, meta]) => {
                          const active = componentCategory === key;
                          const emoji = COMPONENT_CATEGORY_ICONS[key] || '📦';
                          return (
                            <button
                              key={key}
                              onClick={() => setComponentCategory(key)}
                              className={`px-2 py-2 rounded text-[10px] font-bold transition-all border text-center ${
                                active 
                                  ? 'bg-amber-600/25 border-amber-500/60 text-amber-200' 
                                  : 'bg-black/30 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <div className="text-base mb-0.5">{emoji}</div>
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Base Body Type — Dropdown */}
                    <div>
                      <label className="block text-[10px] text-amber-200/70 mb-1">Target Body Type</label>
                      <select 
                        value={baseBodyType} 
                        onChange={e => setBaseBodyType(e.target.value)}
                        className="w-full bg-black/50 border border-amber-900/40 rounded px-2 py-1.5 text-white cursor-pointer focus:border-amber-600/60 focus:outline-none"
                      >
                        {bodyTypeEntries.map(([key, meta]) => (
                          <option key={key} value={key}>{meta.label}</option>
                        ))}
                      </select>
                      <div className="text-[9px] text-slate-500 mt-1">Which body type was this piece modeled to fit?</div>
                    </div>

                    <div className="text-[9px] text-amber-200/50 leading-tight bg-black/20 p-2 rounded">
                      This uploads a single GLB (e.g. a piece of hair or armor) to be worn by a base character.
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Tags</label>
                  <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white focus:border-amber-600/60 focus:outline-none transition-colors" />
                </div>
                
                {/* Default animation set */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Default Animation Set (Optional)</label>
                  <select 
                    value={animationProfileId} 
                    onChange={e => {
                      const nextProfileId = e.target.value;
                      const nextProfile = getAnimationProfile(nextProfileId);
                      setAnimationProfileId(nextProfileId);
                      if (!nextProfile) return;

                      setAnimMap((previous) => {
                        const next = { ...previous };
                        for (const slot of Object.keys(nextProfile.slotMap) as AnimationSlot[]) {
                          const mapping = nextProfile.slotMap[slot];
                          if (!mapping) continue;
                          const currentChoice = animationChoiceById.get(next[slot] || '');
                          if (!next[slot] || currentChoice?.sourceId === animationProfileId) {
                            next[slot] = animationSetChoiceId(nextProfile.id, mapping.clip);
                          }
                        }
                        return next;
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white cursor-pointer focus:border-amber-600/60 focus:outline-none transition-colors"
                  >
                    <option value="">Browse all sets / assign manually</option>
                    {ANIMATION_PROFILES.map(profile => (
                      <option key={profile.id} value={profile.id}>{profile.displayName} · Manny rig</option>
                    ))}
                  </select>
                  <div className="text-[9px] text-slate-500 mt-1">
                    Choosing a set adds its suggested clips. Each action menu can still use clips from any registered set.
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ TRANSFORM TAB ═══════════════ */}
            {activeTab === 'transform' && (
              <div className="space-y-6">
                {/* Scale Normalization Card */}
                <div className="bg-[#0b1320] border border-amber-600/30 rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold text-[11px] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Scale Normalization (Debian & Live MMO Standard)
                    </span>
                    {parsedGLB.dimensions && (
                      <span className="text-[10px] text-cyan-400 font-mono">
                        Native Size: {parsedGLB.dimensions.width}m × {parsedGLB.dimensions.height}m × {parsedGLB.dimensions.depth}m
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    Saints Gaming standard player height is <strong>1.75 meters</strong>. If your asset was exported in centimeters (e.g. Unreal Engine), click below to normalize immediately.
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (parsedGLB.dimensions?.height) {
                          const effectiveH = parsedGLB.dimensions.height > 50 ? parsedGLB.dimensions.height * 0.01 : parsedGLB.dimensions.height;
                          const target = Number((1.75 / effectiveH).toFixed(3));
                          setModelScale(target);
                          showToast?.(`Normalized scale to ${target}x (1.75m standard human)`);
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/50 text-amber-300 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      🎯 Normalize to 1.75m Human Height
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModelScale(0.01);
                        showToast?.('Set scale to 0.01x (Unreal cm -> m)');
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-bold transition-colors"
                    >
                      0.01x (Unreal cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModelScale(1.0);
                        showToast?.('Reset scale to 1.0x');
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-bold transition-colors"
                    >
                      1.0x (Original)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Scale ({modelScale.toFixed(2)}x)</label>
                    <input 
                      type="number" 
                      min="0.01" 
                      max="10.0" 
                      step="0.01" 
                      value={modelScale} 
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) setModelScale(val);
                      }} 
                      className="w-16 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-right text-[11px] text-amber-300 font-mono focus:border-amber-500 focus:outline-none" 
                    />
                  </div>
                  <input 
                    type="range" min="0.05" max="3.0" step="0.01" 
                    value={modelScale} 
                    onChange={e => setModelScale(parseFloat(e.target.value))} 
                    className="w-full accent-amber-500" 
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>Tiny (0.05x)</span>
                    <span>Standard (0.8x)</span>
                    <span>Original (1.0x)</span>
                    <span>Large (3.0x)</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Default Orientation (Y Rotation: {modelRotationY}°)</label>
                    <input 
                      type="number" 
                      min="-360" 
                      max="360" 
                      step="1" 
                      value={modelRotationY} 
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setModelRotationY(val);
                      }} 
                      className="w-16 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-right text-[11px] text-amber-300 font-mono focus:border-amber-500 focus:outline-none" 
                    />
                  </div>
                  <input 
                    type="range" min="-180" max="180" step="5" 
                    value={modelRotationY} 
                    onChange={e => setModelRotationY(parseFloat(e.target.value))} 
                    className="w-full accent-amber-500" 
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>-180°</span>
                    <span>0°</span>
                    <span>+180°</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Grounding Offset Z/Y ({modelGrounding.toFixed(2)}m)</label>
                    <input 
                      type="number" 
                      min="-10.0" 
                      max="10.0" 
                      step="0.05" 
                      value={modelGrounding} 
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setModelGrounding(val);
                      }} 
                      className="w-16 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-right text-[11px] text-amber-300 font-mono focus:border-amber-500 focus:outline-none" 
                    />
                  </div>
                  <input 
                    type="range" min="-2.0" max="2.0" step="0.05" 
                    value={modelGrounding} 
                    onChange={e => setModelGrounding(parseFloat(e.target.value))} 
                    className="w-full accent-amber-500" 
                  />
                  <div className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Adjust this if the model floats above or sinks into the ground by default.
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Camera Target Height Override ({modelCameraYOffset.toFixed(2)}m)</label>
                    <input 
                      type="number" 
                      min="-5.0" 
                      max="10.0" 
                      step="0.05" 
                      value={modelCameraYOffset} 
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setModelCameraYOffset(val);
                      }} 
                      className="w-16 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-right text-[11px] text-amber-300 font-mono focus:border-amber-500 focus:outline-none" 
                    />
                  </div>
                  <input 
                    type="range" min="-2.0" max="4.0" step="0.05" 
                    value={modelCameraYOffset} 
                    onChange={e => setModelCameraYOffset(parseFloat(e.target.value))} 
                    className="w-full accent-amber-500" 
                  />
                  <div className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Manual camera focus height. Set to 0 to use automatic skeleton head / bounding box height.
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setModelScale(0.8)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-[10px] font-bold text-amber-300 transition-colors"
                  >
                    Standard Scale (0.8x)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setModelScale(0.5)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300 transition-colors"
                  >
                    Half Scale (0.5x)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setModelScale(0.8); setModelRotationY(0); setModelGrounding(0); setModelCameraYOffset(0); }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300 transition-colors"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════ SKELETON TAB ═══════════════ */}
            {activeTab === 'skeleton' && (
              <div className="space-y-4">
                {/* Rig Family Analysis Card */}
                {parsedGLB.rigAnalysis && (
                  <div className="bg-slate-900/60 border border-slate-700/80 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                          {parsedGLB.rigAnalysis.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {Math.round(parsedGLB.rigAnalysis.confidence * 100)}% match confidence
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {parsedGLB.isSkinned && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                            ✓ Skinned Mesh
                          </span>
                        )}
                        {parsedGLB.rigAnalysis.hasTail && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-950/40 border border-purple-800/40 text-purple-300">
                            Tail
                          </span>
                        )}
                        {parsedGLB.rigAnalysis.hasWings && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-sky-950/40 border border-sky-800/40 text-sky-300">
                            Wings
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-slate-800 border border-slate-700 text-slate-400">
                          {parsedGLB.bones.length} Bones
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {parsedGLB.rigAnalysis.description}
                    </div>
                    {parsedGLB.rigAnalysis.missingEssentialBones.length > 0 && (
                      <div className="bg-amber-950/20 border border-amber-700/40 rounded p-2 text-[10px] text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Missing standard bones: </span>
                          <span>{parsedGLB.rigAnalysis.missingEssentialBones.join(', ')}. Some animations may need retargeting or fallbacks.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-amber-200 text-[11px]">Map standard Saints bones to this model&apos;s rig.</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (parsedGLB.rigAnalysis?.detectedStandardBones) {
                          setBoneMap(prev => ({ ...prev, ...parsedGLB.rigAnalysis.detectedStandardBones }));
                          showToast?.('Auto-mapped detected standard bones!');
                        }
                      }}
                      className="px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      ⚡ Auto-Map All
                    </button>
                    <div className="text-[10px] text-slate-500">
                      {mappedBoneCount} / {STANDARD_BONES.length} mapped
                    </div>
                  </div>
                </div>
                {parsedGLB.bones.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Bone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="font-bold">No bones detected</div>
                    <div className="text-[10px] mt-1">This model doesn&apos;t have a skeleton. You can skip this tab.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {STANDARD_BONES.map(sb => {
                      const mapped = !!boneMap[sb];
                      return (
                        <div key={sb} className={`flex flex-col rounded p-2 border transition-colors ${mapped ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-slate-900/30 border-slate-800'}`}>
                          <label className={`text-[10px] mb-1 font-bold ${mapped ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {mapped && <span className="mr-1">●</span>}
                            {sb}
                          </label>
                          <select 
                            value={boneMap[sb] || ''} 
                            onChange={e => setBoneMap(prev => ({...prev, [sb]: e.target.value}))}
                            className="bg-black/50 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white cursor-pointer focus:border-amber-600/60 focus:outline-none"
                          >
                            <option value="">-- None --</option>
                            {parsedGLB.bones.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════ ATTACHMENTS TAB ═══════════════ */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="text-amber-200 flex justify-between items-center">
                  <span className="text-[11px]">Define mount points for weapons and accessories.</span>
                  <button 
                    onClick={() => setAttachments(prev => [...prev, { id: Date.now().toString(), name: 'New Point', bone: parsedGLB.bones[0]?.name || '', position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] }])}
                    className="px-2.5 py-1 bg-amber-600/20 border border-amber-600/40 rounded text-amber-300 text-[10px] font-bold hover:bg-amber-600/30 transition-colors"
                  >+ Add Point</button>
                </div>
                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Box className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="font-bold">No attachment points defined</div>
                    <div className="text-[10px] mt-1">Add mount points to attach weapons, shields, or accessories to specific bones.</div>
                  </div>
                ) : (
                  attachments.map((att, i) => (
                    <div key={att.id} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg space-y-2">
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          value={att.name} 
                          onChange={e => { const a = [...attachments]; a[i].name = e.target.value; setAttachments(a); }} 
                          className="flex-1 bg-black/50 border border-slate-700 rounded px-2 py-1 text-white text-[11px] focus:border-amber-600/60 focus:outline-none" 
                          placeholder="e.g. RightHandMount" 
                        />
                        <select 
                          value={att.bone} 
                          onChange={e => { const a = [...attachments]; a[i].bone = e.target.value; setAttachments(a); }} 
                          className="flex-1 bg-black/50 border border-slate-700 rounded px-2 py-1 text-[11px] text-white cursor-pointer focus:border-amber-600/60 focus:outline-none"
                        >
                          {parsedGLB.bones.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                        <button 
                          onClick={() => setAttachments(prev => prev.filter(x => x.id !== att.id))} 
                          className="text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-950/30 transition-colors font-bold"
                        >✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══════════════ ANIMATIONS TAB ═══════════════ */}
            {activeTab === 'animations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-amber-200 text-[11px]">
                    Assign clips to actions. Clips are analyzed for rig compatibility and requirements.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoMapAllAnimations}
                      className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 rounded text-[10px] font-bold text-amber-300 transition-colors cursor-pointer"
                    >
                      ⚡ Auto-Map All
                    </button>
                    <label className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 rounded text-[10px] font-bold text-amber-300 transition-colors cursor-pointer flex items-center gap-1">
                      <span>+ Add Companion Clip (.fbx / .glb)</span>
                      <input
                        type="file"
                        accept=".fbx,.glb"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleAddCompanionAnimation(f);
                        }}
                      />
                    </label>
                    <div className="text-[10px] text-slate-500">
                      {mappedAnimCount} / {ANIMATION_ACTIONS.length} mapped
                    </div>
                  </div>
                </div>

                {/* Categorized Clips & Requirements Panel */}
                {parsedGLB.categorizedAnimations && parsedGLB.categorizedAnimations.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-700/80 rounded-lg p-3 space-y-2">
                    <div className="text-[11px] font-semibold text-amber-300 flex items-center justify-between">
                      <span>Detected Clips & Model Requirements ({parsedGLB.categorizedAnimations.length})</span>
                      <span className="text-[9px] text-slate-400 font-normal">Auto-categorized by rig tracks & motion</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {parsedGLB.categorizedAnimations.map((catAnim, idx) => {
                        const isSelectedForPreview = activeAnimationIndex === idx;
                        const isMapped = Object.values(animMap).includes(embeddedAnimationChoiceId(catAnim.clipName));

                        return (
                          <div
                            key={catAnim.clipName + idx}
                            className={`p-2 rounded border transition-colors flex items-center justify-between gap-2 flex-wrap ${
                              isSelectedForPreview
                                ? 'bg-amber-950/30 border-amber-500/50'
                                : 'bg-black/40 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-wrap min-w-[200px]">
                              <span className="font-bold text-[11px] text-white font-mono">{catAnim.clipName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">({catAnim.duration.toFixed(2)}s)</span>
                              
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 border border-slate-700 text-slate-300">
                                {catAnim.category}
                              </span>

                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/40 border border-amber-800/40 text-amber-300 font-mono">
                                {catAnim.targetRigLabel}
                              </span>

                              {catAnim.isRootMotion && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-950/40 border border-sky-800/40 text-sky-300">
                                  Root Motion
                                </span>
                              )}

                              {catAnim.compatibilityWithModel && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] border ${
                                    catAnim.compatibilityWithModel.isCompatible
                                      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                                      : 'bg-red-950/40 border-red-800/40 text-red-300'
                                  }`}
                                >
                                  {catAnim.compatibilityWithModel.score}% Rig Match
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActiveAnimationIndex(idx)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                  isSelectedForPreview
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                {isSelectedForPreview ? '■ Playing' : '▶ Preview'}
                              </button>

                              {catAnim.suggestedSlots.length > 0 && !isMapped && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const slot = catAnim.suggestedSlots[0];
                                    setAnimMap(prev => ({ ...prev, [slot]: embeddedAnimationChoiceId(catAnim.clipName) }));
                                    showToast?.(`Mapped to ${slot}!`);
                                  }}
                                  className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  ⚡ Map ({catAnim.suggestedSlots[0]})
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!hasEmbeddedAnimations && (
                  <div className="rounded border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-[10px] text-amber-200">
                    This model has no embedded clips. You can upload companion .fbx/.glb clips above, or assign reusable Animation Sets below.
                  </div>
                )}
                {Object.values(animMap).some((choiceId) => choiceId && animationChoiceById.get(choiceId)?.sourceKind === 'animation-set') && (
                  <div className="rounded border border-slate-700 bg-slate-900/60 px-3 py-2 text-[10px] text-slate-300">
                    Animation Set assignments are saved with their source and clip path. External clip loading and playback still need to be connected to the live character renderer.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {ANIMATION_ACTIONS.map(action => {
                    const selectedChoiceId = animMap[action.key] || '';
                    const selectedChoice = animationChoiceById.get(selectedChoiceId);
                    const choicesForAction = getAnimationChoicesForSlot(animationChoices, action.key);
                    const mapped = !!selectedChoiceId;
                    return (
                      <div key={action.key} className={`flex flex-col rounded p-2 border transition-colors ${mapped ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-slate-900/30 border-slate-800'}`}>
                        <label className={`text-[10px] mb-1 font-bold ${mapped ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {mapped && <span className="mr-1">▶</span>}
                          {action.label}
                        </label>
                        <RegistryCombobox
                          value={selectedChoiceId}
                          onChange={choiceId => {
                            setAnimMap(prev => {
                              const next = { ...prev };
                              if (choiceId) next[action.key] = choiceId;
                              else delete next[action.key];
                              return next;
                            });
                            const choice = animationChoiceById.get(choiceId);
                            const index = choice?.sourceKind === 'embedded'
                              ? parsedGLB.animations.findIndex(animation => animation.name === choice.clip)
                              : -1;
                            setActiveAnimationIndex(index >= 0 ? index : undefined);
                          }}
                          options={[
                            { value: '', label: '-- None --' },
                            ...choicesForAction.map(choice => ({
                              value: choice.id,
                              label: `${choice.clip} — ${choice.sourceLabel}`
                            }))
                          ]}
                          className="mt-1"
                        />
                        {selectedChoice && (
                          <div className="mt-1 text-[9px] text-slate-500 truncate" title={selectedChoice.sourcePath || selectedChoice.sourceLabel}>
                            {selectedChoice.sourceKind === 'embedded'
                              ? `Embedded · ${selectedChoice.duration?.toFixed(2) ?? '?'}s`
                              : `${selectedChoice.rigFamily} rig · ${selectedChoice.sourcePath}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════ MATERIALS TAB ═══════════════ */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-amber-200 text-[11px]">
                    Configure material properties and connect PBR textures (Albedo, Normal, Roughness, Metallic, Emissive, AO).
                  </div>
                  <label className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 rounded text-[10px] font-bold text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Batch Auto-Assign Textures</span>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) handleBatchAssignTextures(files);
                      }}
                    />
                  </label>
                </div>

                {hasModifiedTextures && (
                  <div className="bg-emerald-950/20 border border-emerald-500/40 rounded px-3 py-1.5 text-[10px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>External textures connected. These will be baked into the saved GLB automatically when published.</span>
                  </div>
                )}

                {Object.keys(parsedGLB.materials).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-800 opacity-30" />
                    <div className="font-bold">No materials detected</div>
                  </div>
                ) : (
                  Object.values(parsedGLB.materials).map(mat => (
                    <div key={mat.name} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          {mat.color && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0 shadow-sm"
                              style={{ backgroundColor: `#${mat.color}` }}
                            />
                          )}
                          <span className="font-bold text-[11px] text-slate-200">{mat.name}</span>
                          <span className="text-[9px] text-slate-500">({mat.type})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { 
                              const m = {...materialConfig}; 
                              m[mat.name] = m[mat.name] || { tintable: false, slot: 'Base' };
                              m[mat.name].tintable = !m[mat.name].tintable; 
                              setMaterialConfig(m); 
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all border ${
                              materialConfig[mat.name]?.tintable 
                                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' 
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {materialConfig[mat.name]?.tintable ? '✓ Tintable' : 'Tintable'}
                          </button>
                          <select 
                            value={materialConfig[mat.name]?.slot || 'Base'} 
                            onChange={e => {
                              const m = {...materialConfig};
                              m[mat.name] = m[mat.name] || { tintable: false, slot: 'Base' };
                              m[mat.name].slot = e.target.value;
                              setMaterialConfig(m);
                            }} 
                            className="bg-black/50 border border-slate-700 rounded px-2 py-1 text-[10px] text-white cursor-pointer focus:border-amber-600/60 focus:outline-none"
                          >
                            <option value="Base">Base</option>
                            <option value="Skin">Skin</option>
                            <option value="Hair">Hair</option>
                            <option value="Eyes">Eyes</option>
                            <option value="ClothingPrimary">Clothing Primary</option>
                            <option value="ClothingSecondary">Clothing Secondary</option>
                          </select>
                        </div>
                      </div>

                      {/* PBR Texture Channels */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                        {/* 1. Albedo / BaseColor */}
                        <div className="bg-black/40 border border-slate-800 rounded p-2 flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-semibold">Albedo / Base</span>
                            {mat.hasTexture ? (
                              <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.5 rounded font-mono">✓ Active</span>
                            ) : (
                              <span className="text-[9px] text-slate-500 bg-slate-800/40 px-1 py-0.5 rounded font-mono">None</span>
                            )}
                          </div>
                          <label className="w-full text-center py-1 text-[10px] bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-amber-300 rounded cursor-pointer transition-colors">
                            <span>{mat.hasTexture ? 'Replace' : '+ Connect'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) assignTextureToMaterialChannel(mat.name, 'map', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* 2. Normal Map */}
                        <div className="bg-black/40 border border-slate-800 rounded p-2 flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-semibold">Normal Map</span>
                            {mat.hasNormalMap ? (
                              <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.5 rounded font-mono">✓ Active</span>
                            ) : (
                              <span className="text-[9px] text-slate-500 bg-slate-800/40 px-1 py-0.5 rounded font-mono">None</span>
                            )}
                          </div>
                          <label className="w-full text-center py-1 text-[10px] bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-amber-300 rounded cursor-pointer transition-colors">
                            <span>{mat.hasNormalMap ? 'Replace' : '+ Connect'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) assignTextureToMaterialChannel(mat.name, 'normalMap', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* 3. Roughness Map */}
                        <div className="bg-black/40 border border-slate-800 rounded p-2 flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-semibold">Roughness</span>
                            {mat.hasRoughnessMap ? (
                              <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.5 rounded font-mono">✓ Active</span>
                            ) : (
                              <span className="text-[9px] text-slate-500 bg-slate-800/40 px-1 py-0.5 rounded font-mono">None</span>
                            )}
                          </div>
                          <label className="w-full text-center py-1 text-[10px] bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-amber-300 rounded cursor-pointer transition-colors">
                            <span>{mat.hasRoughnessMap ? 'Replace' : '+ Connect'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) assignTextureToMaterialChannel(mat.name, 'roughnessMap', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* 4. Metallic Map */}
                        <div className="bg-black/40 border border-slate-800 rounded p-2 flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-semibold">Metallic</span>
                            {mat.hasMetalnessMap ? (
                              <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.5 rounded font-mono">✓ Active</span>
                            ) : (
                              <span className="text-[9px] text-slate-500 bg-slate-800/40 px-1 py-0.5 rounded font-mono">None</span>
                            )}
                          </div>
                          <label className="w-full text-center py-1 text-[10px] bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-amber-300 rounded cursor-pointer transition-colors">
                            <span>{mat.hasMetalnessMap ? 'Replace' : '+ Connect'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) assignTextureToMaterialChannel(mat.name, 'metalnessMap', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* 5. Emissive Map */}
                        <div className="bg-black/40 border border-slate-800 rounded p-2 flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-semibold">Emissive / Glow</span>
                            {mat.hasEmissiveMap ? (
                              <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.5 rounded font-mono">✓ Active</span>
                            ) : (
                              <span className="text-[9px] text-slate-500 bg-slate-800/40 px-1 py-0.5 rounded font-mono">None</span>
                            )}
                          </div>
                          <label className="w-full text-center py-1 text-[10px] bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-amber-300 rounded cursor-pointer transition-colors">
                            <span>{mat.hasEmissiveMap ? 'Replace' : '+ Connect'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) assignTextureToMaterialChannel(mat.name, 'emissiveMap', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* 6. AO Map */}
                        <div className="bg-black/40 border border-slate-800 rounded p-2 flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-semibold">Ambient Occlusion</span>
                            {mat.hasAoMap ? (
                              <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.5 rounded font-mono">✓ Active</span>
                            ) : (
                              <span className="text-[9px] text-slate-500 bg-slate-800/40 px-1 py-0.5 rounded font-mono">None</span>
                            )}
                          </div>
                          <label className="w-full text-center py-1 text-[10px] bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-amber-300 rounded cursor-pointer transition-colors">
                            <span>{mat.hasAoMap ? 'Replace' : '+ Connect'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/x-tga,.tga,.dds,.bmp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) assignTextureToMaterialChannel(mat.name, 'aoMap', f);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* ═══════════════ ITEMS / MODULAR COMPOSITION TAB ═══════════════ */}
            {activeTab === 'items' && structure === 'Modular' && (
              <div className="space-y-4">
                {/* Publishing Mode Selector */}
                <div className="bg-[#0b1320] border border-amber-600/40 rounded-lg p-3 space-y-2">
                  <div className="text-amber-300 font-bold text-[11px] flex items-center justify-between">
                    <span>Modular Character Publishing Mode</span>
                    <span className="text-[9px] text-slate-400">Choose how this assembled character is saved</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPublishingMode('COMPOSITE_MODEL')}
                      className={`p-2.5 rounded border text-left transition-all ${
                        publishingMode === 'COMPOSITE_MODEL'
                          ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(202,162,66,0.15)]'
                          : 'bg-black/40 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-bold text-[11px] mb-1 flex items-center gap-1.5 text-amber-300">
                        <span>⭐ Pre-Assembled Composite Character</span>
                      </div>
                      <div className="text-[9px] text-slate-400 leading-tight">
                        Merges the base body + all active modular pieces into a single, unified GLB. Ready to assign immediately to Archetypes, NPCs, Monsters, or Creatures with zero runtime assembly!
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishingMode('MODULAR_SET')}
                      className={`p-2.5 rounded border text-left transition-all ${
                        publishingMode === 'MODULAR_SET'
                          ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(202,162,66,0.15)]'
                          : 'bg-black/40 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-bold text-[11px] mb-1 flex items-center gap-1.5 text-amber-300">
                        <span>📦 Dynamic Modular Character Set</span>
                      </div>
                      <div className="text-[9px] text-slate-400 leading-tight">
                        Saves the base body and uploads each modular piece separately, linking them for dynamic player character creation and wardrobe swapping.
                      </div>
                    </button>
                  </div>
                </div>

                <div className="text-amber-200 mb-1 font-bold text-[11px]">Attach Modular Pieces (Live 3D Preview)</div>
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Add modular files (hair, clothing, boots, hats, weapons). They will automatically mount onto the base body in the 3D preview viewport!
                </div>
                
                {/* Drop zone */}
                <div className="bg-slate-900/50 border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-800/50 hover:border-amber-600/40 transition-all relative group">
                  <input 
                    type="file" 
                    multiple 
                    accept=".glb,.gltf,.fbx,.obj,.vox,.dae,.stl,.ply" 
                    onChange={async e => {
                      if (!e.target.files) return;
                      
                      const guessCategory = (name: string): string => {
                        const n = name.toLowerCase();
                        if (n.includes('hair')) return 'hair';
                        if (n.includes('head') || n.includes('helmet') || n.includes('hat') || n.includes('mask') || n.includes('face') || n.includes('cap')) return 'hat';
                        if (n.includes('shirt') || n.includes('chest') || n.includes('torso') || n.includes('jacket') || n.includes('armor') || n.includes('t_shirt') || n.includes('top')) return 'shirt';
                        if (n.includes('leg') || n.includes('pant') || n.includes('trouser') || n.includes('short')) return 'pants';
                        if (n.includes('foot') || n.includes('feet') || n.includes('shoe') || n.includes('boot') || n.includes('sneaker')) return 'shoes';
                        if (n.includes('hand') || n.includes('glove') || n.includes('gauntlet')) return 'accessory';
                        if (n.includes('cape') || n.includes('back') || n.includes('cloak') || n.includes('wing')) return 'accessory';
                        if (n.includes('weapon') || n.includes('sword') || n.includes('bow') || n.includes('staff') || n.includes('axe')) return 'accessory';
                        if (n.includes('shield')) return 'accessory';
                        return 'shirt';
                      };

                      const files = Array.from(e.target.files);
                      const gltfLoader = new GLTFLoader();

                      for (const f of files) {
                        let finalFile = f;
                        const lower = f.name.toLowerCase();
                        try {
                          if (lower.endsWith('.fbx')) {
                            showToast?.(`Converting ${f.name} to GLB...`);
                            finalFile = await convertFbxToGlb(f);
                          } else if (lower.endsWith('.obj')) {
                            showToast?.(`Converting ${f.name} to GLB...`);
                            finalFile = await convertObjToGlb(f);
                          } else if (lower.endsWith('.vox')) {
                            showToast?.(`Converting ${f.name} to GLB...`);
                            finalFile = await convertVoxToGlb(f);
                          } else if (lower.endsWith('.dae')) {
                            showToast?.(`Converting ${f.name} to GLB...`);
                            finalFile = await convertDaeToGlb(f);
                          } else if (lower.endsWith('.stl')) {
                            showToast?.(`Converting ${f.name} to GLB...`);
                            finalFile = await convertStlToGlb(f);
                          } else if (lower.endsWith('.ply')) {
                            showToast?.(`Converting ${f.name} to GLB...`);
                            finalFile = await convertPlyToGlb(f);
                          }
                        } catch (err) {
                          console.warn('Conversion failed for item:', f.name, err);
                        }

                        const itemUrl = URL.createObjectURL(finalFile);
                        gltfLoader.load(
                          itemUrl,
                          (gltf) => {
                            URL.revokeObjectURL(itemUrl);
                            if (companionTextureFiles && companionTextureFiles.length > 0) {
                              attachTextureFilesToMaterials(gltf.scene, companionTextureFiles);
                            }
                            setAdditionalItems(prev => [
                              ...prev,
                              {
                                id: Math.random().toString(36).substring(2, 9),
                                file: finalFile,
                                name: finalFile.name,
                                category: guessCategory(f.name),
                                scene: gltf.scene,
                                enabled: true,
                              },
                            ]);
                            showToast?.(`Mounted ${finalFile.name} onto 3D character!`);
                          },
                          undefined,
                          () => URL.revokeObjectURL(itemUrl)
                        );
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Puzzle className="w-6 h-6 text-slate-500 group-hover:text-amber-500 mx-auto mb-2 transition-colors" />
                  <div className="text-amber-500 font-bold text-[11px] group-hover:text-amber-400">Click or Drag 3D Modular Pieces here (GLB/FBX/OBJ/VOX/DAE/STL)</div>
                  <div className="text-[9px] text-slate-500 mt-1">e.g., Hat_010.glb, T-Shirt_009.glb, Pants_005.glb, Boot_002.glb, Hair_001.glb</div>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  {additionalItems.map(item => (
                    <div key={item.id} className="bg-slate-900/60 border border-slate-700 p-2.5 rounded-lg flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAdditionalItems(prev => prev.map(p => p.id === item.id ? { ...p, enabled: !p.enabled } : p));
                        }}
                        title={item.enabled ? 'Hide piece in preview' : 'Show piece in preview'}
                        className={`p-1.5 rounded transition-colors ${
                          item.enabled ? 'bg-amber-600/30 text-amber-300' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {item.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <div className="text-lg">{COMPONENT_CATEGORY_ICONS[item.category] || '📦'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-200 text-[11px] truncate">
                          {item.name || item.file.name}
                        </div>
                        <div className="text-[9px] text-slate-400 flex items-center gap-1.5">
                          <span>Slot: <strong className="text-amber-400">{item.category}</strong></span>
                          <span>·</span>
                          <span className={item.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                            {item.enabled ? 'Mounted in Preview' : 'Hidden'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1 flex-wrap max-w-[280px]">
                        {componentCategoryEntries.slice(0, 7).map(([key, meta]) => {
                          const active = item.category === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setAdditionalItems(prev => prev.map(p => p.id === item.id ? { ...p, category: key } : p))}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                active 
                                  ? 'bg-amber-600/25 border-amber-500/60 text-amber-300' 
                                  : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>

                      <button 
                        type="button"
                        onClick={() => setAdditionalItems(prev => prev.filter(p => p.id !== item.id))}
                        className="text-red-500 hover:text-red-400 font-bold px-2 py-1 rounded hover:bg-red-950/30 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {additionalItems.length === 0 && (
                    <div className="text-slate-500 italic text-[10px] text-center py-4 bg-slate-900/30 rounded border border-slate-800/80">
                      No modular pieces added yet. Drop pieces like hats, shirts, pants, or boots above to dress and preview this base character.
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
