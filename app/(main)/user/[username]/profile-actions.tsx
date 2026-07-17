"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, UserCheck, MessageSquare, Loader2 } from "lucide-react";
import { sendFriendRequest, acceptFriendRequest, removeFriend } from "@/app/actions/messenger";
import { useMessenger } from "@/components/messenger/messenger-provider";

export function ProfileActions({ 
  targetId, 
  targetUsername, 
  targetImage,
  initialFriendship 
}: { 
  targetId: string, 
  targetUsername: string,
  targetImage: string | null,
  initialFriendship: { status: string, id: string, amISender: boolean } | null 
}) {
  const [friendship, setFriendship] = useState(initialFriendship);
  const [isLoading, setIsLoading] = useState(false);
  const { setActiveChat, setIsOpen } = useMessenger();

  async function handleAdd() {
    setIsLoading(true);
    try {
      await sendFriendRequest(targetId);
      // Optimistic update
      setFriendship({ status: "PENDING", id: "temp", amISender: true });
      window.location.reload(); // Refresh to get true ID
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAccept() {
    if (!friendship) return;
    setIsLoading(true);
    try {
      await acceptFriendRequest(friendship.id);
      setFriendship({ ...friendship, status: "ACCEPTED" });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemove() {
    if (!friendship) return;
    setIsLoading(true);
    try {
      await removeFriend(friendship.id);
      setFriendship(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleMessage() {
    setActiveChat({ id: targetId, username: targetUsername, image: targetImage });
    setIsOpen(true);
  }

  if (isLoading) {
    return <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait</Button>;
  }

  if (!friendship) {
    return (
      <Button onClick={handleAdd}>
        <UserPlus className="mr-2 h-4 w-4" /> Add Friend
      </Button>
    );
  }

  if (friendship.status === "PENDING") {
    if (friendship.amISender) {
      return (
        <Button variant="outline" onClick={handleRemove}>
          <UserMinus className="mr-2 h-4 w-4" /> Cancel Request
        </Button>
      );
    } else {
      return (
        <div className="flex gap-2">
          <Button onClick={handleAccept}>
            <UserCheck className="mr-2 h-4 w-4" /> Accept
          </Button>
          <Button variant="outline" onClick={handleRemove}>
            Decline
          </Button>
        </div>
      );
    }
  }

  if (friendship.status === "ACCEPTED") {
    return (
      <div className="flex gap-2">
        <Button onClick={handleMessage}>
          <MessageSquare className="mr-2 h-4 w-4" /> Message
        </Button>
        <Button variant="destructive" onClick={handleRemove}>
          <UserMinus className="mr-2 h-4 w-4" /> Unfriend
        </Button>
      </div>
    );
  }

  return null;
}
