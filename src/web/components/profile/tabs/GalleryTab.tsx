"use client";

import Image from "next/image";

export function GalleryTab({ images }: { images: any[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-card hover:border-[rgb(var(--profile-accent))]/50 transition-all">
            <Image src={img.url} alt="Gallery image" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
