import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Per-board thread content ────────────────────────────────────────────────
function getThreadForSubcategory(slug: string) {
  const threads: Record<string, { title: string; slug: string; body: string; isPinned?: boolean; isLocked?: boolean }> = {

    // ── Official News & Announcements ──────────────────────────────────────
    "game-news": {
      title: "Saints Gaming 2.0 Has Launched — Everything You Need to Know",
      slug: "saints-gaming-2-launch",
      body: `# Saints Gaming 2.0 Has Launched

The new platform is officially live. Here's a quick rundown of what's available right now and where we're headed.

## What's Live Today

- **Integrated MMO Lobby** — A 2.5D browser-based world where you can explore, battle creatures, and meet other Saints in real time. No downloads required.
- **World Studio** — A built-in map editor with tileset painting, NPC placement, encounter scripting, and the ability to publish your maps for the community.
- **Community Forums** — Full-featured discussion boards with markdown, reactions, polls, search, and user profiles.
- **Leaderboards & Profiles** — Track your progress, view ranked stats, and customize your Saint's profile.

## Coming Soon

- Hero Battles (real-time open-world PvE combat)
- Saints Buddy Battles (creature capturing and training)
- Guild system and player trading
- Seasonal events and community map contests

## How to Get Started

1. Register an account or sign in with Discord.
2. Create your first character in the Lobby.
3. Introduce yourself in the forums.
4. Explore the World Studio to start building.

Follow this board for all official updates. Welcome to the community.`,
      isPinned: true,
    },

    "patch-notes": {
      title: "Patch Notes: v0.8.0 — Combat Foundation & Bug Fixes",
      slug: "patch-notes-v0-8-0",
      body: `# Patch Notes: v0.8.0

*Released this week*

## Gameplay

- **Combat System Foundation** — The core combat loop is now functional. Engage creatures on the open map without loading screens or scene transitions.
- **Attack Timing** — Reduced input delay between action press and damage application for more responsive combat.
- **Creature AI Improvements** — Monsters now use varied attack patterns including flanking, retreating, and ability combos instead of simple charge attacks.
- **Floating Damage Numbers** — Damage values now appear on hit. Critical strikes display with a larger, highlighted style.
- **Knockback** — Heavy attacks now apply knockback. Positioning matters in combat.

## Saints Buddy Battles

- Capture rate curve rebalanced — weakened creatures at low HP are now easier to capture.
- 8 new creature abilities added across Fire, Water, and Earth types.
- Status effects (Burn, Freeze, Poison) now show visible indicators with consistent tick rates.

## Loot & Economy

- Slight increase to uncommon and rare item drop rates.
- New crafting materials added to mid-level creature loot tables.
- Fixed quest reward item duplication under specific conditions.

## Bug Fixes

- Fixed players becoming invisible after zone transitions.
- Fixed chat messages persisting across map changes.
- Fixed inventory crash during creature encounters.
- Fixed tileset rendering artifacts on map edges.
- Fixed rare desync when two players entered the same encounter simultaneously.

Report new issues in the **Bug Reports** board. Thank you for testing.`,
      isPinned: true,
    },

    "rules": {
      title: "Official Community Rules & Code of Conduct",
      slug: "official-community-rules",
      body: `# Saints Gaming — Community Rules & Code of Conduct

*Last updated: August 2026*

These rules apply across the entire Saints Gaming platform — forums, in-game chat, Discord, and all community spaces. By using the platform, you agree to follow these guidelines.

---

## 1. Respect & Conduct

**Treat everyone with respect.** Harassment, hate speech, discrimination, threats, doxxing, and personal attacks are not tolerated under any circumstances. This includes but is not limited to racism, sexism, homophobia, transphobia, and ableism.

Disagreements are fine. Insults are not. Critique ideas, not people.

## 2. No Cheating, Exploiting, or Hacking

Using third-party tools, scripts, or exploits to gain an unfair advantage in the MMO will result in an **immediate permanent ban** with no appeal. This includes:

- Aimbots, speed hacks, wallhacks, or automation scripts
- Exploiting bugs for personal gain (duplicating items, bypassing walls, etc.)
- Account sharing or multi-accounting to circumvent bans

**If you discover a bug or exploit**, report it privately to staff. Responsible disclosure is rewarded, not punished.

## 3. No Spam or Self-Promotion

- Do not flood forums, chat, or threads with repetitive or low-effort content.
- Do not advertise other communities, servers, products, or services without staff permission.
- Referral links, affiliate codes, and unsolicited DMs are prohibited.

## 4. Keep Content Safe for Work

All content must be appropriate for a general audience. No NSFW imagery, text, links, or innuendo — including profile pictures, usernames, and map content.

## 5. Forum-Specific Guidelines

- **Use descriptive thread titles.** "Help" or "Question" tells no one anything.
- **Post in the correct board.** Bug reports go in Bug Reports, not General Discussion.
- **Search before posting.** Your question may already be answered.
- **No necro-posting.** Don't revive threads older than 30 days unless you have meaningful new information.
- **One thread per topic.** Don't create duplicate threads about the same issue.

## 6. In-Game Conduct

- No griefing, spawn-camping, or intentionally disrupting other players' gameplay.
- No impersonating staff members.
- PvP must be consensual unless in a designated PvP zone.
- Respect shared world spaces — don't obstruct paths or build over key areas in community maps.

## 7. Staff Decisions

Staff decisions regarding rule enforcement are **final**. If you believe a decision was made in error, you may submit a calm, written appeal through the support ticket system. Public arguments with staff about moderation actions will be treated as a separate infraction.

## 8. Consequences

Violations are handled on a case-by-case basis. The general escalation path is:

1. **Verbal Warning** — First minor offense.
2. **Formal Warning** — Logged to your account. Visible to all staff.
3. **Temporary Mute/Ban** — Duration varies by severity (1 day to 30 days).
4. **Permanent Ban** — Reserved for severe or repeated violations.

Severe offenses (threats, doxxing, hacking) skip directly to permanent ban.

---

*These rules may be updated as the community grows. Major changes will be announced in the Game News board. Thank you for helping keep Saints Gaming a welcoming place for everyone.*`,
      isPinned: true,
      isLocked: true,
    },

    // ── General & Community ────────────────────────────────────────────────
    "general-discussion": {
      title: "Welcome to General Discussion — Start Here",
      slug: "welcome-general-discussion",
      body: `# Welcome to General Discussion

This is the community's living room — a place to talk about Saints Gaming, gaming in general, or anything on your mind.

## What belongs here

- Thoughts on the platform, the MMO, or the community
- Gaming recommendations and discussions
- Off-topic conversations (within reason)
- Anything that doesn't fit neatly into another board

## What belongs elsewhere

- Bug reports → **Bug Reports** board
- Feature requests → **Suggestions & Feedback** board
- Technical issues → **Help & Technical Support** board
- Map building discussion → **World Studio & Map Crafting** board

## Ground Rules

1. Be respectful. Disagree without being disagreeable.
2. Use descriptive thread titles so people know what they're clicking on.
3. If a thread drifts off topic, consider starting a new one instead of hijacking.
4. Have fun. That's what we're here for.

See you around.`,
      isPinned: true,
    },

    "introductions": {
      title: "Introduce Yourself — New Saints Welcome!",
      slug: "introduce-yourself",
      body: `# Introduce Yourself!

New to the community? Welcome — we're glad you're here. Drop a reply below and tell us a bit about yourself.

## Some ideas for your intro

- **What should we call you?** Your username, a nickname, whatever you prefer.
- **How did you find Saints Gaming?** Word of mouth, Discord, a search engine, stumbled in by accident?
- **What kind of games do you enjoy?** MMOs, RPGs, survival, building, PvP — or a bit of everything?
- **What are you most excited about here?** The MMO lobby, World Studio, the forums, the community?
- **Anything else?** Hobbies, favorite music, time zone, pets — whatever you feel like sharing.

There's no template and no pressure. A one-liner is just as welcome as a full autobiography.

The community is here to help you get settled in. If you have questions about anything on the platform, don't hesitate to ask here or in the **Help & Technical Support** board.

Welcome aboard, Saint. 🎮`,
      isPinned: true,
    },

    "media-creations": {
      title: "Share Your Creations — Screenshots, Videos & Artwork",
      slug: "share-your-creations",
      body: `# Share Your Creations

This board is for showcasing the things you've built, captured, or created in Saints Gaming.

## What to share

- 📸 **Screenshots** — Cool moments from the lobby, interesting map designs, UI setups, rare encounters.
- 🎬 **Videos** — Gameplay clips, tutorials, cinematic map tours, stream highlights.
- 🗺️ **Maps** — World Studio creations. Show off your tileset work, terrain design, NPC placements, and scripted events.
- 🎨 **Fan Art & Assets** — Pixel art, sprite sheets, custom tilesets, UI mockups, or concept art.

## Posting tips

- Include a brief description of what you're sharing and how it was made.
- If it's a World Studio map, mention the map name so others can look it up.
- Constructive feedback is encouraged — ask for it if you want it, and give it respectfully.
- Credit others if your work builds on someone else's assets or ideas.

We love seeing what the community creates. Post away.`,
      isPinned: true,
    },

    // ── Saints MMO & World Building ────────────────────────────────────────
    "hero-battles": {
      title: "Hero Battles 101 — Mechanics, Tips & Discussion",
      slug: "hero-battles-101",
      body: `# Hero Battles 101

Hero Battles are the core PvE combat system in the Saints MMO. Unlike traditional turn-based RPGs, all combat happens in **real time on the open map** — no loading screens, no separate battle scenes.

## Core Mechanics

- **Engagement** — Walk into a creature's aggro range to start combat. Some creatures are passive until provoked; others attack on sight.
- **Attacks** — Use your equipped abilities to deal damage. Each ability has a cooldown, range, and element type.
- **Positioning** — Movement matters. Dodge area attacks, flank for bonus damage, and manage distance against ranged enemies.
- **Knockback** — Heavy attacks push targets back. Use this to create space or push enemies into hazards.
- **Defeat** — Reduce a creature's HP to zero. Loot drops are calculated server-side.

## Tips for New Players

1. **Don't rush multiple enemies.** One-on-one fights are manageable; getting mobbed is not.
2. **Watch attack patterns.** Every creature telegraphs its abilities. Learn the timing and you'll take much less damage.
3. **Check your gear.** Equip the best items you have before heading into dangerous zones.
4. **Retreat when needed.** Walking away from a fight isn't losing — it's surviving.

## Saints Buddy Battles

Creature encounters work differently from standard Hero Battles. The goal is to **weaken and capture**, not defeat. Lower the creature's HP and use capture items. Capture success rate increases as the target's HP drops.

## Discussion

Use this board to discuss combat strategies, report balance concerns, share builds, and help other players improve. Keep it constructive.`,
      isPinned: true,
    },

    "world-studio": {
      title: "World Studio Quick-Start Guide",
      slug: "world-studio-quickstart",
      body: `# World Studio Quick-Start Guide

The World Studio is Saints Gaming's built-in map editor. You can paint terrain, place NPCs, configure encounters, and publish your maps for the community.

## Getting Started

1. Navigate to \`/studio\` from the main menu.
2. The editor opens in **Paint mode** by default.
3. Use the **Catalog** tab to browse available tilesets.
4. Select a brush and click on the canvas to paint tiles.
5. Press **Ctrl+S** to save. Press **Ctrl+E** to switch between Edit and Playtest modes.

## Editor Modes

| Mode | Purpose |
|------|---------|
| **Paint** | Terrain painting — ground, walls, decorations, overlays |
| **Populate** | NPC and creature placement, spawn zone configuration |
| **Script** | Event triggers, dialogue trees, quest logic |
| **Catalog** | Browse and manage tileset assets |
| **Play** | Test your map in real time without leaving the editor |

## Tips

- **Start small** — A 32×32 map is plenty for learning the tools.
- **Layer your tiles** — Use the ground layer for terrain, then add decoration and overlay layers for depth.
- **Save often** — Auto-save exists, but manual saves ensure nothing is lost.
- **Test frequently** — Switch to Playtest mode often to see how your map feels from a player's perspective.
- **Study other maps** — Warp to community maps and observe how experienced builders use layering, spacing, and scripting.

## Publishing

When your map is ready, use the **Save & Publish** option. Published maps appear in the community map browser and may be featured if they meet quality standards.

Use this board to discuss building techniques, share works-in-progress, ask for feedback, and collaborate with other builders.`,
      isPinned: true,
    },

    "guides-tutorials": {
      title: "Community Guides — How to Contribute",
      slug: "community-guides-how-to",
      body: `# Community Guides — How to Contribute

This board is the community knowledge base. If you've figured something out, write it up and share it here.

## What makes a good guide

- **Focused topic** — One guide, one subject. "How to capture your first creature" is better than "Everything about the game."
- **Clear structure** — Use headings, numbered steps, and bullet points. Wall-of-text guides don't get read.
- **Accurate information** — Test your instructions before posting. If mechanics change in a patch, update your guide.
- **Beginner-friendly language** — Don't assume readers know the jargon. Define terms the first time you use them.

## Ideas for guides

- New player onboarding walkthrough
- Combat mechanics deep-dive (damage formulas, element interactions)
- World Studio building techniques (layering, NPC scripting, encounter zones)
- Forum features and formatting (markdown, polls, reactions)
- Character builds and loadout recommendations
- Economy tips (loot, trading, crafting)

## Formatting

All posts support **Markdown**. Use headings (\`#\`, \`##\`), bold (\`**text**\`), code blocks, tables, and lists to structure your content. The better your formatting, the more people will read and reference your guide.

## Credit

If your guide references someone else's work, discoveries, or strategies, credit them. Collaboration makes the community stronger.

We'll pin outstanding guides that the community votes up. Thank you for sharing your knowledge.`,
      isPinned: true,
    },

    // ── Support & Development ──────────────────────────────────────────────
    "bug-reports": {
      title: "How to Submit a Bug Report",
      slug: "how-to-submit-bug-report",
      body: `# How to Submit a Bug Report

Found something broken? Thank you for reporting it. Good bug reports help us fix issues faster. Please use the template below when creating a new thread in this board.

---

## Bug Report Template

\`\`\`
**Summary**: [One-sentence description of the bug]

**Steps to Reproduce**:
1. [First step]
2. [Second step]
3. [What happened]

**Expected Behavior**: [What should have happened]

**Actual Behavior**: [What actually happened]

**Environment**:
- Browser: [Chrome / Firefox / Safari / Edge]
- OS: [Windows / Mac / Linux]
- Screen Resolution: [e.g. 1920×1080]

**Screenshots / Video**: [Attach if possible]

**Additional Context**: [Anything else relevant — error messages, console logs, frequency]
\`\`\`

---

## Tips for Effective Reports

- **Search first** — Check if the bug has already been reported. Duplicate reports slow down triage.
- **Be specific** — "It doesn't work" helps nobody. "Clicking the Save button in World Studio with an empty map name shows a blank error toast" helps a lot.
- **One bug per thread** — If you've found multiple issues, create separate threads for each.
- **Include reproduction steps** — If we can't reproduce it, we can't fix it.
- **Attach evidence** — Screenshots and screen recordings are incredibly helpful. Browser console errors (\`F12\` → Console tab) even more so.

## What Happens Next

Staff will review reported bugs and tag them with a status:

- 🔵 **Confirmed** — We've reproduced the issue.
- 🟡 **Investigating** — We're looking into it.
- 🟢 **Fixed** — Resolved in an upcoming or recent patch.
- ⚪ **Cannot Reproduce** — We couldn't reproduce it. More info may be requested.

Thank you for helping improve Saints Gaming.`,
      isPinned: true,
      isLocked: true,
    },

    "suggestions-feedback": {
      title: "Suggestions & Feedback — Guidelines",
      slug: "suggestions-feedback-guidelines",
      body: `# Suggestions & Feedback — Guidelines

Have an idea for Saints Gaming? We want to hear it. This board is where the community proposes features, improvements, and changes.

## How to Write a Good Suggestion

### 1. Describe the problem or opportunity
What's missing? What could be better? Start with the "why" before the "what."

### 2. Propose a solution
Be as specific as you can. "The inventory should be better" is vague. "The inventory should support drag-and-drop sorting and a search filter" is actionable.

### 3. Consider trade-offs
Every feature has a cost — development time, UI complexity, performance impact. Acknowledging trade-offs shows you've thought it through and makes your suggestion more credible.

### 4. Keep it focused
One suggestion per thread. If you have five ideas, that's five threads. This keeps discussion organized and makes it easier for us to track and prioritize.

## Voting & Discussion

- **React** to suggestions you support. Community interest influences what we prioritize.
- **Discuss constructively** in replies. Build on ideas rather than tearing them down.
- If your suggestion is similar to an existing thread, reply there instead of creating a duplicate.

## What We Do With Suggestions

The development team reviews this board regularly. Popular and well-articulated suggestions are added to our internal backlog. We can't implement everything, but we read everything.

When a suggestion is picked up for development, the thread will be tagged accordingly.

Thank you for investing thought into making Saints Gaming better.`,
      isPinned: true,
    },

    "help-support": {
      title: "Need Help? Start Here — Common Issues & FAQ",
      slug: "help-support-faq",
      body: `# Need Help? Start Here

Before creating a new thread, check if your issue is covered below. These are the most common questions and problems new users encounter.

---

## Frequently Asked Questions

### I can't log in
- Make sure you're using the correct email/username and password.
- If you registered with Discord, use the **Sign in with Discord** button — you won't have a separate password.
- Try resetting your password from the login page.
- Clear your browser cache and cookies, then try again.

### The lobby won't load / shows a black screen
- The lobby uses WebGL (Babylon.js). Make sure your browser supports WebGL and hardware acceleration is enabled.
- Try a different browser (Chrome and Edge tend to work best).
- Disable browser extensions that might interfere (ad blockers, privacy extensions).
- On the first load, the lobby can take 15-20 seconds to compile. Be patient.

### I can't see other players in the lobby
- Make sure you're on the same realm shard. Check the server select screen.
- If you just connected, wait a few seconds for the player sync to complete.

### My map won't save in World Studio
- Check that your map has a name. Empty names will fail silently.
- Make sure you have an active internet connection.
- Try saving again. If the issue persists, open the browser console (\`F12\`) and check for error messages.

### How do I link my Discord account?
- Go to **Settings** → **Account** → **Linked Accounts** → **Link Discord**.

### How do I change my username or avatar?
- Go to **Settings** → **Profile**. Username changes may be limited.

---

## Still Need Help?

If your issue isn't covered above:

1. **Search this board** — someone may have already asked the same question.
2. **Create a new thread** with a descriptive title and include:
   - What you were trying to do
   - What happened instead
   - Your browser and OS
   - Any error messages you saw
3. **Be patient** — community members and staff will respond as soon as they can.

You can also reach out on Discord in the \`#help\` channel for quicker responses.`,
      isPinned: true,
    },
  };

  return threads[slug] || null;
}

async function main() {
  console.log("Seeding database with dummy data...");

  // 1. Get an existing admin user, or fallback to any user for authorship
  let author = await prisma.user.findFirst({
    where: { permissionLevel: { gte: 100 } },
    orderBy: { createdAt: 'asc' }
  });

  if (!author) {
    author = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });
  }

  if (!author) {
    console.warn("No users found. Will skip seeding content that requires an author (News, Threads).");
  }

  // 2. Seed News Articles
  const newsArticles = [
    {
      title: "Welcome to Saints Gaming 2.0!",
      excerpt: "The Saints Gaming platform has been rebuilt from the ground up. New forums, a live MMO lobby, World Studio, and so much more — here's everything you need to know.",
      body: "# Welcome to Saints Gaming 2.0!\n\nAfter months of development, we're thrilled to announce that **Saints Gaming 2.0** is officially live. This isn't just a facelift — the entire platform has been rebuilt from scratch to support our growing community and the ambitious features we've been planning.\n\n## What's New\n\n- **Integrated MMO Lobby** — Jump into the 2.5D world directly from your browser. Explore maps, encounter creatures, and meet other Saints in real time.\n- **World Studio** — Our built-in map editor lets you paint tilesets, place NPCs, script events, and publish your creations for everyone to explore.\n- **Revamped Forums** — Threaded discussions with markdown support, reactions, polls, and full search. A proper home for community conversation.\n- **User Profiles & Dashboards** — Track your progress, manage your characters, and customize your profile.\n- **Leaderboards** — Compete across the realm with ranked stats for battles, quests, and community engagement.\n\n## Getting Started\n\n1. **Register an account** or log in with Discord.\n2. Head to the **Lobby** to create your first character.\n3. Explore the **Forums** and introduce yourself.\n4. Check out the **World Studio** if you want to build maps.\n\nWe're just getting started. Thank you for being part of this community — your feedback shapes everything we build.\n\n— The Saints Gaming Team"
    },
    {
      title: "Saints MMO: Early Access Roadmap",
      excerpt: "A look at what's coming for the Saints MMO over the next few months — Hero Battles, creature capturing, guild systems, and the first major content drop.",
      body: "# Saints MMO: Early Access Roadmap\n\nThe MMO is live in early access, and we want to be transparent about where things are headed. Here's our development roadmap for the coming months.\n\n## Phase 1 — Foundation (Complete)\n- Core movement and multiplayer sync\n- Tileset-based map rendering\n- Basic NPC dialogue and quest system\n- Demo Sandbox map with creature spawns\n\n## Phase 2 — Combat & Encounters (In Progress)\n- **Hero Battles**: Real-time open-world combat against monsters. No loading screens, no separate battle scenes — fights happen right on the map.\n- **Saints Buddy Battles**: Creature encounters focused on weakening and capturing. Build your collection and train your team.\n- Loot tables, item drops, and an inventory system.\n\n## Phase 3 — Social & Economy\n- Player trading and marketplace\n- Guild creation and guild halls\n- Chat channels (global, local, guild, whisper)\n- Player Battles (PvP) with ranked matchmaking\n\n## Phase 4 — World Expansion\n- Multiple connected maps with zone transitions\n- Community-created maps eligible for the official world\n- Seasonal events and limited-time encounters\n\nTimelines are intentionally left flexible. We'd rather ship something polished than rush a deadline. Follow this space for updates as each phase rolls out."
    },
    {
      title: "World Studio: Build Your Own Maps",
      excerpt: "The World Studio is now available to all players. Paint terrain, place objects, script encounters, and share your creations with the community.",
      body: "# World Studio: Build Your Own Maps\n\nOne of our core beliefs is that the best game worlds are built by the communities that play in them. That's why we're shipping the **World Studio** as a first-class feature, not a modding afterthought.\n\n## What Can You Build?\n\n- **Terrain** — Paint multi-layer tilemaps using our growing tileset library. Ground, walls, decorations, and overlays.\n- **NPCs & Encounters** — Place creatures, set spawn zones, and configure encounter logic.\n- **Scripts & Events** — Trigger dialogues, cutscenes, and quests using our visual scripting tools.\n- **Publish & Share** — Submit your maps for community play. Top-rated maps may be added to the official world.\n\n## How to Access\n\nNavigate to `/studio` from the main menu. The editor opens with Paint mode active by default. Use the toolbar to switch between Paint, Populate (NPCs), Script, and Catalog modes.\n\n**Keyboard shortcut**: Press `Ctrl+E` to toggle between Edit and Playtest modes so you can test your map without leaving the editor.\n\n## Tips for New Builders\n\n- Start with a small map (32×32 tiles) to learn the tools.\n- Use the **Catalog** tab to browse available tilesets before you start painting.\n- Save frequently — the editor auto-saves, but manual saves ensure nothing is lost.\n- Check out the Guides & Tutorials forum board for community-written building guides.\n\nWe can't wait to see what you create."
    },
    {
      title: "Community Event: First Saints Tournament",
      excerpt: "Our first official community tournament is coming — sign up, compete in Hero Battles, and earn exclusive rewards only available during the event.",
      body: "# Community Event: First Saints Tournament\n\nIt's time to put your skills to the test. We're hosting our **first official community tournament**, and every Saint is welcome to compete.\n\n## Event Details\n\n- **Format**: 1v1 Hero Battles, single elimination bracket\n- **Registration**: Open now through the end of the week. Sign up in the Discord `#tournament` channel.\n- **Matches**: Scheduled over the following weekend. Times will be coordinated with participants.\n- **Stream**: All matches will be streamed live on our Twitch channel.\n\n## Rewards\n\n- 🥇 **1st Place** — Exclusive \"Champion Saint\" profile badge + 5,000 in-game currency\n- 🥈 **2nd Place** — \"Challenger\" profile badge + 2,500 in-game currency\n- 🥉 **3rd Place** — \"Contender\" profile badge + 1,000 in-game currency\n- 🎮 **All Participants** — \"Tournament Veteran\" badge\n\nThese badges and rewards are exclusive to this event and will not be available again.\n\n## Rules\n\n- Standard Hero Battle rules apply. No restricted abilities.\n- Players must check in 15 minutes before their scheduled match.\n- Disconnections: one reconnect attempt allowed. If the issue persists, the match is forfeited.\n\nGood luck, Saints. See you on the field."
    },
    {
      title: "Infrastructure Update: Better Performance Ahead",
      excerpt: "We've completed a major backend migration — new hardware, optimized networking, and improved server architecture for lower latency and higher capacity.",
      body: "# Infrastructure Update: Better Performance Ahead\n\nOver the past two weeks, we've completed a significant infrastructure overhaul behind the scenes. Here's what changed and why it matters.\n\n## What We Upgraded\n\n- **Server Hardware** — Migrated to NVMe-backed instances with higher single-thread performance. This directly improves game tick rates and database query times.\n- **Network Optimization** — Implemented connection pooling and optimized our WebSocket layer. You should notice reduced latency in the MMO lobby, especially during peak hours.\n- **Database Layer** — Moved to a more efficient schema layout and added strategic indexes. Forum and news page loads are noticeably faster.\n- **CDN & Static Assets** — Static files (tilesets, sprites, UI assets) are now served from edge locations closer to you.\n\n## What This Means for You\n\n- **Faster page loads** across the entire site\n- **Smoother multiplayer** with fewer position correction \"rubber-bands\"\n- **Higher player capacity** per realm shard\n- **More reliable** uptime during traffic spikes\n\n## Known Issues\n\nSome users may need to hard-refresh (`Ctrl+Shift+R`) once to clear cached assets from the old CDN. If you experience any rendering glitches after the migration, this should resolve it.\n\nThank you for your patience during the maintenance windows. The platform is in a much stronger place now."
    },
    {
      title: "Discord Integration: Link Your Account",
      excerpt: "You can now link your Discord account for one-click login, role sync, and live notifications. Here's how to set it up.",
      body: "# Discord Integration: Link Your Account\n\nDiscord integration is now live across the platform. Link your account to unlock seamless login, automatic role sync, and real-time notifications.\n\n## Features\n\n- **One-Click Login** — Sign in with Discord instead of email/password. Your Saints Gaming account is automatically linked.\n- **Role Sync** — Your community roles (VIP, Founder, Trusted, Staff) sync between the website and Discord server.\n- **Notifications** — Get pinged in Discord when someone replies to your forum thread, when events go live, or when your map gets featured.\n\n## How to Link\n\n1. Go to **Settings** → **Account** → **Linked Accounts**.\n2. Click **Link Discord**.\n3. Authorize the connection in the Discord popup.\n4. Done. Your accounts are now linked.\n\nIf you registered with Discord originally, your accounts are already linked — no action needed.\n\n## Privacy\n\nWe only request basic profile information (username, avatar, email). We do not read your messages, join voice channels, or access your server list. You can unlink at any time from Settings."
    },
    {
      title: "Staff Applications Now Open",
      excerpt: "We're expanding the moderation and support team. If you're an active community member who wants to help shape Saints Gaming, here's how to apply.",
      body: "# Staff Applications Now Open\n\nSaints Gaming is growing, and we need more hands on deck. We're looking for dedicated community members to join the **Moderation** and **Support** teams.\n\n## Open Positions\n\n### Community Moderator\n- Monitor forums and in-game chat for rule violations\n- Help resolve player disputes\n- Assist with community events\n- **Requirement**: Active member for at least 2 weeks, no prior infractions\n\n### Support Agent\n- Respond to help tickets and technical issues\n- Assist new players with onboarding\n- Document common issues for the knowledge base\n- **Requirement**: Patient communicator with some technical aptitude\n\n## How to Apply\n\n1. Join the Discord server if you haven't already.\n2. Open a ticket in the `#staff-applications` channel.\n3. Fill out the application template with your timezone, availability, and a brief paragraph on why you'd be a good fit.\n\nApplications are reviewed weekly. Selected candidates will be invited to a brief voice interview. All new staff start with a 2-week trial period.\n\nWe appreciate everyone who keeps this community positive. Thank you for considering."
    },
    {
      title: "Patch Notes: v0.8.0 — Combat Overhaul",
      excerpt: "The biggest gameplay update yet. Reworked combat timing, new creature abilities, loot table balancing, and dozens of bug fixes.",
      body: "# Patch Notes: v0.8.0 — Combat Overhaul\n\nThis is our largest gameplay patch to date, focused on making combat feel responsive and rewarding.\n\n## Combat Changes\n\n- **Attack Timing** — Reduced input delay from action press to damage application. Attacks now feel immediate.\n- **Creature AI** — Monsters now use varied attack patterns instead of simple charge-and-hit. Expect flanking, retreating, and ability combos.\n- **Damage Numbers** — Floating damage numbers now appear on hit, with critical hits displayed in a larger, highlighted style.\n- **Knockback** — Added knockback on heavy attacks. Positioning matters more in fights now.\n\n## Saints Buddy Battles\n\n- **Capture Rate Rebalanced** — Weakened creatures are now easier to capture at low HP. The curve is more forgiving.\n- **New Abilities** — Added 8 new creature abilities across Fire, Water, and Earth types.\n- **Status Effects** — Burn, Freeze, and Poison now have visible indicators and consistent tick rates.\n\n## Loot & Economy\n\n- Adjusted drop rates for uncommon and rare items (slight increase).\n- Added new crafting materials to mid-level creature loot tables.\n- Fixed an issue where quest reward items could duplicate under certain conditions.\n\n## Bug Fixes\n\n- Fixed players becoming invisible to others after a zone transition.\n- Fixed chat messages persisting across map changes.\n- Fixed a crash when opening the inventory during a creature encounter.\n- Fixed tileset rendering artifacts on map edges.\n\nAs always, report any new issues in the Bug Reports board. Thank you for playing."
    },
    {
      title: "Forum Guide: Getting the Most Out of Discussions",
      excerpt: "A quick guide to using the forums — markdown formatting, thread etiquette, reactions, polls, and how to search effectively.",
      body: "# Forum Guide: Getting the Most Out of Discussions\n\nWhether you're a forum veteran or this is your first time posting, here are some tips to help you get the most out of the Saints Gaming forums.\n\n## Formatting Your Posts\n\nAll posts support **Markdown**. Here are the basics:\n\n- `**bold**` for **bold text**\n- `*italic*` for *italic text*\n- `# Heading` for section headers\n- `` `code` `` for inline code\n- `> quote` for quoting someone\n- `- item` for bullet lists\n\n## Thread Etiquette\n\n- **Use descriptive titles.** \"Help!\" tells nobody anything. \"Can't connect to lobby after latest patch\" helps everyone.\n- **Search before posting.** Your question may already have an answer.\n- **Stay on topic.** Tangential discussions are fine in General, but keep technical boards focused.\n- **Be constructive.** \"This sucks\" isn't feedback. \"The capture rate feels too low at 50% HP because...\" is.\n\n## Reactions & Polls\n\nEvery post supports reactions — use them to show agreement, appreciation, or mark helpful answers. Thread authors can also create **polls** for community votes on topics.\n\n## Search Tips\n\nThe search bar supports keywords across thread titles, body content, and author names. Use the forum search page for advanced filtering by board and date range.\n\nHappy posting!"
    },
    {
      title: "Player Spotlight: Community Creators",
      excerpt: "Highlighting some of the incredible maps, builds, and contributions from Saints Gaming community members this month.",
      body: "# Player Spotlight: Community Creators\n\nEvery month we want to highlight members of the community who go above and beyond. This month's spotlight focuses on our **World Studio creators** and active forum contributors.\n\n## Featured Creators\n\n### 🗺️ Map of the Month\nCongratulations to the creator of **\"Ashenvale Crossing\"** — a beautifully detailed forest map with hidden caves, ambient NPC patrols, and a scripted mini-boss encounter. The attention to tileset layering and the use of lighting overlays sets a new standard for community maps.\n\n### 💬 Forum MVP\nA special shoutout to the community members who have been consistently answering questions in the Help & Support board. Your patience with new players and detailed troubleshooting steps keep this community running smoothly.\n\n### 🎨 Creative Showcase\nWe've seen some incredible tileset work this month — custom sprite sheets for interior decorations, animated water tiles, and seasonal variants for existing terrain. If you're a pixel artist interested in contributing to the official tileset library, reach out to staff.\n\n## How to Get Featured\n\nThere's no application process. Just keep creating, helping, and being an active part of the community. We notice, and we appreciate it.\n\nSee you next month."
    },
  ];

  if (author) {
    for (let i = 0; i < newsArticles.length; i++) {
      const a = newsArticles[i];
      // Stagger publishedAt so articles appear in a natural chronological order
      const publishedAt = new Date(Date.now() - (newsArticles.length - i) * 86400000);
      const safeExcerpt = a.excerpt ? a.excerpt.slice(0, 140) : null;
      await prisma.newsArticle.upsert({
        where: { slug: `news-article-${i}` },
        update: { publishedAt, title: a.title, excerpt: safeExcerpt, body: a.body },
        create: {
          title: a.title,
          slug: `news-article-${i}`,
          excerpt: safeExcerpt,
          body: a.body,
          isPublished: true,
          publishedAt,
          authorId: author.id,
        },
      });
    }
    console.log(`Seeded ${newsArticles.length} news articles.`);
  } else {
    console.log("Skipped seeding news articles (no author found).");
  }

  // 3. Seed Modpack
  await prisma.modpack.upsert({
    where: { slug: "saints-gaming-qol" },
    update: {},
    create: {
      name: "Saints Gaming - QoL Enhancer",
      slug: "saints-gaming-qol",
      game: "Palworld",
      description: "The official mod pack required to play on our servers. Includes essential client-side mods for UI improvements and performance.",
      version: "1.5.1",
      installNotes: "Extract the ModPack.zip into your \\Palworld\\Pal\\Content\\Paks directory!",
    },
  });

  await prisma.modpack.upsert({
    where: { slug: "dimensional-saints" },
    update: {},
    create: {
      name: "Dimensional Saints Adventure",
      slug: "dimensional-saints",
      game: "Minecraft",
      description: "The official Dimensional Saints community modpack.",
      version: "1.0",
      downloadUrl: "http://www.technicpack.net/modpack/dimensional-saints",
    },
  });
  console.log("Seeded Modpacks.");

  // 4. Seed Forum Categories & Threads
  const categories = [
    { 
      name: "Official News & Announcements", 
      slug: "official-news",
      subcategories: [
        { name: "Game News & Updates", slug: "game-news", description: "Official game announcements, updates, and server notifications" },
        { name: "Patch Notes & Releases", slug: "patch-notes", description: "Detailed patch notes, MMO client updates, and balance changes" },
        { name: "Rules & Guidelines", slug: "rules", description: "Official community guidelines and platform rules" }
      ]
    },
    { 
      name: "General & Community", 
      slug: "community",
      subcategories: [
        { name: "General Discussion", slug: "general-discussion", description: "Discuss anything related to Saints Gaming and gaming in general" },
        { name: "Introductions & Welcomes", slug: "introductions", description: "New to the realm? Introduce yourself to the Saints community" },
        { name: "Media & Studio Creations", slug: "media-creations", description: "Share your screenshots, videos, maps, and studio artwork" }
      ]
    },
    { 
      name: "Saints MMO & World Building", 
      slug: "saints-mmo",
      subcategories: [
        { name: "Hero Battles & Mechanics", slug: "hero-battles", description: "Strategies, builds, battle mechanics, and balance discussion" },
        { name: "World Studio & Map Crafting", slug: "world-studio", description: "World Builder discussion, tilesets, scripts, and level design" },
        { name: "Guides & Tutorials", slug: "guides-tutorials", description: "Community created guides, quest walkthroughs, and tips" }
      ]
    },
    { 
      name: "Support & Development", 
      slug: "support",
      subcategories: [
        { name: "Bug Reports", slug: "bug-reports", description: "Report bugs, visual glitches, or unexpected behavior" },
        { name: "Suggestions & Feedback", slug: "suggestions-feedback", description: "Propose new features, improvements, and community ideas" },
        { name: "Help & Technical Support", slug: "help-support", description: "Get assistance with account, launcher, or connection issues" }
      ]
    },
  ];

  for (const cat of categories) {
    const category = await prisma.forumCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        order: categories.indexOf(cat),
      }
    });

    for (const sub of cat.subcategories) {
      const subcategory = await prisma.subCategory.upsert({
        where: { slug: sub.slug },
        update: {},
        create: {
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          categoryId: category.id,
          order: cat.subcategories.indexOf(sub)
        }
      });

      // Seed a realistic, informative thread for each subcategory
      if (author) {
        const threadData = getThreadForSubcategory(sub.slug);
        if (threadData) {
          await prisma.thread.upsert({
            where: { slug: threadData.slug },
            update: { title: threadData.title, body: threadData.body, isPinned: threadData.isPinned ?? false, isLocked: threadData.isLocked ?? false },
            create: {
              ...threadData,
              authorId: author.id,
              subcategoryId: subcategory.id,
            }
          });
        }
      }
    }
  }
  console.log("Seeded Forum Categories and Threads.");

  // 5. Seed Game Servers
  const servers = [
    { name: "Saints Gaming - Palworld #1", game: "Palworld", ip: "192.168.1.100", port: 8211 },
    { name: "Saints Gaming - Palworld #2", game: "Palworld", ip: "192.168.1.100", port: 8214 },
    { name: "Saints Gaming - Palworld #3", game: "Palworld", ip: "192.168.1.100", port: 8215 },
  ];

  for (const s of servers) {
    const count = await prisma.gameServer.count({ where: { port: s.port } });
    if (count === 0) {
      await prisma.gameServer.create({
        data: s
      });
    }
  }
  console.log("Seeded Game Servers.");

  // 6. Seed Phase 6 Narrative Systems
  const elderDialogue = {
    node_start: {
      text: "Ah, another Tamer arrives in Saints Village. The wilds are dangerous today.",
      options: [
        { label: "I can handle it.", nextNode: "node_confident" },
        { label: "Do you have any work for me?", nextNode: "node_quest" },
        { label: "Goodbye.", nextNode: "exit" }
      ]
    },
    node_confident: {
      text: "Confidence is good. But arrogance will get you killed out there. Stay safe.",
      options: [
        { label: "I will.", nextNode: "exit" }
      ]
    },
    node_quest: {
      text: "Actually, yes. The Slimes to the north have been acting aggressively. Can you thin their numbers?",
      options: [
        { label: "I will defeat 3 Slimes.", nextNode: "node_accept", action: "ACCEPT_QUEST", questSlug: "quest-slime-hunter" },
        { label: "Maybe later.", nextNode: "exit" }
      ]
    },
    node_accept: {
      text: "Thank you. May the Saints protect you.",
      options: [
        { label: "Goodbye.", nextNode: "exit" }
      ]
    }
  };

  await prisma.npcDialogueTree.upsert({
    where: { npcId: 'npc_Elder' },
    update: { data: JSON.stringify(elderDialogue) },
    create: { npcId: 'npc_Elder', name: 'Elder', data: JSON.stringify(elderDialogue) }
  });

  const questTemplate = await prisma.questTemplate.upsert({
    where: { slug: 'quest-slime-hunter' },
    update: {},
    create: {
      slug: 'quest-slime-hunter',
      title: 'The Slime Menace',
      description: 'Defeat 3 Slimes for the Village Elder.',
      rewards: JSON.stringify({ xp: 150, copper: 50 })
    }
  });

  await prisma.questObjective.upsert({
    where: { questId_stage: { questId: questTemplate.id, stage: 1 } },
    update: {},
    create: {
      questId: questTemplate.id,
      stage: 1,
      type: "KILL",
      targetSlug: "Slime",
      requiredQty: 3,
      description: "Defeat 3 Slimes"
    }
  });

  console.log("Seeded Phase 6 Narrative Data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
