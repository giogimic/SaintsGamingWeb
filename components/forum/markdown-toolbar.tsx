"use client";

import { Button } from "@/components/ui/button";
import { Bold, Italic, Link as LinkIcon, Image as ImageIcon, List, Quote, Code } from "lucide-react";

interface MarkdownToolbarProps {
  textareaId: string;
}

export function MarkdownToolbar({ textareaId }: MarkdownToolbarProps) {
  const insertText = (before: string, after: string = "") => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!el) return;
    
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    
    const replacement = `${before}${selected}${after}`;
    el.setRangeText(replacement, start, end, 'select');
    
    // trigger react onChange
    const event = new Event('input', { bubbles: true });
    el.dispatchEvent(event);
    el.focus();
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-muted/50 border-x border-t border-border/50 rounded-t-md">
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80" onClick={() => insertText("**", "**")} title="Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80" onClick={() => insertText("*", "*")} title="Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80" onClick={() => insertText("[", "](url)")} title="Link">
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80" onClick={() => insertText("![alt text](", ")")} title="Image">
        <ImageIcon className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80" onClick={() => insertText("- ")} title="List">
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80" onClick={() => insertText("> ")} title="Quote">
        <Quote className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80" onClick={() => insertText("```\n", "\n```")} title="Code Block">
        <Code className="h-4 w-4" />
      </Button>
    </div>
  );
}
