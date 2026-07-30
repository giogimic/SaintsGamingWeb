import React from 'react';
import { useGameStore } from './store';
import { Users, Crown } from 'lucide-react';

export default function PartyUI() {
  const party = useGameStore((state) => state.player.party);
  const isPartyLeader = useGameStore((state) => state.player.isPartyLeader);
  const showToast = useGameStore((state) => state.showToast);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);

  const handleCreateParty = () => {
    if (emitSocketEvent) {
      emitSocketEvent('create_party', {});
      showToast('Party created!');
    }
  };

  const handleLeaveParty = () => {
    if (emitSocketEvent) {
      emitSocketEvent('leave_party', {});
      showToast('You left the party');
    }
  };

  if (party.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Party</h3>
        </div>
        <button
          onClick={handleCreateParty}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
        >
          Create Party
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Party</h3>
        </div>
        <button
          onClick={handleLeaveParty}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          Leave
        </button>
      </div>

      <div className="space-y-2">
        {party.map((member, index) => (
          <div
            key={member.userId}
            className="flex items-center gap-2 bg-gray-700 rounded px-3 py-2"
          >
            <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
              <span className="text-xs">{member.spriteId}</span>
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium flex items-center gap-1">
                {member.name}
                {index === 0 && isPartyLeader && (
                  <Crown className="w-3 h-3 text-yellow-400" />
                )}
              </div>
              <div className="text-gray-400 text-xs">
                Pos: ({member.position.x}, {member.position.y})
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-400">
        {party.length}/4 members
      </div>
    </div>
  );
}
