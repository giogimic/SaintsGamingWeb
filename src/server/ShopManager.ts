import { prisma } from "@/web/lib/prisma";
import { GameEngine } from "./GameEngine";
import { getShopListing, sellPrice, SHOP_CATALOG } from "@/shared/game/shopCatalog";
import {
  addItem,
  inventorySnapshot,
  removeItem,
  resolveUserId as resolveUserIdShared,
} from "./inventoryService";

async function resolveUserId(accountOrUserId: string): Promise<string | null> {
  if (!accountOrUserId || accountOrUserId.startsWith("acc_")) return null;
  return resolveUserIdShared(accountOrUserId);
}

async function loadCredits(userId: string): Promise<{ charId: string; credits: number; state: Record<string, unknown> } | null> {
  const char = await prisma.gameCharacter.findFirst({ where: { userId } });
  if (!char) return null;
  const state = JSON.parse(char.stateData || "{}") as Record<string, unknown>;
  return { charId: char.id, credits: Number(state.credits || 0), state };
}

async function saveCredits(charId: string, state: Record<string, unknown>, credits: number) {
  state.credits = credits;
  await prisma.gameCharacter.update({
    where: { id: charId },
    data: { stateData: JSON.stringify(state) },
  });
}

export class ShopManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("shopBuy", (data: any) => this.handleBuy(data));
    this.engine.events.on("shopSell", (data: any) => this.handleSell(data));
    this.engine.events.on("shopCatalogRequest", (data: any) => this.handleCatalog(data));
  }

  private toast(socketId: string, message: string) {
    this.engine.events.emit("directMessage", {
      socketId,
      event: "show_toast",
      data: { message },
    });
  }

  private async syncWallet(socketId: string, userId: string, credits: number) {
    const inventory = await inventorySnapshot(userId);
    this.engine.events.emit("directMessage", {
      socketId,
      event: "sync_credits",
      data: { credits },
    });
    this.engine.events.emit("directMessage", {
      socketId,
      event: "inventory_sync",
      data: { inventory },
    });
  }

  private handleCatalog(data: { socketId: string }) {
    this.engine.events.emit("directMessage", {
      socketId: data.socketId,
      event: "shop_catalog",
      data: { items: SHOP_CATALOG },
    });
  }

  private async handleBuy(data: {
    accountId: string;
    socketId: string;
    itemSlug: string;
    quantity?: number;
  }) {
    const qty = Math.max(1, Math.min(99, data.quantity || 1));
    const listing = getShopListing(data.itemSlug);
    if (!listing || !listing.forSale) {
      this.toast(data.socketId, "That item is not for sale.");
      return;
    }

    const userId = await resolveUserId(data.accountId);
    if (!userId) {
      this.toast(data.socketId, "Character not found.");
      return;
    }

    const wallet = await loadCredits(userId);
    if (!wallet) {
      this.toast(data.socketId, "No character wallet found.");
      return;
    }

    const cost = listing.buyPrice * qty;
    if (wallet.credits < cost) {
      this.toast(data.socketId, "Not enough credits.");
      return;
    }

    const nextCredits = wallet.credits - cost;
    await saveCredits(wallet.charId, wallet.state, nextCredits);
    await addItem(userId, listing.itemSlug, qty);
    this.toast(data.socketId, `Purchased ${qty}× ${listing.name}.`);
    await this.syncWallet(data.socketId, userId, nextCredits);
  }

  private async handleSell(data: {
    accountId: string;
    socketId: string;
    itemSlug: string;
    quantity?: number;
  }) {
    const qty = Math.max(1, Math.min(99, data.quantity || 1));
    const price = sellPrice(data.itemSlug);
    if (price <= 0) {
      this.toast(data.socketId, "The merchant won't buy that.");
      return;
    }

    const userId = await resolveUserId(data.accountId);
    if (!userId) {
      this.toast(data.socketId, "Character not found.");
      return;
    }

    const removed = await removeItem(userId, data.itemSlug, qty);
    if (!removed) {
      this.toast(data.socketId, "You don't have that item.");
      return;
    }

    const wallet = await loadCredits(userId);
    if (!wallet) {
      // Refund item if wallet missing
      await addItem(userId, data.itemSlug, qty);
      this.toast(data.socketId, "No character wallet found.");
      return;
    }

    const nextCredits = wallet.credits + price * qty;
    await saveCredits(wallet.charId, wallet.state, nextCredits);
    const listing = getShopListing(data.itemSlug);
    this.toast(data.socketId, `Sold ${qty}× ${listing?.name || data.itemSlug} for ${price * qty} G.`);
    await this.syncWallet(data.socketId, userId, nextCredits);
  }
}
