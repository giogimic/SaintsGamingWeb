"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// import { pusherServer } from "@/lib/pusher"; // TODO: Re-enable when real-time push is implemented
import { revalidatePath } from "next/cache";
import { checkAndAwardAchievements } from "@/lib/achievements";

export async function uploadPublicKey(publicKey: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.userPublicKey.upsert({
    where: { userId: session.user.id },
    update: { publicKey },
    create: { userId: session.user.id, publicKey }
  });
}

export async function getPublicKey(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const key = await prisma.userPublicKey.findUnique({
    where: { userId }
  });

  return key?.publicKey || null;
}

export async function searchUsers(query: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!query || query.length < 3) return [];

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query } },
        { email: { contains: query } }
      ],
      id: { not: session.user.id }
    },
    select: {
      id: true,
      username: true,
      image: true
    },
    take: 5
  });

  return users;
}

export async function sendFriendRequest(friendId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (friendId === session.user.id) throw new Error("Cannot add yourself");

  // Check if existing
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: session.user.id, friendId },
        { userId: friendId, friendId: session.user.id }
      ]
    }
  });

  if (existing) {
    if (existing.status === "PENDING") {
      // If they sent it to us, accept it instead
      if (existing.friendId === session.user.id) {
        await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "ACCEPTED" }
        });
        return { success: true, message: "Friend request accepted!" };
      }
      throw new Error("Friend request already sent.");
    }
    throw new Error("You are already friends or blocked.");
  }

  await prisma.friendship.create({
    data: {
      userId: session.user.id,
      friendId,
      status: "PENDING"
    }
  });

  return { success: true, message: "Friend request sent." };
}

export async function acceptFriendRequest(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) throw new Error("Not found");
  if (friendship.friendId !== session.user.id) throw new Error("Unauthorized");

  await prisma.friendship.update({
    where: { id },
    data: { status: "ACCEPTED" }
  });

  // Evaluate Social Butterfly achievement for both users
  await checkAndAwardAchievements(session.user.id);
  await checkAndAwardAchievements(friendship.userId);

  revalidatePath("/ucp/social");
  revalidatePath("/ucp/messenger");
  return true;
}

export async function removeFriend(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) throw new Error("Not found");
  if (friendship.userId !== session.user.id && friendship.friendId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await prisma.friendship.delete({ where: { id } });
  return true;
}

export async function getFriendsList() {
  const session = await auth();
  if (!session?.user?.id) return { friends: [], requests: [] };

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { friendId: session.user.id }
      ]
    },
    include: {
      user: { select: { id: true, username: true, image: true } },
      friend: { select: { id: true, username: true, image: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const friends = [];
  const requests = [];

  for (const f of friendships) {
    if (f.status === "ACCEPTED") {
      // If we are user, friend is friend. If we are friend, user is friend.
      const friendObj = f.userId === session.user.id ? f.friend : f.user;
      friends.push({
        friendshipId: f.id,
        user: friendObj
      });
    } else if (f.status === "PENDING" && f.friendId === session.user.id) {
      // Incoming request
      requests.push({
        friendshipId: f.id,
        user: f.user
      });
    }
  }

  return { friends, requests };
}

export async function sendMessage(receiverId: string, ciphertext: string, iv: string, senderCiphertext: string, senderIv: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify friendship
  const isFriends = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { userId: session.user.id, friendId: receiverId },
        { userId: receiverId, friendId: session.user.id }
      ]
    }
  });

  if (!isFriends) throw new Error("You can only message friends.");

  await prisma.directMessage.create({
    data: {
      senderId: session.user.id,
      receiverId,
      ciphertext,
      iv,
      senderCiphertext,
      senderIv
    }
  });

  return true;
}

export async function getMessages(otherUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: session.user.id }
      ]
    },
    orderBy: { createdAt: "asc" },
    take: 100 // Last 100 messages for MVP
  });

  // Mark messages sent to us as read
  const unreadMessageIds = messages
    .filter(m => m.receiverId === session.user.id && !m.isRead)
    .map(m => m.id);

  if (unreadMessageIds.length > 0) {
    await prisma.directMessage.updateMany({
      where: { id: { in: unreadMessageIds } },
      data: { isRead: true }
    });
  }

  // Map them to return only the relevant fields to the current user
  return messages.map(msg => {
    const isSender = msg.senderId === session.user.id;
    return {
      id: msg.id,
      isSender,
      ciphertext: isSender ? msg.senderCiphertext : msg.ciphertext,
      iv: isSender ? msg.senderIv : msg.iv,
      createdAt: msg.createdAt,
      isRead: msg.isRead || unreadMessageIds.includes(msg.id)
    };
  });
}

export async function deleteMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const msg = await prisma.directMessage.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error("Message not found");

  if (msg.senderId !== session.user.id && msg.receiverId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await prisma.directMessage.delete({ where: { id: messageId } });
  return true;
}

export async function clearChatHistory(friendId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.directMessage.deleteMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: friendId },
        { senderId: friendId, receiverId: session.user.id }
      ]
    }
  });

  return true;
}

// ==========================================
// Group Chats
// ==========================================

export async function createGroupChat(name: string, memberIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupChat = await prisma.groupChat.create({
    data: {
      name,
      members: {
        create: [
          { userId: session.user.id, role: "ADMIN" },
          ...memberIds.map(id => ({ userId: id, role: "MEMBER" }))
        ]
      }
    }
  });

  return groupChat;
}

export async function getGroupChats() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const memberships = await prisma.groupChatMember.findMany({
    where: { userId: session.user.id },
    include: {
      groupChat: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, username: true, image: true }
              }
            }
          }
        }
      }
    }
  });

  return memberships.map(m => m.groupChat);
}

export async function getGroupMessages(groupChatId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Verify membership
  const membership = await prisma.groupChatMember.findUnique({
    where: { groupChatId_userId: { groupChatId, userId: session.user.id } }
  });

  if (!membership) throw new Error("Not a member of this group chat.");

  const messages = await prisma.groupMessage.findMany({
    where: { groupChatId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      sender: {
        select: { id: true, username: true, image: true }
      }
    }
  });

  return messages.map(msg => ({
    ...msg,
    isSender: msg.senderId === session.user.id
  }));
}

export async function sendGroupMessage(groupChatId: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify membership
  const membership = await prisma.groupChatMember.findUnique({
    where: { groupChatId_userId: { groupChatId, userId: session.user.id } }
  });

  if (!membership) throw new Error("Not a member of this group chat.");

  await prisma.groupMessage.create({
    data: {
      groupChatId,
      senderId: session.user.id,
      body
    }
  });

  return true;
}

export async function leaveGroupChat(groupChatId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.groupChatMember.delete({
    where: { groupChatId_userId: { groupChatId, userId: session.user.id } }
  });

  // If no members left, delete the group chat
  const count = await prisma.groupChatMember.count({ where: { groupChatId } });
  if (count === 0) {
    await prisma.groupChat.delete({ where: { id: groupChatId } });
  }

  return true;
}
