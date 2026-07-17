"use client";

import { useState, useEffect } from "react";
import { 
  getBookmarkFolders, 
  createBookmarkFolder, 
  deleteBookmarkFolder, 
  getBookmarksWithFolders, 
  moveBookmarkToFolder 
} from "@/app/actions/social-folders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Bookmark, Heart, MessageSquare, FolderPlus, Folder, 
  Trash2, Loader2, Search, X, MoreVertical 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

type BookmarkFolder = {
  id: string;
  name: string;
  color: string;
  _count: { bookmarks: number };
};

const FOLDER_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4"
];

export default function BookmarksRepository() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = all
  const [searchQuery, setSearchQuery] = useState("");

  // Create folder state
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Move bookmark state
  const [movingBookmarkId, setMovingBookmarkId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [folderList, bookmarkList] = await Promise.all([
        getBookmarkFolders(),
        getBookmarksWithFolders(activeFolder)
      ]);
      setFolders(folderList);
      setBookmarks(bookmarkList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder]);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    try {
      await createBookmarkFolder(newFolderName, newFolderColor);
      setNewFolderName("");
      setShowCreate(false);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm("Delete this folder? Bookmarks inside will be moved to All Bookmarks.")) return;
    try {
      await deleteBookmarkFolder(folderId);
      if (activeFolder === folderId) setActiveFolder(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMoveBookmark(bookmarkId: string, folderId: string | null) {
    try {
      await moveBookmarkToFolder(bookmarkId, folderId);
      setMovingBookmarkId(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  const filteredBookmarks = searchQuery.trim()
    ? bookmarks.filter(b => b.post.body.toLowerCase().includes(searchQuery.toLowerCase()))
    : bookmarks;

  const renderBody = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return <span key={i} className="text-primary font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-full px-4 md:px-8 py-8 xl:px-12 animate-in fade-in">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/profile"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Profile</Link>
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bookmark className="w-8 h-8 text-yellow-500" />
          Bookmarks Repository
        </h1>
        <p className="text-muted-foreground mt-1">Organize your saved posts into folders.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Folder Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {/* All Bookmarks */}
          <button
            onClick={() => setActiveFolder(null)}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
              activeFolder === null
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-card border border-border/50 hover:border-primary/30 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              <span className="font-semibold text-sm">All Bookmarks</span>
            </div>
          </button>

          {/* User folders */}
          {folders.map(folder => (
            <div
              key={folder.id}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors group ${
                activeFolder === folder.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-card border border-border/50 hover:border-primary/30'
              }`}
            >
              <button
                onClick={() => setActiveFolder(folder.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <Folder className="w-4 h-4" style={{ color: folder.color }} />
                <span className="font-semibold text-sm truncate">{folder.name}</span>
                <span className="text-xs text-muted-foreground ml-auto mr-2">{folder._count.bookmarks}</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Create folder */}
          {showCreate ? (
            <form onSubmit={handleCreateFolder} className="p-3 bg-card border border-border/50 rounded-lg space-y-2">
              <Input
                placeholder="Folder name..."
                className="text-sm h-8"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                maxLength={50}
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewFolderColor(color)}
                    className={`w-5 h-5 rounded-full transition-all ${
                      newFolderColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                <Button type="submit" size="sm" disabled={isCreating || !newFolderName.trim()} className="flex-1">
                  {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors text-sm"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          )}
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bookmarked posts..."
              className="pl-10 pr-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center p-12 bg-muted/10 rounded-2xl border border-border/50 border-dashed">
              <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-20 text-yellow-500" />
              <p className="text-muted-foreground font-medium">
                {searchQuery ? "No bookmarks match your search." : activeFolder ? "This folder is empty." : "You haven't bookmarked any posts yet."}
              </p>
            </div>
          ) : (
            filteredBookmarks.map(b => {
              const post = b.post;
              return (
                <div key={b.id} className="flex gap-4 p-4 border border-border/50 rounded-xl bg-card hover:bg-muted/5 transition-colors shadow-sm relative group">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative shrink-0">
                    {post.author?.image ? (
                      <Image src={post.author.image} alt={post.author.username} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground bg-muted">
                        {post.author?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold truncate">{post.author?.username}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>

                      {/* Move to folder */}
                      <div className="ml-auto relative">
                        <button
                          onClick={() => setMovingBookmarkId(movingBookmarkId === b.id ? null : b.id)}
                          className="p-1 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {movingBookmarkId === b.id && (
                          <div className="absolute right-0 top-8 z-50 w-48 bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in slide-in-from-top-2">
                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Move to folder</div>
                            <button
                              onClick={() => handleMoveBookmark(b.id, null)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                            >
                              <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                              Unfiled
                            </button>
                            {folders.map(f => (
                              <button
                                key={f.id}
                                onClick={() => handleMoveBookmark(b.id, f.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                              >
                                <Folder className="w-3.5 h-3.5" style={{ color: f.color }} />
                                {f.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed mb-3" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {renderBody(post.body)}
                    </p>
                    
                    {post.mediaUrl && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-border/50 bg-black flex items-center justify-center max-h-[200px] relative">
                        {post.mediaUrl.endsWith(".mp4") || post.mediaUrl.endsWith(".webm") ? (
                          <video src={post.mediaUrl} className="max-h-[200px] w-auto max-w-full opacity-80" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.mediaUrl} alt="Attachment" className="max-h-[200px] w-auto max-w-full object-contain" />
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Heart className="w-4 h-4" />
                        {post._count?.reactions > 0 && post._count.reactions}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <MessageSquare className="w-4 h-4" />
                        {post._count?.replies > 0 && post._count.replies}
                      </div>
                      <Button variant="ghost" size="sm" asChild className="ml-auto h-8 px-2">
                        <Link href={`/profile/inbox?post=${post.id}`}>View Post</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
