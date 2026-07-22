"use client";

/**
 * DialogueBox — displays NPC dialogue with typewriter effect
 */
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/game/store";

export default function DialogueBox() {
  const dialogue = useGameStore((s) => s.dialogue);
  const advanceDialogue = useGameStore((s) => s.advanceDialogue);
  const phase = useGameStore((s) => s.phase);

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!dialogue) return;

    const currentLine = dialogue.lines[dialogue.currentLine] || "";
    setIsTyping(true);
    setDisplayedText("");

    let index = 0;
    const interval = setInterval(() => {
      if (index < currentLine.length) {
        setDisplayedText(currentLine.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [dialogue?.currentLine]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (phase !== "dialogue" || !dialogue) return;

      if (e.key === "Enter" || e.key === "z") {
        e.preventDefault();
        if (isTyping) {
          // Skip typing animation
          setDisplayedText(dialogue.lines[dialogue.currentLine] || "");
          setIsTyping(false);
        } else {
          advanceDialogue();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [phase, dialogue, isTyping, advanceDialogue]);

  if (phase !== "dialogue" || !dialogue) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-8 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="bg-gray-900/95 backdrop-blur-sm border-4 border-gray-700 rounded-lg p-6 shadow-2xl">
          {/* NPC name */}
          <div className="text-blue-400 font-bold text-lg mb-2">
            {dialogue.npcName}
          </div>

          {/* Dialogue text */}
          <div className="text-white text-xl min-h-[80px] flex items-center">
            {displayedText}
            {isTyping && <span className="animate-pulse">▊</span>}
          </div>

          {/* Continue indicator */}
          {!isTyping && (
            <div className="text-right text-gray-400 text-sm mt-2 animate-pulse">
              Press Enter to continue ▼
            </div>
          )}
        </div>
      </div>
    </div>
  );
}