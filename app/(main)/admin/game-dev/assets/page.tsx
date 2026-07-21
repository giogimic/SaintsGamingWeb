'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Upload, Trash2, Tag, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { createGameAsset, deleteGameAsset, fetchAllGameAssets } from '@/app/actions/game-dev';

const CATEGORIES = ['Terrain', 'Monsters/Beasts', 'NPCs', 'Items', 'Environment'];

export default function AssetStudioPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [uploadCategory, setUploadCategory] = useState<string>('Terrain');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = async () => {
    setLoading(true);
    const res = await fetchAllGameAssets();
    if (res.success) {
      setAssets(res.data);
    } else {
      toast.error('Failed to load assets.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        
        const res = await createGameAsset({
          name: nameWithoutExt,
          category: uploadCategory,
          filePath: base64,
          width: 16,
          height: 16,
        });

        if (res.success) {
          count++;
          if (count === files.length) {
            toast.success(`Imported ${count} assets into ${uploadCategory}!`);
            loadAssets();
          }
        }
      };

      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete asset "${name}"?`)) return;
    const res = await deleteGameAsset(id);
    if (res.success) {
      toast.success('Asset deleted.');
      loadAssets();
    } else {
      toast.error('Failed to delete asset.');
    }
  };

  const filteredAssets = selectedCategoryFilter === 'ALL'
    ? assets
    : assets.filter(a => a.category === selectedCategoryFilter);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <ImageIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Pixel Art Asset Studio</h1>
          <p className="text-muted-foreground">Mass import and classify 16x16 / 32x32 tiles, sprites, and environmental graphics.</p>
        </div>
      </div>

      {/* Upload Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-card/80 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Mass Asset Importer
          </CardTitle>
          <CardDescription>Select target asset category and batch upload your 16x16 PNG pixel art files.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <Button
                  key={cat}
                  type="button"
                  variant={uploadCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={handleBatchUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} size="lg" className="gap-2">
              <Upload className="h-4 w-4" /> Batch Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Asset Repository */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Asset Registry ({filteredAssets.length})</CardTitle>
            <CardDescription>Categorized pixel art library ready for Map Editor & Game inclusion.</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={selectedCategoryFilter === 'ALL' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategoryFilter('ALL')}
            >
              All ({assets.length})
            </Button>
            {CATEGORIES.map(cat => {
              const count = assets.filter(a => a.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant={selectedCategoryFilter === cat ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategoryFilter(cat)}
                >
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading asset library...</p>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No assets registered in this category</p>
              <p className="text-xs text-muted-foreground mt-1">Batch upload PNG files using the importer above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="group relative p-3 rounded-xl border border-border/60 bg-background/60 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors">
                  <div className="w-16 h-16 rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center p-2 overflow-hidden">
                    {/* Render pixel art sprite scaled */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={asset.filePath} 
                      alt={asset.name} 
                      className="w-12 h-12 object-contain pixelated" 
                    />
                  </div>

                  <div className="w-full text-center">
                    <p className="font-bold text-xs truncate" title={asset.name}>{asset.name}</p>
                    <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0 bg-muted/50">
                      {asset.category}
                    </Badge>
                  </div>

                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => handleDelete(asset.id, asset.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
