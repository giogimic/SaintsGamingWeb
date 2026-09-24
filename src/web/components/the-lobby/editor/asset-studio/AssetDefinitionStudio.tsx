'use client';

import React, { useState, useEffect, useRef } from 'react';
import { parseGLB, ParsedGLB, ParsedAnimation } from './glbParser';
import { AssetInspector3D, AssetInspector3DRef } from './AssetInspector3D';
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useGameStore } from '../../store';
import { AssetManager } from '@/engine/assets/AssetManager';

interface Props {
  file: File;
  previewUrl: string;
  onSuccess: (asset: any) => void;
  onCancel: () => void;
}

export function AssetDefinitionStudio({ file, previewUrl, onSuccess, onCancel }: Props) {
  const showToast = useGameStore((s) => s.showToast);
  const [parsedGLB, setParsedGLB] = useState<ParsedGLB | null>(null);
  const [isParsing, setIsParsing] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'skeleton' | 'attachments' | 'animations' | 'materials' | 'items'>('roles');
  
  // Model state
  const [activeAnimationIndex, setActiveAnimationIndex] = useState<number | undefined>(undefined);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showBounds, setShowBounds] = useState(true);
  
  const inspectorRef = useRef<AssetInspector3DRef>(null);

  // Form State
  const [assetName, setAssetName] = useState(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
  const [visibility, setVisibility] = useState('COMMUNITY');
  const [tagsInput, setTagsInput] = useState('3d, model');
  
  // Roles
  const [roles, setRoles] = useState<string[]>(['Character']);
  const [structure, setStructure] = useState<'Complete' | 'Modular' | 'ModularItem'>('Complete');
  const [perspective, setPerspective] = useState<'Third Person' | 'First Person'>('Third Person');
  
  // Modular Settings
  const [modularSetName, setModularSetName] = useState('');
  const [skeletonConnectionPoints, setSkeletonConnectionPoints] = useState('');
  
  // Skeleton
  const [boneMap, setBoneMap] = useState<Record<string, string>>({}); // { standardBone: glbBoneName }
  
  // Attachments
  const [attachments, setAttachments] = useState<Array<{ id: string, name: string, bone: string, position: [number,number,number], rotation: [number,number,number], scale: [number,number,number] }>>([]);
  
  // Animations
  const [animMap, setAnimMap] = useState<Record<string, string>>({}); // { standardAnim: glbAnimName }
  
  const [materialConfig, setMaterialConfig] = useState<Record<string, { tintable: boolean, slot: string }>>({});
  
  // Additional Items for the Modular Set
  const [additionalItems, setAdditionalItems] = useState<Array<{ id: string, file: File; category: string }>>([]);

  // Mesh -> Component mapping (for meshes inside the base file)
  const [modularComponents, setModularComponents] = useState<Record<string, string>>({}); // { meshName: componentCategory }

  // Modular Item (Single component GLB) state
  const [componentCategory, setComponentCategory] = useState<string>('hair');
  const [baseBodyType, setBaseBodyType] = useState<string>('HumanMale');

  const [animationProfileId, setAnimationProfileId] = useState<string>('');

  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setIsParsing(true);
        const parsed = await parseGLB(previewUrl);
        setParsedGLB(parsed);
        
        // Auto-detect bones
        const autoMap: Record<string, string> = {};
        parsed.bones.forEach(b => {
          const name = b.name.toLowerCase();
          if (name.includes('hips') || name.includes('pelvis')) autoMap['Pelvis'] = b.name;
          if (name.includes('spine')) autoMap['Spine'] = b.name;
          if (name.includes('head')) autoMap['Head'] = b.name;
          if (name.includes('hand') && name.includes('l')) autoMap['Hand_L'] = b.name;
          if (name.includes('hand') && name.includes('r')) autoMap['Hand_R'] = b.name;
        });
        setBoneMap(autoMap);
        
        // Auto-detect animations
        const autoAnimMap: Record<string, string> = {};
        parsed.animations.forEach(a => {
          const name = a.name.toLowerCase();
          if (name.includes('idle')) autoAnimMap['Idle'] = a.name;
          if (name.includes('walk')) autoAnimMap['Walk'] = a.name;
          if (name.includes('run')) autoAnimMap['Run'] = a.name;
          if (name.includes('attack')) autoAnimMap['Attack_Light'] = a.name;
          if (name.includes('death') || name.includes('die')) autoAnimMap['Death'] = a.name;
        });
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
  }, [previewUrl]);

  const toggleRole = (role: string) => {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handlePublish = async () => {
    // Validation Engine
    const errors: string[] = [];
    const warnings: string[] = [];

    // Structural checks
    if (!roles.length) {
      warnings.push("No roles assigned. This asset might not show up in typical Studio filters.");
    }

    // Role specific requirements
    const isActor = roles.includes('Character') || roles.includes('NPC') || roles.includes('Enemy') || roles.includes('Player');
    if (isActor) {
      if (!animMap['Idle'] && !animationProfileId) errors.push("Actor roles require an 'Idle' animation to be mapped, or a Target Animation Profile selected.");
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
      
      const formData = new FormData();
      formData.append('file', file);
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
      tagList.push(...roles.map(r => r.toLowerCase()));
      if (structure === 'Modular') tagList.push('modular');
      formData.append('tags', JSON.stringify(tagList));

      // Append backend presentation fields for modularity
      if (structure === 'Modular') {
        formData.append('isCharacterCustomizable', 'true');
      }
      
      if (structure === 'ModularItem') {
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

      // Construct Asset Definition
      const assetDefinition = {
        roles,
        structure,
        perspective,
        animationProfileId,
        modularSetName: structure === 'Modular' ? modularSetName : undefined,
        skeletonConnectionPoints: structure === 'Modular' ? skeletonConnectionPoints : undefined,
        skeleton: {
          isSkinned: parsedGLB?.isSkinned,
          boneMap,
        },
        attachments,
        animations: {
          available: parsedGLB?.animations.map(a => a.name) || [],
          mapped: animMap,
        },
        materials: materialConfig,
        meshes: parsedGLB?.meshes.map(m => m.name) || [],
        modularComponents: structure === 'Modular' ? modularComponents : undefined,
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

      // Upload additional items
      if (structure === 'Modular' && additionalItems.length > 0) {
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
          itemFormData.append('baseBodyType', assetName); // It targets this base body!
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

  const STANDARD_BONES = ['Root', 'Pelvis', 'Spine', 'Neck', 'Head', 'Clavicle_L', 'Arm_L', 'Hand_L', 'Clavicle_R', 'Arm_R', 'Hand_R', 'Leg_L', 'Foot_L', 'Leg_R', 'Foot_R'];
  const STANDARD_ANIMS = ['Idle', 'Walk', 'Run', 'Sprint', 'Jump', 'Fall', 'Land', 'Attack_Light', 'Attack_Heavy', 'Hit_React', 'Death', 'Interact'];

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

      <div className="grid grid-cols-12 gap-4 h-[600px]">
        {/* Left Side: 3D Preview */}
        <div className="col-span-5 flex flex-col space-y-2 relative">
          <div className="flex-1 rounded overflow-hidden">
            <AssetInspector3D 
              ref={inspectorRef}
              parsedGLB={parsedGLB} 
              activeAnimationIndex={activeAnimationIndex} 
              showSkeleton={showSkeleton}
              showBounds={showBounds}
            />
          </div>
          {/* View Controls */}
          <div className="flex items-center gap-2 bg-[#050b14] p-2 border border-slate-800 rounded">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showSkeleton} onChange={e => setShowSkeleton(e.target.checked)} />
              Bones
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showBounds} onChange={e => setShowBounds(e.target.checked)} />
              Bounds
            </label>
            <select 
              value={activeAnimationIndex ?? ''} 
              onChange={e => setActiveAnimationIndex(e.target.value === '' ? undefined : Number(e.target.value))}
              className="ml-auto bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px]"
            >
              <option value="">(No Animation)</option>
              {parsedGLB.animations.map((a, i) => (
                <option key={i} value={i}>{a.name}</option>
              ))}
            </select>
          </div>
          
          <div className="bg-[#050b14] p-2 border border-slate-800 rounded">
            <div className="text-amber-400 font-bold mb-1">Detected Specs</div>
            <div className="text-[10px] grid grid-cols-2 gap-x-2 gap-y-1">
              <div>Meshes: {parsedGLB.meshes.length}</div>
              <div>Bones: {parsedGLB.bones.length}</div>
              <div>Animations: {parsedGLB.animations.length}</div>
              <div>Materials: {Object.keys(parsedGLB.materials).length}</div>
              <div className="col-span-2 text-cyan-400">Skinned: {parsedGLB.isSkinned ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>

        {/* Right Side: Config Steps */}
        <div className="col-span-7 bg-[#050b14] border border-slate-800 rounded flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-[#0b1320]">
            {['roles', 'skeleton', 'attachments', 'animations', 'materials', ...(structure === 'Modular' ? ['items'] : [])].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === tab ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-950/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {activeTab === 'roles' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Asset Name</label>
                  <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Supported Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {['Character', 'NPC', 'Enemy', 'Creature', 'Player', 'Prop', 'Equipment', 'Weapon'].map(r => (
                      <label key={r} className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded cursor-pointer">
                        <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} /> {r}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Structure</label>
                    <select value={structure} onChange={e => setStructure(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1">
                      <option value="Complete">Complete Model</option>
                      <option value="Modular">Modular Base Character</option>
                      <option value="ModularItem">Modular Item / Component</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Perspective</label>
                    <select value={perspective} onChange={e => setPerspective(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1">
                      <option value="Third Person">Third Person</option>
                      <option value="First Person">First Person</option>
                    </select>
                  </div>
                </div>
                {structure === 'Modular' && (
                  <div className="col-span-2 grid grid-cols-2 gap-2 bg-amber-950/20 p-2 border border-amber-900/30 rounded mt-2">
                    <div>
                      <label className="block text-[10px] text-amber-400 mb-1">Modular Set Name</label>
                      <input 
                        type="text" 
                        value={modularSetName} 
                        onChange={e => setModularSetName(e.target.value)} 
                        placeholder="e.g. KnightArmorSet" 
                        className="w-full bg-black border border-amber-900/50 rounded px-2 py-1 text-white" 
                      />
                    </div>
                    <div className="col-span-2 text-[9px] text-amber-200/60 leading-tight">
                      To add additional clothing or weapon GLBs to this modular set, click the "Items" tab at the top.
                    </div>
                  </div>
                )}
                
                {structure === 'ModularItem' && (
                  <div className="col-span-2 grid grid-cols-2 gap-2 bg-amber-950/20 p-2 border border-amber-900/30 rounded mt-2">
                    <div>
                      <label className="block text-[10px] text-amber-400 mb-1">Component Category</label>
                      <select 
                        value={componentCategory} 
                        onChange={e => setComponentCategory(e.target.value)}
                        className="w-full bg-black border border-amber-900/50 rounded px-2 py-1 text-white"
                      >
                        <option value="head">Head</option>
                        <option value="hair">Hair</option>
                        <option value="torso">Torso</option>
                        <option value="legs">Legs</option>
                        <option value="feet">Feet</option>
                        <option value="accessory">Accessory</option>
                        <option value="hands">Hands</option>
                        <option value="face">Face</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-400 mb-1">Base Body Type (Target)</label>
                      <input 
                        type="text" 
                        value={baseBodyType} 
                        onChange={e => setBaseBodyType(e.target.value)} 
                        placeholder="e.g. HumanMale" 
                        className="w-full bg-black border border-amber-900/50 rounded px-2 py-1 text-white" 
                      />
                    </div>
                    <div className="col-span-2 text-[9px] text-amber-200/60 leading-tight">
                      This uploads a single GLB (e.g. just a piece of hair or armor) to be worn by a base character. 
                      Set the Category (e.g., Hair) and the specific Base Body Type it was modeled to fit.
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tags</label>
                  <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                </div>
                
                {/* Animation Profile Selector */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Target Animation Profile (Optional)</label>
                  <select 
                    value={animationProfileId} 
                    onChange={e => setAnimationProfileId(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  >
                    <option value="">(None)</option>
                    <option value="AuroraManny">Aurora (Manny)</option>
                    <option value="BelicaManny">Belica (Manny)</option>
                    <option value="CountessManny">Countess (Manny)</option>
                    <option value="CrunchManny">Crunch (Manny)</option>
                    <option value="DekkerManny">Dekker (Manny)</option>
                    <option value="DrongoManny">Drongo (Manny)</option>
                    <option value="FengMaoManny">Feng Mao (Manny)</option>
                    <option value="FeyManny">The Fey (Manny)</option>
                    <option value="GreystoneManny">Greystone (Manny)</option>
                    <option value="GruxManny">Grux (Manny)</option>
                    <option value="KallariManny">Kallari (Manny)</option>
                    <option value="KhaimeraManny">Khaimera (Manny)</option>
                    <option value="KwangManny">Kwang (Manny)</option>
                    <option value="MurdockManny">Murdock (Manny)</option>
                    <option value="MurielManny">Muriel (Manny)</option>
                    <option value="NarbashManny">Narbash (Manny)</option>
                    <option value="PhaseManny">Phase (Manny)</option>
                    <option value="RevenantManny">Revenant (Manny)</option>
                    <option value="RiktorManny">Riktor (Manny)</option>
                    <option value="SerathManny">Serath (Manny)</option>
                    <option value="SparrowManny">Sparrow (Manny)</option>
                    <option value="TwinBlastManny">TwinBlast (Manny)</option>
                    <option value="WraithManny">Wraith (Manny)</option>
                    <option value="YinManny">Yin (Manny)</option>
                    <option value="ZinxManny">Zinx (Manny)</option>
                    <option value="gadgetManny">Gadget (Manny)</option>
                    <option value="gideonManny">Gideon (Manny)</option>
                    <option value="minionsManny">Minions (Manny)</option>
                    <option value="morigoshManny">Morigesh (Manny)</option>
                    <option value="steelmanny">Steel (Manny)</option>
                    <option value="terramanny">Terra (Manny)</option>
                    <option value="wukongManny">Wukong (Manny)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'skeleton' && (
              <div className="space-y-4">
                <div className="text-amber-200">Map standard Saints bones to this model's specific rig.</div>
                <div className="grid grid-cols-2 gap-2">
                  {STANDARD_BONES.map(sb => (
                    <div key={sb} className="flex flex-col">
                      <label className="text-[10px] text-slate-400">{sb}</label>
                      <select 
                        value={boneMap[sb] || ''} 
                        onChange={e => setBoneMap(prev => ({...prev, [sb]: e.target.value}))}
                        className="bg-slate-900 border border-slate-700 rounded px-1 py-1"
                      >
                        <option value="">-- None --</option>
                        {parsedGLB.bones.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="text-amber-200 flex justify-between">
                  <span>Define mount points for weapons and accessories.</span>
                  <button 
                    onClick={() => setAttachments(prev => [...prev, { id: Date.now().toString(), name: 'New Point', bone: parsedGLB.bones[0]?.name || '', position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] }])}
                    className="px-2 py-0.5 bg-slate-700 rounded text-white"
                  >+ Add</button>
                </div>
                {attachments.map((att, i) => (
                  <div key={att.id} className="bg-slate-900 border border-slate-700 p-2 rounded flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input type="text" value={att.name} onChange={e => { const a = [...attachments]; a[i].name = e.target.value; setAttachments(a); }} className="flex-1 bg-black border border-slate-700 rounded px-1 py-0.5" placeholder="Name (e.g. RightHandMount)" />
                      <select value={att.bone} onChange={e => { const a = [...attachments]; a[i].bone = e.target.value; setAttachments(a); }} className="flex-1 bg-black border border-slate-700 rounded px-1 py-0.5">
                        {parsedGLB.bones.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                      </select>
                      <button onClick={() => setAttachments(prev => prev.filter(x => x.id !== att.id))} className="text-red-400 px-1">X</button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && <div className="text-slate-500 text-center py-4">No attachment points defined.</div>}
              </div>
            )}

            {activeTab === 'animations' && (
              <div className="space-y-4">
                <div className="text-amber-200">Map standard Saints animation triggers to imported clips.</div>
                <div className="grid grid-cols-2 gap-2">
                  {STANDARD_ANIMS.map(sa => (
                    <div key={sa} className="flex flex-col">
                      <label className="text-[10px] text-slate-400">{sa}</label>
                      <select 
                        value={animMap[sa] || ''} 
                        onChange={e => {
                          setAnimMap(prev => ({...prev, [sa]: e.target.value}));
                          const index = parsedGLB.animations.findIndex(a => a.name === e.target.value);
                          if (index !== -1) setActiveAnimationIndex(index);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-1 py-1"
                      >
                        <option value="">-- None --</option>
                        {parsedGLB.animations.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-4">
                <div className="text-amber-200">Configure how materials can be customized in-game.</div>
                {Object.values(parsedGLB.materials).map(mat => (
                  <div key={mat.name} className="bg-slate-900 border border-slate-700 p-2 rounded flex items-center gap-4">
                    <div className="flex-1 font-bold">{mat.name}</div>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={materialConfig[mat.name]?.tintable || false} onChange={e => { const m = {...materialConfig}; m[mat.name].tintable = e.target.checked; setMaterialConfig(m); }} />
                      Tintable
                    </label>
                    <select value={materialConfig[mat.name]?.slot || 'Base'} onChange={e => { const m = {...materialConfig}; m[mat.name].slot = e.target.value; setMaterialConfig(m); }} className="bg-black border border-slate-700 rounded px-1 py-0.5">
                      <option value="Base">Base</option>
                      <option value="Skin">Skin</option>
                      <option value="Hair">Hair</option>
                      <option value="Eyes">Eyes</option>
                      <option value="ClothingPrimary">Clothing Primary</option>
                      <option value="ClothingSecondary">Clothing Secondary</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'items' && structure === 'Modular' && (
              <div className="space-y-4">
                <div className="text-amber-200 mb-2 font-bold">Modular Set Items</div>
                <div className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                  Add additional GLB files (hair, clothing, weapons) that belong to this modular set. They will be uploaded and linked to this Base Body automatically.
                </div>
                
                <div className="bg-slate-900 border border-slate-700 border-dashed rounded p-4 text-center cursor-pointer hover:bg-slate-800 transition-colors relative">
                  <input 
                    type="file" 
                    multiple 
                    accept=".glb,.gltf" 
                    onChange={e => {
                      if (!e.target.files) return;
                      const newItems = Array.from(e.target.files).map(f => ({
                        id: Math.random().toString(36).substr(2, 9),
                        file: f,
                        category: 'hair'
                      }));
                      setAdditionalItems(prev => [...prev, ...newItems]);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-amber-500 font-bold">Click or Drag additional GLB files here</div>
                  <div className="text-[10px] text-slate-400 mt-1">e.g., hair.glb, armor.glb</div>
                </div>

                <div className="space-y-2 mt-4">
                  {additionalItems.map(item => (
                    <div key={item.id} className="bg-black border border-slate-700 p-2 rounded flex items-center gap-4">
                      <div className="flex-1 font-bold text-slate-300 text-[10px] truncate">
                        {item.file.name}
                      </div>
                      <div className="w-48">
                        <select 
                          value={item.category} 
                          onChange={e => setAdditionalItems(prev => prev.map(p => p.id === item.id ? { ...p, category: e.target.value } : p))}
                          className="w-full bg-slate-900 border border-amber-900/50 rounded px-2 py-1 text-white text-[10px]"
                        >
                          <option value="head">Head</option>
                          <option value="hair">Hair</option>
                          <option value="torso">Torso</option>
                          <option value="legs">Legs</option>
                          <option value="feet">Feet</option>
                          <option value="accessory">Accessory</option>
                          <option value="hands">Hands</option>
                          <option value="face">Face</option>
                          <option value="weapon">Weapon</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => setAdditionalItems(prev => prev.filter(p => p.id !== item.id))}
                        className="text-red-500 hover:text-red-400 font-bold px-2"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  {additionalItems.length === 0 && (
                    <div className="text-slate-500 italic text-[10px]">No extra items added yet.</div>
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
