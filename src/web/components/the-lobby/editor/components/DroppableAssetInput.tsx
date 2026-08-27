'use client';

import React, { useState, DragEvent } from 'react';
import { clsx } from 'clsx';
import { Image as ImageIcon } from 'lucide-react';

export interface DroppableAssetInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAssetDropped?: (key: string, source: string) => void;
}

export const DroppableAssetInput: React.FC<DroppableAssetInputProps> = ({
  className,
  onAssetDropped,
  ...props
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/json')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      
      if (data.type === 'STUDIO_SPRITE_DROP') {
        if (onAssetDropped) {
          onAssetDropped(data.key, data.source);
        } else if (props.onChange) {
          // Fallback: trigger a synthetic onChange if only value/onChange are provided
          const syntheticEvent = {
            target: { value: data.key, name: props.name },
            currentTarget: { value: data.key, name: props.name }
          } as React.ChangeEvent<HTMLInputElement>;
          props.onChange(syntheticEvent);
        }
      }
    } catch (err) {
      console.warn('Failed to parse dropped asset data:', err);
    }
  };

  return (
    <div
      className="relative flex items-center w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        {...props}
        className={clsx(
          className,
          "w-full transition-all duration-200",
          isDragOver ? "border-amber-500 bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : ""
        )}
      />
      {isDragOver && (
        <div className="absolute right-2 pointer-events-none text-amber-500 animate-pulse">
          <ImageIcon className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
