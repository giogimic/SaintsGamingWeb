import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// To trigger this securely, you can configure a cron job to call:
// https://yoursite.com/api/cron/check-streams?secret=YOUR_CRON_SECRET

export const maxDuration = 60; // Next.js max duration for this function

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Basic security check (optional but recommended for cron endpoints)
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const profiles = await prisma.streamProfile.findMany({
      where: { isApproved: true }
    });

    if (profiles.length === 0) {
      return NextResponse.json({ message: "No approved profiles to check" });
    }

    const twitchProfiles = profiles.filter(p => p.platform === 'twitch');
    // Note: YouTube / Kick API integrations would go here.
    
    // --- TWITCH API INTEGRATION ---
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (clientId && clientSecret && twitchProfiles.length > 0) {
      // 1. Get App Access Token
      const tokenRes = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
        { method: "POST" }
      );
      
      if (tokenRes.ok) {
        const { access_token } = await tokenRes.json();
        
        // 2. Fetch live status for all twitch users
        // The channelUrl is usually something like https://twitch.tv/username
        const logins = twitchProfiles
          .map(p => p.channelUrl.split('/').pop())
          .filter(Boolean) as string[];
          
        // Twitch API allows up to 100 user_login params at once
        const loginQuery = logins.map(login => `user_login=${login}`).join('&');
        
        const streamsRes = await fetch(
          `https://api.twitch.tv/helix/streams?${loginQuery}`,
          {
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${access_token}`
            }
          }
        );

        if (streamsRes.ok) {
          const { data } = await streamsRes.json();
          // data contains an array of active streams. If a user is not in this array, they are offline.
          const liveUserLogins = data.map((stream: any  ) => stream.user_login.toLowerCase());

          // 3. Update database
          for (const profile of twitchProfiles) {
            const username = profile.channelUrl.split('/').pop()?.toLowerCase();
            if (username) {
              const isLive = liveUserLogins.includes(username);
              const streamData = data.find((s: any  ) => s.user_login.toLowerCase() === username);

              await prisma.streamProfile.update({
                where: { id: profile.id },
                data: {
                  isLive,
                  streamTitle: isLive ? streamData.title : null,
                  lastChecked: new Date()
                }
              });
            }
          }
        } else {
          console.error("Failed to fetch Twitch streams", await streamsRes.text());
        }
      } else {
        console.error("Failed to get Twitch access token", await tokenRes.text());
      }
    } else {
      console.log("Skipping Twitch check: missing credentials or no profiles");
    }

    return NextResponse.json({ success: true, checked: profiles.length });

  } catch (error) {
    console.error('Cron check streams error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
