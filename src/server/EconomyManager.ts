import { prisma } from "@/web/lib/prisma";
import { GameEngine } from "./GameEngine";
import { PlayerManager } from "./PlayerManager";

export class EconomyManager {
  private engine: GameEngine;
  private playerManager: PlayerManager;

  constructor(engine: GameEngine, playerManager: PlayerManager) {
    this.engine = engine;
    this.playerManager = playerManager;
  }

  public async initialize() {
    this.engine.events.on("gtcCreateListing", async (data: { accountId: string, socketId: string, itemType: string, title: string, price: number, itemId: string, rarity?: string, affixes?: string }) => {
      await this.handleCreateListing(data);
    });

    this.engine.events.on("gtcPurchaseListing", async (data: { accountId: string, socketId: string, listingId: string }) => {
      await this.handlePurchaseListing(data);
    });
  }

  private async handleCreateListing(data: { accountId: string, socketId: string, itemType: string, title: string, price: number, itemId: string, rarity?: string, affixes?: string }) {
    const player = this.playerManager.getPlayerByAccountId(data.accountId);
    if (!player) return;

    try {
      // 1. Verify user owns the item in Prisma (Cold State)
      if (data.itemType === "MATERIAL") {
        const inventory = await prisma.playerInventoryItem.findFirst({
          where: { userId: data.accountId, itemSlug: data.itemId }
        });

        if (!inventory || inventory.quantity < 1) {
          this.engine.events.emit("directMessage", { socketId: data.socketId, event: "chat_message", data: { channel: "SYSTEM", senderId: "SERVER", senderName: "System", message: `You don't have enough ${data.itemId}.`, timestamp: Date.now() } });
          return;
        }

        // Deduct item
        if (inventory.quantity === 1) {
          await prisma.playerInventoryItem.delete({ where: { id: inventory.id } });
        } else {
          await prisma.playerInventoryItem.update({ where: { id: inventory.id }, data: { quantity: inventory.quantity - 1 } });
        }
      } else if (data.itemType === "EQUIPMENT") {
        this.engine.events.emit("directMessage", { socketId: data.socketId, event: "chat_message", data: { channel: "SYSTEM", senderId: "SERVER", senderName: "System", message: `Equipment sales not fully supported yet.`, timestamp: Date.now() } });
        return;
      }

      // 2. Create the GTC listing
      const char = await prisma.gameCharacter.findFirst({
        where: { userId: data.accountId }
      });
      if (!char) return;

      const listing = await prisma.gtcListing.create({
        data: {
          sellerId: char.id,
          itemType: data.itemType,
          title: data.title,
          price: data.price,
          itemId: data.itemId,
          rarity: data.rarity,
          affixes: data.affixes,
        }
      });

      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "gtc_transaction_success", data: { type: "LIST_CREATED", listing } });
      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "chat_message", data: { channel: "SYSTEM", senderId: "SERVER", senderName: "System", message: `Listed ${data.title} for ${data.price} Credits.`, timestamp: Date.now() } });
    } catch (e) {
      console.error("[EconomyManager] Create listing error", e);
      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "gtc_transaction_error", data: { message: "Failed to list item." } });
    }
  }

  private async handlePurchaseListing(data: { accountId: string, socketId: string, listingId: string }) {
    const player = this.playerManager.getPlayerByAccountId(data.accountId);
    if (!player) return;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const listing = await tx.gtcListing.findUnique({
          where: { id: data.listingId }
        });
        if (!listing) throw new Error('Listing no longer exists');

        // Check buyer credits
        const buyerChar = await tx.gameCharacter.findFirst({ where: { userId: data.accountId } });
        if (!buyerChar) throw new Error('Buyer character not found');

        const buyerState = JSON.parse(buyerChar.stateData || "{}");
        if ((buyerState.credits || 0) < listing.price) {
          throw new Error('Not enough credits');
        }

        // Deduct from buyer
        buyerState.credits -= listing.price;
        await tx.gameCharacter.update({
          where: { id: buyerChar.id },
          data: { stateData: JSON.stringify(buyerState) }
        });

        // Add to seller
        const sellerChar = await tx.gameCharacter.findUnique({ where: { id: listing.sellerId } });
        if (sellerChar) {
          const sellerState = JSON.parse(sellerChar.stateData || "{}");
          sellerState.credits = (sellerState.credits || 0) + listing.price;
          await tx.gameCharacter.update({
            where: { id: listing.sellerId },
            data: { stateData: JSON.stringify(sellerState) }
          });
          
          // Notify seller if they are online
          const sellerSocketId = this.engine.getSocketIdForAccount(sellerChar.userId);
          if (sellerSocketId) {
            this.engine.events.emit("directMessage", { 
              socketId: sellerSocketId, 
              event: "chat_message", 
              data: { channel: "SYSTEM", senderId: "SERVER", senderName: "System", message: `Someone bought your ${listing.title} for ${listing.price} Credits!`, timestamp: Date.now() } 
            });
            this.engine.events.emit("directMessage", {
              socketId: sellerSocketId,
              event: "sync_credits",
              data: { credits: sellerState.credits }
            });
          }
        }

        // Add item to buyer
        if (listing.itemType === "MATERIAL") {
          const existing = await tx.playerInventoryItem.findFirst({
            where: { userId: data.accountId, itemSlug: listing.itemId! }
          });
          if (existing) {
            await tx.playerInventoryItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + 1 } });
          } else {
            await tx.playerInventoryItem.create({ data: { userId: data.accountId, itemSlug: listing.itemId!, quantity: 1 } });
          }
        } else if (listing.itemType === "EQUIPMENT") {
           // For now, equipment is added to inventory items as well, or we just throw.
           // Since we don't support selling equipment yet, this shouldn't be reached.
        }

        await tx.gtcListing.delete({ where: { id: data.listingId } });
        return { listing, buyerCredits: buyerState.credits };
      });

      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "sync_credits", data: { credits: result.buyerCredits } });
      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "gtc_transaction_success", data: { type: "PURCHASE_COMPLETE" } });
      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "chat_message", data: { channel: "SYSTEM", senderId: "SERVER", senderName: "System", message: `You purchased ${result.listing.title}!`, timestamp: Date.now() } });
      // Push cold inventory so buyer HUD matches PlayerInventoryItem
      this.engine.events.emit("playerInventorySyncRequest", {
        socketId: data.socketId,
        accountId: data.accountId,
      });

    } catch (e: any) {
      console.error("[EconomyManager] Purchase error", e);
      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "chat_message", data: { channel: "SYSTEM", senderId: "SERVER", senderName: "System", message: `Purchase failed: ${e.message}`, timestamp: Date.now() } });
      this.engine.events.emit("directMessage", { socketId: data.socketId, event: "gtc_transaction_error", data: { message: e.message } });
    }
  }
}
