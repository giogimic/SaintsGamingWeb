'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Music, Box, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { AssetManager } from '@/engine/assets/AssetManager';
import {
  ASSET_IMPORT_PROFILE_META,
  AssetImportProfileId,
  CHARACTER_COMPONENT_CATEGORIES,
  getDefaultSlotRole,
  getDefaultZOrderHint,
  inferCategoryForRole,
  inferCharacterComponentLayerSlot,
  inferTypeForProfile,
  isCharacterComponentCategory,
  isValidSlotRole,
  listAssetImportProfiles,
  listCharacterBaseBodyTypes,
  listCharacterComponentCategories,
  listSlotRolesForProfile,
} from '@/shared/game/assetImportProfiles';

const ASSET_TYPES = [
  { value: 'OBJECT', label: 'Object / Prop (Furniture, Trees, Rocks)', icon: Box },
  { value: 'CHARACTER', label: 'Character / Hero / NPC', icon: ImageIcon },
  { value: 'CREATURE', label: 'Creature / Monster', icon: ImageIcon },
  { value: 'TILE', label: 'Tile / Terrain Patch', icon: Box },
  { value: 'ITEM', label: 'Inventory Item / Gear Icon', icon: Box },
  { value: 'UI', label: 'UI Element / Frame / Icon', icon: Box },
  { value: 'EFFECT', label: 'Visual Effect / Particle', icon: SparklesIcon },
  { value: 'AUDIO', label: 'Sound Effect / Music Track', icon: Music },
];

function SparklesIcon(props: any) {
  return <ImageIcon {...props} />;
}

export function AssetUploadView({ onUploadComplete }: { onUploadComplete?: (asset: any) => void }) {
  const showToast = useGameStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('OBJECT');
  const [category, setCategory] = useState('');
  const [componentCategory, setComponentCategory] = useState('');
  const [componentLayer, setComponentLayer] = useState('');
  const [variantFamily, setVariantFamily] = useState('');
  const [isModularComponent, setIsModularComponent] = useState(false);
  const [zOrderHint, setZOrderHint] = useState('');
  const [baseBodyType, setBaseBodyType] = useState('');
  const [hidesComponents, setHidesComponents] = useState<string[]>([]);
  const [bodyTypeWarning, setBodyTypeWarning] = useState<string | null>(null);
  const [importProfile, setImportProfile] = useState<AssetImportProfileId | ''>('');
  const [slotRole, setSlotRole] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState('COMMUNITY');
  const [createUsable, setCreateUsable] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Warn (non-blocking) when this piece's baseBodyType conflicts with other assets
  // already sharing the same variantFamily — catches mismatched LPC layers before
  // they get approved/bundled together.
  useEffect(() => {
    if (!isModularComponent || !variantFamily.trim() || !baseBodyType) {
      setBodyTypeWarning(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const manager = AssetManager.getInstance();
        const { items } = await manager.searchAssets({ variantFamily: variantFamily.trim() }, 0, 25);
        if (cancelled) return;

        const conflicting = items
          .map((item) => (item.metadata?.baseBodyType || item.baseBodyType || '').toString().toLowerCase())
          .filter((bt) => bt && bt !== baseBodyType.toLowerCase());

        if (conflicting.length > 0) {
          const uniqueTypes = Array.from(new Set(conflicting));
          setBodyTypeWarning(
            `⚠️ ${conflicting.length} existing asset(s) tagged "${variantFamily.trim()}" use a different body type (${uniqueTypes.join(', ')}). This piece is "${baseBodyType}" — sprites may not align.`
          );
        } else {
          setBodyTypeWarning(null);
        }
      } catch {
        // Non-critical check; ignore failures silently.
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isModularComponent, variantFamily, baseBodyType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setUploadSuccess(null);

    // Default asset name from file
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    if (!assetName) {
      setAssetName(cleanName);
    }

    // Auto-detect audio vs image only when profile is not pinned.
    if (!importProfile && file.type.startsWith('audio/')) {
      setAssetType('AUDIO');
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
      handleFileChange({ target: { files: [file] } } as any);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', assetName.trim() || selectedFile.name);
      formData.append('type', assetType);
      if (importProfile) formData.append('importProfile', importProfile);
      if (slotRole) formData.append('slotRole', slotRole);
      formData.append('sourceMode', 'single');
      if (category.trim()) formData.append('category', category.trim().toLowerCase());
      if (isModularComponent) {
        const normalizedComponentCategory = componentCategory || category || 'other';
        const normalizedComponentLayer = componentLayer || inferCharacterComponentLayerSlot(normalizedComponentCategory) || 'full-body';
        formData.append('componentCategory', normalizedComponentCategory.toLowerCase());
        formData.append('componentLayer', normalizedComponentLayer.toLowerCase());
        formData.append('isModularComponent', 'true');
        if (variantFamily.trim()) formData.append('variantFamily', variantFamily.trim());
        const effectiveZOrder = zOrderHint.trim() !== ''
          ? Number(zOrderHint)
          : getDefaultZOrderHint(normalizedComponentCategory);
        if (effectiveZOrder !== null && effectiveZOrder !== undefined && !Number.isNaN(effectiveZOrder)) {
          formData.append('zOrderHint', String(effectiveZOrder));
        }
        if (baseBodyType) formData.append('baseBodyType', baseBodyType);
        if (hidesComponents.length > 0) formData.append('hidesComponents', JSON.stringify(hidesComponents));
      }
      if (tagsInput.trim()) {
        const tagList = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
        formData.append('tags', JSON.stringify(tagList));
      }
      formData.append('visibility', visibility);
      formData.append('createUsable', String(createUsable));

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload asset');
      }

      soundSynth?.playSelectSound?.();
      showToast(`Asset ingested: ${assetName || selectedFile.name}`);
      setUploadSuccess(data);
      if (onUploadComplete) onUploadComplete(data);
    } catch (err: any) {
      console.error('Asset upload error:', err);
      setErrorMessage(err.message || 'Asset upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAssetName('');
    setImportProfile('');
    setSlotRole('');
    setCategory('');
    setComponentCategory('');
    setComponentLayer('');
    setVariantFamily('');
    setIsModularComponent(false);
    setZOrderHint('');
    setBaseBodyType('');
    setHidesComponents([]);
    setTagsInput('');
    setUploadSuccess(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 text-xs font-mono text-slate-300">
      {/* HEADER & PHILOSOPHY */}
      <div className="bg-[#0b1320]/80 border border-[#cbb26a]/30 rounded p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[#e2d5b3] font-bold text-sm">
          <Upload className="w-4 h-4 text-amber-400" /> Asset Ingestion Pipeline (Bible 35)
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Upload individual sprites, models, tiles, or audio files into the unified community library.
        </p>
      </div>

      {uploadSuccess ? (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded p-4 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-emerald-200 font-bold text-sm">Asset Successfully Ingested!</div>
          <div className="text-[11px] text-slate-300">
            Source file recorded as <span className="text-amber-300 font-bold">{uploadSuccess.sourceAsset?.filename}</span>
            {uploadSuccess.usableAsset && (
              <> and registered into the library as <span className="text-amber-300 font-bold">{uploadSuccess.usableAsset?.name}</span> ({uploadSuccess.usableAsset?.type}).</>
            )}
          </div>
          <div className="pt-2">
            <button
              onClick={resetForm}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition-all shadow"
            >
              Upload Another Asset
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUploadSubmit} className="space-y-3">
          {/* DROPZONE */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-amber-500/60 bg-amber-950/20'
                : 'border-slate-700 hover:border-amber-500/40 bg-[#050b14]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg"
              className="hidden"
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-24 max-w-full object-contain rounded border border-slate-700 bg-black/40 p-1"
                />
                <span className="text-[10px] text-amber-300 font-bold">{selectedFile?.name} ({(selectedFile!.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-1.5">
                <Music className="w-8 h-8 text-amber-400" />
                <span className="text-[11px] text-white font-bold">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <Upload className="w-6 h-6 text-slate-400" />
                <div className="text-slate-200 font-bold text-[11px]">Click or drag & drop asset file here</div>
                <div className="text-[10px] text-slate-500">Supports PNG, WebP, GIF, JPEG, MP3, WAV, OGG</div>
              </div>
            )}
          </div>

          {/* ASSET METADATA FIELDS */}
          <div className="bg-[#050b14] border border-slate-800 rounded p-3 space-y-2.5">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Asset Name</label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g. Ancient Oak Tree"
                className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-[11px] text-slate-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isModularComponent}
                    onChange={(e) => {
                      setIsModularComponent(e.target.checked);
                      if (e.target.checked && !componentCategory && category) {
                        setComponentCategory(category);
                      }
                    }}
                    className="rounded bg-[#0b1320] border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>Upload as modular character sprite component</span>
                </label>
              </div>

              {isModularComponent && (
                <>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Component Category</label>
                    <select
                      value={componentCategory || category || 'hair'}
                      onChange={(e) => {
                        const next = e.target.value;
                        setComponentCategory(next);
                        setCategory(next);
                        setAssetType('CHARACTER');
                      }}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      {listCharacterComponentCategories().map((component) => (
                        <option key={component} value={component}>
                          {CHARACTER_COMPONENT_CATEGORIES[component].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Body Layer</label>
                    <select
                      value={componentLayer || inferCharacterComponentLayerSlot(componentCategory || category || 'other') || 'full-body'}
                      onChange={(e) => setComponentLayer(e.target.value)}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      {['head', 'torso', 'legs', 'feet', 'accessory', 'full-body'].map((layer) => (
                        <option key={layer} value={layer}>
                          {layer.replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Variant / Family</label>
                    <input
                      type="text"
                      value={variantFamily}
                      onChange={(e) => setVariantFamily(e.target.value)}
                      placeholder="e.g. Long Hair, Red, Wizard Hat"
                      className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                    />
                  </div>

                  {/* Compositing Rules — how this layer stacks/interacts with other modular components */}
                  <div className="col-span-2 border-t border-slate-800 pt-2 mt-1 space-y-2">
                    <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wide">Compositing Rules</div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Z-Order (draw order)</label>
                        <input
                          type="number"
                          value={zOrderHint}
                          onChange={(e) => setZOrderHint(e.target.value)}
                          placeholder={String(getDefaultZOrderHint(componentCategory || category || 'other') ?? 'auto')}
                          className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Base Body Type</label>
                        <select
                          value={baseBodyType}
                          onChange={(e) => setBaseBodyType(e.target.value)}
                          className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                        >
                          <option value="">Unspecified / Any</option>
                          {listCharacterBaseBodyTypes()
                            .filter((bodyType) => bodyType !== 'unspecified')
                            .map((bodyType) => (
                              <option key={bodyType} value={bodyType}>
                                {bodyType.charAt(0).toUpperCase() + bodyType.slice(1)}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Hides these layers when equipped</label>
                      <div className="flex flex-wrap gap-2">
                        {listCharacterComponentCategories()
                          .filter((c) => c !== (componentCategory || category))
                          .map((c) => (
                            <label
                              key={c}
                              className="flex items-center gap-1 text-[10px] text-slate-300 bg-[#0b1320] border border-slate-700 rounded px-2 py-1 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={hidesComponents.includes(c)}
                                onChange={(e) => {
                                  setHidesComponents((prev) =>
                                    e.target.checked ? [...prev, c] : prev.filter((v) => v !== c)
                                  );
                                }}
                                className="rounded bg-[#0b1320] border-slate-700 text-amber-500 focus:ring-0"
                              />
                              {CHARACTER_COMPONENT_CATEGORIES[c].label}
                            </label>
                          ))}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">e.g. a closed helm hides Hair, Hat, Head Accessory.</div>
                    </div>

                    {bodyTypeWarning && (
                      <div className="flex items-start gap-1.5 bg-amber-950/40 border border-amber-500/40 rounded px-2 py-1.5 text-[10px] text-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{bodyTypeWarning}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Import Profile</label>
                <select
                  value={importProfile}
                  onChange={(e) => {
                    const nextProfile = e.target.value as AssetImportProfileId | '';
                    setImportProfile(nextProfile);
                    if (!nextProfile) {
                      setSlotRole('');
                      return;
                    }

                    const inferredType = inferTypeForProfile(nextProfile);
                    setAssetType(inferredType);
                    const nextRole = getDefaultSlotRole(nextProfile);
                    setSlotRole(nextRole);

                    if (!category.trim()) {
                      const inferredCategory = inferCategoryForRole(nextRole);
                      if (inferredCategory) {
                        setCategory(inferredCategory);
                      }
                    }
                  }}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="">None (legacy/manual)</option>
                  {listAssetImportProfiles().map((profile) => (
                    <option key={profile} value={profile}>
                      {ASSET_IMPORT_PROFILE_META[profile].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Slot Role</label>
                <select
                  value={slotRole}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setSlotRole(nextRole);
                    if (nextRole && !category.trim()) {
                      const inferredCategory = inferCategoryForRole(nextRole);
                      if (inferredCategory) {
                        setCategory(inferredCategory);
                      }
                    }
                  }}
                  disabled={!importProfile}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs disabled:opacity-50"
                >
                  {!importProfile && <option value="">Select profile first</option>}
                  {importProfile &&
                    listSlotRolesForProfile(importProfile).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Asset Classification</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Category / Sub-type</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. vegetation, prop, weapon"
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                />
              </div>

              <div className="col-span-2 text-[10px] text-slate-500">
                {importProfile && slotRole && isValidSlotRole(importProfile, slotRole)
                  ? `Mapped role ${slotRole} under ${ASSET_IMPORT_PROFILE_META[importProfile].label}.`
                  : 'Profile-role mapping is optional; leave blank for legacy freeform uploads.'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Search Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. nature, forest, decor, large"
                className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Visibility Level (Bible 35 §7)</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="COMMUNITY">🌐 Community (Shared)</option>
                  <option value="PUBLIC">⭐ Public (Universal)</option>
                  <option value="PROJECT">📁 Project / Realm Only</option>
                  <option value="PERSONAL">🔒 Personal (Private)</option>
                </select>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={createUsable}
                    onChange={(e) => setCreateUsable(e.target.checked)}
                    className="rounded bg-[#0b1320] border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>Create usable library entry</span>
                </label>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded p-2 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className={`w-full py-2 rounded font-bold flex items-center justify-center gap-2 transition-all ${
              isUploading || !selectedFile
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)]'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Ingesting Asset...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Ingest Asset to Catalog
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
