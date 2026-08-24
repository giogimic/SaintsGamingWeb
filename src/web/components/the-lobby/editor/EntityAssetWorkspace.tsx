import React, { useState } from 'react';
import { GameAssetItem } from '@/engine/assets/AssetManager';
import { RoleAwareAssetPicker } from '@/web/components/shared/RoleAwareAssetPicker';
import { CanonicalAssetPreview } from '@/web/components/shared/CanonicalAssetPreview';
import { listSlotRolesForProfile, AssetImportProfileId } from '@/shared/game/assetImportProfiles';

export interface EntityAssetWorkspaceProps {
  entityType: 'CHARACTER' | 'CREATURE' | 'MONSTER';
  profileId: AssetImportProfileId;
}

export function EntityAssetWorkspace({ entityType, profileId }: EntityAssetWorkspaceProps) {
  const [assignedAssets, setAssignedAssets] = useState<Record<string, GameAssetItem>>({});
  const [activePickerRole, setActivePickerRole] = useState<string | null>(null);

  const roles = listSlotRolesForProfile(profileId);

  return (
    <div className="flex h-full bg-slate-950 text-white">
      {/* Sidebar: Role Slots */}
      <div className="w-64 border-r border-slate-800 bg-slate-900 p-4 overflow-y-auto">
        <h2 className="text-sm font-bold text-slate-300 mb-4">{entityType} ASSETS</h2>
        <div className="space-y-2">
          {roles.map((role) => {
            const asset = assignedAssets[role];
            return (
              <button
                key={role}
                onClick={() => setActivePickerRole(role)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  activePickerRole === role
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-400 capitalize">{role}</div>
                {asset ? (
                  <div className="text-sm font-semibold truncate text-emerald-400 mt-1">
                    {asset.metadata?.originalName || asset.id}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 mt-1 italic">Empty Slot</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Picker or Preview */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activePickerRole ? (
          <div className="flex-1">
            <RoleAwareAssetPicker
              entityType={entityType}
              assetRole={activePickerRole}
              onSelectAsset={(asset) => {
                setAssignedAssets((prev) => ({ ...prev, [activePickerRole]: asset }));
                setActivePickerRole(null);
              }}
              onCancel={() => setActivePickerRole(null)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-64 h-64 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <CanonicalAssetPreview
                asset={assignedAssets[roles[0]] || Object.values(assignedAssets)[0]}
                role={roles[0]}
              />
            </div>
            <div className="max-w-sm">
              <h3 className="text-lg font-bold text-slate-200">Entity Assembler</h3>
              <p className="text-sm text-slate-400 mt-2">
                Select a slot on the left to assign assets. This builder validates canonical roles according to the {profileId} taxonomy.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
