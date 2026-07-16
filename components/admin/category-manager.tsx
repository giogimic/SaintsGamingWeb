"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Folder, Hash, 
  Edit2, Trash2, Lock,
  ChevronDown, ChevronUp, Save, X, ShieldAlert
} from "lucide-react";
import type { ForumCategory, SubCategory } from "@prisma/client";
import { PERMISSION_LEVELS } from "@/lib/permissions";

type CategoryWithSubs = ForumCategory & { subcategories: SubCategory[] };

export function CategoryManager({ initialCategories, userPermissionLevel }: { initialCategories: CategoryWithSubs[], userPermissionLevel: number }) {
  const router = useRouter();
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null); // For adding subs
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ForumCategory | SubCategory>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/admin/forum/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, order: initialCategories.length }),
      });
      if (res.ok) {
        setNewCatName("");
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setIsSaving(true);
    
    const cat = initialCategories.find(c => c.id === categoryId);
    const order = cat?.subcategories.length || 0;

    try {
      const res = await fetch("/api/admin/forum/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubName, categoryId, order }),
      });
      if (res.ok) {
        setNewSubName("");
        setActiveCategoryId(null);
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, type: "category" | "subcategory") => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;
    
    setIsSaving(true);
    try {
      const endpoint = type === "category" ? "categories" : "subcategories";
      const res = await fetch(`/api/admin/forum/${endpoint}?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (id: string, type: "category" | "subcategory") => {
    setIsSaving(true);
    try {
      const endpoint = type === "category" ? "categories" : "subcategories";
      const res = await fetch(`/api/admin/forum/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        alert("Failed to update.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (item: any  ) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || "",
      isLocked: item.isLocked,
      reqWriter: item.reqWriter || false,
      reqVIP: item.reqVIP || false,
      reqFounder: item.reqFounder || false,
      reqTrusted: item.reqTrusted || false,
    });
  };

  // Move Up / Move Down helper (to be fully implemented in backend later, currently just basic UI scaffold)
  const handleMove = async (_id: string, _direction: "up" | "down", _type: "category" | "subcategory") => {
    alert("Reordering functionality is coming soon.");
  };

  return (
    <div className="space-y-8">
      {/* Categories List */}
      <div className="space-y-4">
        {initialCategories.map((category) => (
          <div key={category.id} className="border border-border/50 rounded-lg bg-background overflow-hidden">
            
            {/* Category Header */}
            {editingId === category.id ? (
              <div className="bg-muted/50 p-4 border-b border-border/50 space-y-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input 
                    value={editForm.name || ""} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={editForm.description || ""} 
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={editForm.isLocked} 
                    onCheckedChange={c => setEditForm({ ...editForm, isLocked: c })} 
                  />
                  <Label>Locked (Prevents new posts)</Label>
                </div>
                
                {userPermissionLevel >= PERMISSION_LEVELS.HEAD_MODERATOR && (
                  <div className="pt-4 border-t border-border/50 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-500">
                      <ShieldAlert className="h-4 w-4" /> Tick Restrictions (Private Board)
                    </h4>
                    <p className="text-xs text-muted-foreground">If any are enabled, users must have at least one required tick to view this category.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch checked={editForm.reqWriter} onCheckedChange={c => setEditForm({ ...editForm, reqWriter: c })} />
                        <Label>Requires Writer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={editForm.reqVIP} onCheckedChange={c => setEditForm({ ...editForm, reqVIP: c })} />
                        <Label>Requires VIP</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={editForm.reqFounder} onCheckedChange={c => setEditForm({ ...editForm, reqFounder: c })} />
                        <Label>Requires Founder</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={editForm.reqTrusted} onCheckedChange={c => setEditForm({ ...editForm, reqTrusted: c })} />
                        <Label>Requires Trusted</Label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-2"/> Cancel</Button>
                  <Button onClick={() => handleEditSubmit(category.id, "category")} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2"/> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleMove(category.id, "up", "category")} className="text-muted-foreground hover:text-primary"><ChevronUp className="h-4 w-4"/></button>
                    <button onClick={() => handleMove(category.id, "down", "category")} className="text-muted-foreground hover:text-primary"><ChevronDown className="h-4 w-4"/></button>
                  </div>
                  <Folder className="h-5 w-5 text-primary" />
                  <span className="font-semibold flex items-center gap-2">
                    {category.name}
                    {category.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEditing(category)}>
                    <Edit2 className="h-4 w-4 text-blue-400" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id, "category")}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                  <Button variant="outline" size="sm" className="ml-2" onClick={() => setActiveCategoryId(category.id)}>
                    <Plus className="h-4 w-4 mr-2" /> Board
                  </Button>
                </div>
              </div>
            )}
            
            {/* Add Subcategory Inline Form */}
            {activeCategoryId === category.id && (
              <div className="p-4 bg-muted/20 border-b border-border/50">
                <form onSubmit={(e) => handleAddSubcategory(e, category.id)} className="flex gap-2">
                  <Input 
                    placeholder="New Board Name..." 
                    value={newSubName} 
                    onChange={(e) => setNewSubName(e.target.value)} 
                    disabled={isSaving}
                  />
                  <Button type="submit" disabled={isSaving}>Add</Button>
                  <Button type="button" variant="ghost" onClick={() => setActiveCategoryId(null)}>Cancel</Button>
                </form>
              </div>
            )}

            {/* Subcategories List */}
            <div className="divide-y divide-border/30">
              {category.subcategories.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No boards in this category.</div>
              ) : (
                category.subcategories.map((sub) => (
                  <div key={sub.id} className="p-3 pl-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                    
                    {editingId === sub.id ? (
                      <div className="w-full space-y-4 py-2">
                        <div className="grid gap-2">
                          <Label>Board Name</Label>
                          <Input 
                            value={editForm.name || ""} 
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea 
                            value={editForm.description || ""} 
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={editForm.isLocked} 
                            onCheckedChange={c => setEditForm({ ...editForm, isLocked: c })} 
                          />
                          <Label>Locked (Read-only)</Label>
                        </div>

                        {userPermissionLevel >= PERMISSION_LEVELS.HEAD_MODERATOR && (
                          <div className="pt-4 border-t border-border/50 space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-500">
                              <ShieldAlert className="h-4 w-4" /> Tick Restrictions (Private Subcategory)
                            </h4>
                            <p className="text-xs text-muted-foreground">If any are enabled, users must have at least one required tick to view this board.</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="flex items-center space-x-2">
                                <Switch checked={editForm.reqWriter} onCheckedChange={c => setEditForm({ ...editForm, reqWriter: c })} />
                                <Label className="text-xs">Writer</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch checked={editForm.reqVIP} onCheckedChange={c => setEditForm({ ...editForm, reqVIP: c })} />
                                <Label className="text-xs">VIP</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch checked={editForm.reqFounder} onCheckedChange={c => setEditForm({ ...editForm, reqFounder: c })} />
                                <Label className="text-xs">Founder</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch checked={editForm.reqTrusted} onCheckedChange={c => setEditForm({ ...editForm, reqTrusted: c })} />
                                <Label className="text-xs">Trusted</Label>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => handleEditSubmit(sub.id, "subcategory")} disabled={isSaving}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => handleMove(sub.id, "up", "subcategory")} className="text-muted-foreground/50 hover:text-primary"><ChevronUp className="h-3 w-3"/></button>
                            <button onClick={() => handleMove(sub.id, "down", "subcategory")} className="text-muted-foreground/50 hover:text-primary"><ChevronDown className="h-3 w-3"/></button>
                          </div>
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium flex items-center gap-2">
                              {sub.name}
                              {sub.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                            </span>
                            {sub.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{sub.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(sub)}>
                            <Edit2 className="h-3 w-3 text-blue-400" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(sub.id, "subcategory")}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="flex items-end gap-3 p-4 border border-border/40 rounded-lg bg-card/30">
        <div className="grid gap-2 flex-1">
          <Label htmlFor="catName">Add New Category</Label>
          <Input 
            id="catName" 
            placeholder="e.g. General Discussion" 
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <Button type="submit" disabled={isSaving || !newCatName.trim()}>
          <Plus className="h-4 w-4 mr-2" /> Category
        </Button>
      </form>
    </div>
  );
}
