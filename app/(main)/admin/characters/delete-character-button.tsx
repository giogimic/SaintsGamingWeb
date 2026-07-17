"use client";

import { Button } from "@/components/ui/button";
import { deleteCharacter } from "./actions";

export function DeleteCharacterButton({ characterId }: { characterId: string }) {
  return (
    <form action={deleteCharacter.bind(null, characterId)}>
      <Button 
        variant="destructive" 
        size="sm" 
        type="submit" 
        onClick={(e) => {
          if (!confirm("Are you sure you want to delete this character? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </Button>
    </form>
  );
}
