"use client";

import { useState, useEffect } from "react";
import { getFriendsList, searchUsers, sendFriendRequest, acceptFriendRequest, removeFriend } from "@/app/actions/messenger";
import { useMessenger } from "./messenger-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Check, X, Search, User as UserIcon } from "lucide-react";
import Image from "next/image";

export function FriendsList() {
  const { setActiveChat } = useMessenger();
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function fetchFriends() {
    try {
      const data = await getFriendsList();
      setFriends(data.friends);
      setRequests(data.requests);
    } catch (e) {
      console.error(e);
    }
  }

  // Poll every 5 seconds
  useEffect(() => {
    fetchFriends();
    const interval = setInterval(fetchFriends, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      setIsSearching(true);
      const delay = setTimeout(async () => {
        try {
          const res = await searchUsers(searchQuery);
          setSearchResults(res);
        } finally {
          setIsSearching(false);
        }
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  async function handleAdd(id: string) {
    try {
      await sendFriendRequest(id);
      alert("Request sent!");
      setSearchQuery("");
      fetchFriends();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleAccept(id: string) {
    try {
      await acceptFriendRequest(id);
      fetchFriends();
    } catch {}
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {searchQuery.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Search Results</h4>
            {isSearching ? (
              <p className="text-xs text-muted-foreground">Searching...</p>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden relative">
                      {u.image ? <Image src={u.image} alt={u.username} fill className="object-cover"/> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium">{u.username}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAdd(u.id)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No users found.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  Requests <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>
                </h4>
                {requests.map(req => (
                  <div key={req.friendshipId} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden relative">
                        {req.user.image ? <Image src={req.user.image} alt={req.user.username} fill className="object-cover"/> : <UserIcon className="h-4 w-4" />}
                      </div>
                      <span className="text-sm font-medium">{req.user.username}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="default" className="h-6 w-6 rounded-full" onClick={() => handleAccept(req.friendshipId)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => removeFriend(req.friendshipId).then(fetchFriends)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Friends</h4>
              {friends.length > 0 ? (
                friends.map(f => (
                  <div 
                    key={f.friendshipId} 
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setActiveChat(f.user)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden relative">
                        {f.user.image ? <Image src={f.user.image} alt={f.user.username} fill className="object-cover"/> : <UserIcon className="h-4 w-4" />}
                      </div>
                      <span className="text-sm font-medium">{f.user.username}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">You have no friends yet. Search to add some!</p>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
