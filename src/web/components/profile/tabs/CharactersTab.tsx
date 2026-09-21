"use client";

import { ProfileCharacterDetails } from "@/web/components/profile/ProfileCharacterDetails";
import { Gamepad2 } from "lucide-react";
import Link from "next/link";

export function CharactersTab({ characters, isSelf, profileId }: { characters: any[], isSelf: boolean, profileId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-[rgb(var(--profile-accent))]" />
          Characters
        </h3>
        {isSelf && (
          <Link href="/lobby" className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-md font-semibold text-sm shadow-md transition-all inline-flex items-center gap-2 border border-white/20">
            <Gamepad2 className="w-4 h-4" />
            The Lobby
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {characters.map((char) => (
          <ProfileCharacterDetails
            key={char.id}
            character={char}
            userId={profileId}
            isSelf={isSelf}
          />
        ))}
      </div>
    </div>
  );
}
