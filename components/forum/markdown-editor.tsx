"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  draftKey?: string;
  isNews?: boolean;
  name?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, draftKey, isNews = false, name }: MarkdownEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Load draft on mount
  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    if (draftKey && !value) {
      const saved = localStorage.getItem(`draft_${draftKey}`);
      if (saved) {
        onChange(saved);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]); // only run once on mount for the given key

  // Save draft on change
  useEffect(() => {
    if (mounted && draftKey) {
      const timer = setTimeout(() => {
        if (value.trim()) {
          localStorage.setItem(`draft_${draftKey}`, value);
        } else {
          localStorage.removeItem(`draft_${draftKey}`);
        }
      }, 1000); // Debounce save by 1 second
      return () => clearTimeout(timer);
    }
  }, [value, draftKey, mounted]);

  const insertText = (before: string, after: string = "") => {
    // A more advanced implementation would use a ref to get the cursor position
    // and insert at cursor. For now, we append to the end if nothing is selected.
    onChange(value + before + after);
  };

  const handleEnhance = async (intent: 'grammar' | 'polish') => {
    if (!value.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, intent, isNews })
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let newText = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        newText += decoder.decode(chunk, { stream: true });
        onChange(newText);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to enhance text.");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="border border-border/50 rounded-md overflow-hidden bg-background focus-within:ring-1 focus-within:ring-ring">
      <div className="flex items-center gap-1 border-b border-border/50 bg-muted/30 p-1 flex-wrap">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertText("**", "**")} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertText("*", "*")} title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border/50 mx-1" />
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertText("[", "](url)")} title="Link">
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertText("\n> ")} title="Quote">
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertText("\n- ")} title="Bulleted List">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertText("\n1. ")} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertText("![alt text](", "url)")} title="Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="h-8 px-2 text-xs border-primary/20 text-primary hover:bg-primary/10 gap-1" 
          onClick={() => handleEnhance('grammar')}
          disabled={isEnhancing || !value.trim()}
          title="Fix Grammar & Spelling"
        >
          <Sparkles className="h-3 w-3" /> Grammar Check
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="h-8 px-2 text-xs border-primary/20 text-primary hover:bg-primary/10 gap-1" 
          onClick={() => handleEnhance('polish')}
          disabled={isEnhancing || !value.trim()}
          title="Improve Flow & Vocabulary"
        >
          <Wand2 className="h-3 w-3" /> AI Polish
        </Button>
      </div>
      
      <Tabs defaultValue="write" className="w-full">
        <div className="px-2 pt-2 border-b border-border/30 bg-muted/10 flex justify-end">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="text-xs px-3">Write</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-3">Preview</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="write" className="p-0 m-0 border-none outline-none">
          <Textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Type your markdown here..."}
            className="min-h-[250px] border-none focus-visible:ring-0 rounded-none resize-y p-4 bg-transparent"
          />
        </TabsContent>
        
        <TabsContent value="preview" className="p-4 m-0 min-h-[250px] prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50">
          {value ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
