"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Shield, ShieldAlert, ShieldCheck, UserX, UserCheck, Search, Loader2, Trash2 } from "lucide-react";
import { getRoleName, getRoleColor, canManageUser, canBan, canMute, canPurge, PERMISSION_LEVELS } from "@/lib/permissions";

// Use the Prisma type shape for User
type User = {
  id: string;
  username: string;
  email: string;
  image: string | null;
  permissionLevel: number;
  isBanned: boolean;
  canPostToForum: boolean;
  isWriter: boolean;
  isVIP: boolean;
  isFounder: boolean;
  isTrusted: boolean;
  createdAt: Date;
};

interface UserManagerProps {
  initialUsers: User[];
  currentUserId: string;
  currentUserLevel: number;
  availableRoles: { id: string; name: string; level: number; color: string }[];
}

export function UserManager({ initialUsers, currentUserId, currentUserLevel, availableRoles }: UserManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const filteredUsers = initialUsers.filter(user => 
    user.username.toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = async (userId: string, action: "updateRole" | "toggleBan" | "toggleMute" | "updateTicks" | "setPassword", payload: any   = {}) => {
    setIsLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...payload }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to perform action");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(null);
    }
  };

  const handlePurge = async (userId: string) => {
    if (!confirm("Are you sure? This will delete ALL threads, replies, and reactions by this user and revoke their posting access. This action cannot be undone.")) return;
    
    setIsLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/purge`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to purge user content");
      }
      alert("User content purged successfully. Posting access revoked.");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by username, email, or ID..." 
            className="pl-9 bg-background/50 border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="px-3 py-1.5 h-10 bg-background/50 border-border/50">
          {filteredUsers.length} Users Found
        </Badge>
      </div>

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[250px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const roleColor = getRoleColor(user.permissionLevel);
                const roleName = getRoleName(user.permissionLevel);
                
                // Determine what actions the current user can perform on this target user
                const canModify = user.id !== currentUserId;
                const iCanManage = canManageUser(currentUserLevel, user.permissionLevel);
                const iCanBan = canBan(currentUserLevel, user.permissionLevel);
                const iCanMute = canMute(currentUserLevel, user.permissionLevel);
                const iCanPurge = canPurge(currentUserLevel);
                
                return (
                  <TableRow key={user.id} className={user.isBanned ? "opacity-60 bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.image || ""} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold line-clamp-1">{user.username}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${roleColor} bg-background`}>
                        {roleName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.isWriter && <Badge variant="outline" className="text-[10px] h-5 bg-emerald-950/30 text-emerald-400 border-emerald-900/50">Writer</Badge>}
                        {user.isVIP && <Badge variant="outline" className="text-[10px] h-5 bg-purple-950/30 text-purple-400 border-purple-900/50">VIP</Badge>}
                        {user.isFounder && <Badge variant="outline" className="text-[10px] h-5 bg-yellow-950/30 text-yellow-400 border-yellow-900/50">Founder</Badge>}
                        {user.isTrusted && <Badge variant="outline" className="text-[10px] h-5 bg-blue-950/30 text-blue-400 border-blue-900/50">Trusted</Badge>}
                        {!user.isWriter && !user.isVIP && !user.isFounder && !user.isTrusted && <span className="text-xs text-muted-foreground italic">None</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.isBanned ? (
                          <Badge variant="destructive" className="bg-destructive/20 text-destructive border-transparent w-fit">
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500 w-fit">
                            Active
                          </Badge>
                        )}
                        {!user.canPostToForum && !user.isBanned && (
                          <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-500 w-fit mt-1">
                            Muted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading === user.id} />}>
                          {isLoading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          
                          {canModify ? (
                            <>
                              {iCanManage && (
                                <>
                                  {availableRoles
                                    .filter(role => role.level <= currentUserLevel && role.level !== user.permissionLevel)
                                    .map(role => (
                                      <DropdownMenuItem key={role.id} onClick={() => handleAction(user.id, "updateRole", { roleLevel: role.level })}>
                                        <Shield className={`mr-2 h-4 w-4 ${role.color}`} /> Set to {role.name}
                                      </DropdownMenuItem>
                                    ))}
                                  
                                  {currentUserLevel >= PERMISSION_LEVELS.ADMIN && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleAction(user.id, "updateTicks", { ticks: { ...user, isWriter: !user.isWriter } })}>
                                        <ShieldCheck className="mr-2 h-4 w-4 text-emerald-400" /> Toggle Writer
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleAction(user.id, "updateTicks", { ticks: { ...user, isVIP: !user.isVIP } })}>
                                        <ShieldCheck className="mr-2 h-4 w-4 text-purple-400" /> Toggle VIP
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleAction(user.id, "updateTicks", { ticks: { ...user, isFounder: !user.isFounder } })}>
                                        <ShieldCheck className="mr-2 h-4 w-4 text-yellow-400" /> Toggle Founder
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleAction(user.id, "updateTicks", { ticks: { ...user, isTrusted: !user.isTrusted } })}>
                                        <ShieldCheck className="mr-2 h-4 w-4 text-blue-400" /> Toggle Trusted
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              {iCanMute && (
                                <DropdownMenuItem 
                                  onClick={() => handleAction(user.id, "toggleMute")}
                                  className={user.canPostToForum ? "text-orange-500 focus:bg-orange-500/10 focus:text-orange-500" : "text-green-500 focus:bg-green-500/10 focus:text-green-500"}
                                >
                                  {user.canPostToForum ? (
                                    <><UserX className="mr-2 h-4 w-4" /> Mute on Forum</>
                                  ) : (
                                    <><UserCheck className="mr-2 h-4 w-4" /> Unmute on Forum</>
                                  )}
                                </DropdownMenuItem>
                              )}

                              {iCanBan && (
                                <DropdownMenuItem 
                                  onClick={() => handleAction(user.id, "toggleBan")}
                                  className={user.isBanned ? "text-green-500 focus:bg-green-500/10 focus:text-green-500" : "text-destructive focus:bg-destructive/10 focus:text-destructive"}
                                >
                                  {user.isBanned ? (
                                    <><UserCheck className="mr-2 h-4 w-4" /> Unban User</>
                                  ) : (
                                    <><UserX className="mr-2 h-4 w-4" /> Ban User</>
                                  )}
                                </DropdownMenuItem>
                              )}
                              
                              {currentUserLevel >= PERMISSION_LEVELS.ADMIN && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const newPassword = prompt(`Set new password for ${user.username}:`);
                                    if (newPassword && newPassword.length >= 6) {
                                      handleAction(user.id, "setPassword", { newPassword });
                                    } else if (newPassword) {
                                      alert("Password must be at least 6 characters.");
                                    }
                                  }}
                                >
                                  <ShieldAlert className="mr-2 h-4 w-4 text-orange-500" /> Force Set Password
                                </DropdownMenuItem>
                              )}

                              {iCanPurge && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handlePurge(user.id)}
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive font-bold"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Purge User Content
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
                              Cannot modify this user.
                            </div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
