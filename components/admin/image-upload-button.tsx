"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";

interface ImageUploadButtonProps {
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ImageUploadButton({ onUploadComplete, onError, className }: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      const data = await res.json();
      onUploadComplete(data.url);
    } catch (err: unknown) {
      if (onError) onError((err instanceof Error ? err.message : "Unknown error"));
      else alert((err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4 mr-2" />
        )}
        {isUploading ? "Uploading..." : "Upload Image"}
      </Button>
    </div>
  );
}
