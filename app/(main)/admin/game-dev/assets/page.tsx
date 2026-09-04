'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Badge } from '@/web/components/ui/badge';
import { Input } from '@/web/components/ui/input';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Tag, 
  Layers, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  FileQuestion
} from 'lucide-react';
import { toast } from 'sonner';
import { createGameAsset, deleteGameAsset, fetchAllGameAssets } from '@/app/actions/admin/game-dev';

const CATEGORIES = ['Terrain', 'Monsters/Beasts', 'NPCs', 'Items', 'Environment'];
const ITEMS_PER_PAGE = 48;

export default function AssetStudioPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [uploadCategory, setUploadCategory] = useState<string>('Terrain');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
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

  const handleImageError = (id: string) => {
    setFailedImages((prev) => new Set(prev).add(id));
  };

  // Filter and search
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCat = selectedCategoryFilter === 'ALL' || asset.category === selectedCategoryFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        asset.name.toLowerCase().includes(query) || 
        asset.id.toLowerCase().includes(query) ||
        (asset.type && asset.type.toLowerCase().includes(query));
      return matchesCat && matchesSearch;
    });
  }, [assets, selectedCategoryFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_PAGE));
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAssets, currentPage]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">World &amp; MMO</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Pixel Art Repository</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <ImageIcon className="h-8 w-8 text-primary" />
            Pixel Art &amp; Asset Studio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Batch import, classify, and preview 16x16 / 32x32 pixel art tiles, creature sprites, and terrain decor.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-primary/10 border-primary/30 text-primary">
          {assets.length} Assets Registered
        </Badge>
      </div>

      {/* Upload Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-card/80 to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5 text-primary" /> Mass Asset Importer
          </CardTitle>
          <CardDescription>Select target asset category and batch upload your 16x16 PNG pixel art files.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <Button
                  key={cat}
                  type="button"
                  variant={uploadCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadCategory(cat)}
                  className="text-xs"
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
            <Button onClick={() => fileInputRef.current?.click()} size="default" className="gap-2 font-semibold">
              <Upload className="h-4 w-4" /> Batch Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Asset Repository */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-4 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Asset Registry ({filteredAssets.length})
              </CardTitle>
              <CardDescription>Categorized pixel art library ready for Map Editor & Game inclusion.</CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Button
              variant={selectedCategoryFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedCategoryFilter('ALL')}
            >
              All ({assets.length})
            </Button>
            {CATEGORIES.map(cat => {
              const count = assets.filter(a => a.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant={selectedCategoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedCategoryFilter(cat)}
                >
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground animate-pulse">Loading asset library...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No assets match your search or filter</p>
              <p className="text-xs text-muted-foreground mt-1">Try changing the category or batch uploading new PNGs.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {paginatedAssets.map(asset => {
                  const isImageFailed = failedImages.has(asset.id) || !asset.filePath;

                  return (
                    <div 
                      key={asset.id} 
                      className="group relative p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 flex flex-col items-center gap-2 hover:border-primary/50 transition-all hover:shadow-md"
                    >
                      <div className="w-16 h-16 rounded-lg bg-zinc-950/80 border border-white/10 flex items-center justify-center p-1.5 overflow-hidden relative">
                        {isImageFailed ? (
                          <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                            <FileQuestion className="h-6 w-6" />
                            <span className="text-[8px] mt-0.5 font-mono uppercase">{asset.type || 'ASSET'}</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={asset.filePath} 
                            alt={asset.name} 
                            className="w-12 h-12 object-contain pixelated transition-transform group-hover:scale-110" 
                            onError={() => handleImageError(asset.id)}
                          />
                        )}
                      </div>

                      <div className="w-full text-center px-0.5">
                        <p className="font-semibold text-xs truncate" title={asset.name}>{asset.name}</p>
                        <Badge variant="outline" className="text-[9px] mt-1 px-1.5 py-0 bg-muted/30 border-border/50 text-muted-foreground">
                          {asset.category}
                        </Badge>
                      </div>

                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" 
                        onClick={() => handleDelete(asset.id, asset.name)}
                        title="Delete asset"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{filteredAssets.length}</span> assets
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 gap-1 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    <span className="text-xs font-mono px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 gap-1 text-xs"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
