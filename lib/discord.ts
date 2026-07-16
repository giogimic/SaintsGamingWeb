import { prisma } from "@/lib/prisma";

/**
 * Discord Webhook Dispatcher
 * Sends a message to a Discord webhook while respecting rate limits (429 Retry-After).
 */
export async function sendDiscordWebhook(webhookUrl: string, payload: any, retries = 3): Promise<boolean> {
  if (!webhookUrl) return false;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return true;
      }

      if (response.status === 429) {
        const data = await response.json().catch(() => ({ retry_after: 5 }));
        // Discord retry_after is usually in seconds (or ms depending on API version), 
        // fallback to 5000ms if parsing fails.
        const delayMs = data.retry_after ? Math.ceil(data.retry_after * 1000) : 5000;
        console.warn(`[Discord Webhook] Rate limited. Retrying in ${delayMs}ms (Attempt ${attempt}/${retries})`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      console.error(`[Discord Webhook] Failed with status ${response.status}:`, await response.text());
      return false;
    } catch (error) {
      console.error("[Discord Webhook] Network error:", error);
      if (attempt === retries) return false;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return false;
}

/**
 * Discord OAuth Token Lifecycle Manager
 * Retrieves a user's Discord access token, automatically refreshing it if expired.
 */
export async function getValidDiscordToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "discord" },
  });

  if (!account || !account.access_token) {
    return null;
  }

  // Check if token is expired (adding a 60s buffer)
  const isExpired = account.expires_at && (account.expires_at * 1000) < (Date.now() + 60000);

  if (!isExpired) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    console.error(`[Discord OAuth] Token expired for user ${userId} and no refresh token available.`);
    return null;
  }

  // Attempt to refresh the token
  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AUTH_DISCORD_ID as string,
        client_secret: process.env.AUTH_DISCORD_SECRET as string,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      console.error(`[Discord OAuth] Failed to refresh token:`, tokens);
      return null;
    }

    // Update the database with the new tokens
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: "discord",
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
      },
    });

    return tokens.access_token;
  } catch (error) {
    console.error("[Discord OAuth] Error refreshing token:", error);
    return null;
  }
}
