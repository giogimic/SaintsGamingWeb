"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Cover Image" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      onChange(data.url);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      
      <div className="flex items-start gap-4">
        {/* Preview Area */}
        <div className="relative w-32 h-32 rounded-lg border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center overflow-hidden shrink-0 group">
          {value ? (
            <>
              <Image src={value} alt="Preview" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  onClick={() => onChange(null)}
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : isUploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : value ? "Replace Image" : "Upload Image"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Max size: 5MB. Formats: JPEG, PNG, GIF, WebP.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
