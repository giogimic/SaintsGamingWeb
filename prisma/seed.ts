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
      title: "Welcome to General Discussion — Time To Play",
      slug: "welcome-general-discussion",
      body: `# Welcome to General Discussion

Saints Gaming: Time To Play. Welcome to the community's living room — a place to talk about Saints Gaming, gaming in general, or anything on your mind. We've been around since 2007, starting with a public TeamSpeak and SAMP City of Angels Roleplay. We've grown into a modern community, but our roots are still the same.

## What belongs here

- Thoughts on the platform, the MMO, or the community
- Gaming recommendations and discussions
- Off-topic conversations (within reason)

## Ground Rules

1. Be welcoming. We're a general gamer community, treat everyone with respect.
2. Disagree without being disagreeable.
3. Have fun. That's what we're here for.

Welcome to the Nexus.`,
      isPinned: true,
    },

    "introductions": {
      title: "Introduce Yourself — New Saints Welcome!",
      slug: "introduce-yourself",
      body: `# Introduce Yourself!

New to the community? Welcome to Saints Gaming — we're glad you're here. Drop a reply below and tell us a bit about yourself. 

## Some ideas for your intro

- **What should we call you?** Your username, a nickname, whatever you prefer.
- **How did you find Saints Gaming?** Word of mouth, Discord, or maybe you remember us from the 2007 SAMP days?
- **What kind of games do you enjoy?** MMOs, survival (Ark, Minecraft), building, PvP?
- **What are you most excited about here?** The MMO lobby, World Studio, or just hanging out in the Nexus?

There's no template and no pressure. A one-liner is just as welcome as a full autobiography.

Welcome aboard, Saint. Time To Play. 🎮`,
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
      excerpt: "Saints Gaming Time To Play. The platform has been rebuilt from the ground up to bring our 2007 legacy into the modern era.",
      body: "# Welcome to Saints Gaming 2.0!\n\nSaints Gaming Time To Play. It's been a long journey since our public TeamSpeak and SAMP City of Angels Roleplay days back in 2007. We've brought the community forward into a new era.\n\n## What's New\n\n- **Integrated MMO Lobby** — Jump right into a 2.5D world from your browser. No downloads.\n- **World Studio** — Build maps, script events, and share them with the community.\n- **Revamped Forums** — The Nexus is alive. Discussions, mod packs, and a modern community hub.\n- **Mod Packs** — We're returning to our roots with official community mod packs.\n\nWelcome to the next generation of Saints Gaming.\n\n— The Saints Gaming Team"
    },
    {
      title: "Saints MMO: Early Access Roadmap",
      excerpt: "Here's what is coming for the Saints MMO over the next few months — Hero Battles, creature capturing, guild systems, and more.",
      body: "# Saints MMO: Early Access Roadmap\n\nThe MMO is live in early access. We want to be transparent about where things are headed. Here's our development roadmap.\n\n## Phase 1 — Foundation (Complete)\n- Core movement and multiplayer sync\n- Tileset-based map rendering\n- Demo Sandbox map with creature spawns\n\n## Phase 2 — Combat & Encounters (In Progress)\n- **Hero Battles**: Real-time open-world combat against monsters. No loading screens.\n- **Saints Buddy Battles**: Creature encounters focused on weakening and capturing.\n- Loot tables, item drops, and an inventory system.\n\n## Phase 3 — Social & Economy\n- Player trading and marketplace\n- Guild creation and guild halls\n- Player Battles (PvP) with ranked matchmaking\n\n## Phase 4 — World Expansion\n- Multiple connected maps\n- Community-created maps\n- Seasonal events"
    },
    {
      title: "World Studio: Build Your Own Maps",
      excerpt: "The World Studio is now available to all players. Paint terrain, place objects, script encounters, and share your creations.",
      body: "# World Studio: Build Your Own Maps\n\nOne of our core beliefs since the survival server days (Minecraft, Ark, Hurtworld) is that the best experiences are built by the community. That's why we built the **World Studio**.\n\n## What Can You Build?\n\n- **Terrain** — Paint multi-layer tilemaps using our growing tileset library.\n- **NPCs & Encounters** — Place creatures and configure encounter logic.\n- **Scripts & Events** — Trigger dialogues, cutscenes, and quests.\n- **Publish & Share** — Submit your maps for community play.\n\n## How to Access\n\nNavigate to `/studio` from the main menu.\n\nWe can't wait to see what you create."
    },
    {
      title: "Community Event: First Saints Tournament",
      excerpt: "Our first official community tournament is coming — sign up, compete in Hero Battles, and earn exclusive rewards.",
      body: "# Community Event: First Saints Tournament\n\nIt's time to put your skills to the test. We're hosting our **first official community tournament**.\n\n## Event Details\n\n- **Format**: 1v1 Hero Battles, single elimination bracket\n- **Registration**: Open now through the end of the week. Sign up in the Discord.\n- **Matches**: Scheduled over the weekend.\n\n## Rewards\n\n- 🥇 **1st Place** — Exclusive profile badge + 5,000 coins\n- 🥈 **2nd Place** — Profile badge + 2,500 coins\n- 🥉 **3rd Place** — Profile badge + 1,000 coins\n\nGood luck, Saints. See you on the field."
    },
    {
      title: "Infrastructure Update: Better Performance Ahead",
      excerpt: "We've completed a major backend migration for lower latency and higher capacity across the Saints Gaming network.",
      body: "# Infrastructure Update: Better Performance Ahead\n\nOver the past two weeks, we've completed a significant infrastructure overhaul. We remember the lag on the old Reign of Kings servers — we're making sure our new platform stays smooth.\n\n## What We Upgraded\n\n- **Server Hardware** — Migrated to NVMe-backed instances with higher single-thread performance.\n- **Network Optimization** — Implemented connection pooling and optimized our WebSocket layer.\n- **Database Layer** — Moved to a more efficient schema layout.\n\n## What This Means for You\n\n- **Faster page loads** across the entire site\n- **Smoother multiplayer** in the MMO\n- **More reliable** uptime\n\nThank you for your patience."
    },
    {
      title: "Discord Integration: Link Your Account",
      excerpt: "You can now link your Discord account for one-click login, role sync, and live notifications.",
      body: "# Discord Integration: Link Your Account\n\nDiscord integration is now live across the platform.\n\n## Features\n\n- **One-Click Login** — Sign in with Discord.\n- **Role Sync** — Your community roles (VIP, Founder, Trusted, Staff) sync between the website and Discord server.\n- **Notifications** — Get pinged in Discord when someone replies to your forum thread.\n\n## How to Link\n\n1. Go to **Settings** -> **Account** -> **Linked Accounts**.\n2. Click **Link Discord**.\n3. Authorize the connection.\n\nWelcome to the connected community."
    },
    {
      title: "Staff Applications Now Open",
      excerpt: "We're expanding the moderation and support team. Help shape Saints Gaming.",
      body: "# Staff Applications Now Open\n\nSaints Gaming is growing, and we need more hands on deck. We're looking for dedicated community members to join the team.\n\n## Open Positions\n\n### Community Moderator\n- Monitor forums and in-game chat\n- Help resolve player disputes\n- Assist with community events\n\n### Support Agent\n- Respond to help tickets and technical issues\n- Assist new players with onboarding\n\n## How to Apply\n\n1. Join the Discord server.\n2. Open a ticket in `#staff-applications`.\n3. Fill out the application template.\n\nWe appreciate everyone who keeps this community positive."
    },
    {
      title: "Patch Notes: v0.8.0 — Combat Overhaul",
      excerpt: "The biggest gameplay update yet. Reworked combat timing, new creature abilities, and dozens of bug fixes.",
      body: "# Patch Notes: v0.8.0 — Combat Overhaul\n\nThis is our largest gameplay patch to date, focused on making combat feel responsive.\n\n## Combat Changes\n\n- **Attack Timing** — Reduced input delay.\n- **Creature AI** — Monsters now use varied attack patterns.\n- **Damage Numbers** — Floating damage numbers now appear on hit.\n- **Knockback** — Added knockback on heavy attacks.\n\n## Saints Buddy Battles\n\n- **Capture Rate Rebalanced** — Weakened creatures are now easier to capture at low HP.\n- **New Abilities** — Added 8 new creature abilities.\n\n## Bug Fixes\n\n- Fixed players becoming invisible after a zone transition.\n- Fixed chat messages persisting across map changes.\n\nThank you for playing."
    },
    {
      title: "Forum Guide: Getting the Most Out of The Nexus",
      excerpt: "A quick guide to using the forums — markdown formatting, thread etiquette, reactions, and polls.",
      body: "# Forum Guide: Getting the Most Out of The Nexus\n\nWhether you've been here since 2007 or this is your first time posting, here are some tips to get the most out of The Nexus.\n\n## Formatting Your Posts\n\nAll posts support **Markdown**.\n\n- `**bold**` for **bold text**\n- `*italic*` for *italic text*\n- `# Heading` for section headers\n\n## Thread Etiquette\n\n- **Use descriptive titles.** \"Help!\" tells nobody anything.\n- **Search before posting.**\n- **Stay on topic.**\n- **Be constructive.**\n\nHappy posting!"
    },
    {
      title: "Player Spotlight: Community Creators",
      excerpt: "Highlighting some of the incredible maps, builds, and contributions from Saints Gaming community members.",
      body: "# Player Spotlight: Community Creators\n\nEvery month we want to highlight members of the community who go above and beyond.\n\n## Featured Creators\n\n### 🗺️ Map of the Month\nCongratulations to the creator of **\"Ashenvale Crossing\"** — a beautifully detailed forest map.\n\n### 💬 Forum MVP\nA special shoutout to the community members who have been consistently answering questions in the Support board.\n\n### 🎨 Creative Showcase\nWe've seen some incredible tileset work this month.\n\n## How to Get Featured\n\nThere's no application process. Just keep creating, helping, and being an active part of the community.\n\nSee you next month."
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

  // 3. Seed Modpacks
  const modpacksToSeed = [
    {
      name: "Saints Gaming - QoL Enhancer",
      slug: "saints-gaming-qol",
      game: "Palworld",
      description: "The official mod pack required to play on our servers. Includes essential client-side mods for UI improvements and performance.",
      version: "1.5.1",
      installNotes: "Extract the ModPack.zip into your \\Palworld\\Pal\\Content\\Paks directory!",
      order: 1
    },
    {
      name: "Dimensional Saints Adventure",
      slug: "dimensional-saints",
      game: "Minecraft",
      description: "The official Dimensional Saints community Minecraft modpack. Relive the glory days of our early survival servers with modern enhancements.",
      version: "1.0",
      downloadUrl: "http://www.technicpack.net/modpack/dimensional-saints",
      order: 2
    },
    {
      name: "Saints Ark Survival Evolved",
      slug: "saints-ark-survival",
      game: "Ark: Survival Evolved",
      description: "The ultimate Ark mod pack for the Saints Gaming community. Rebuilt for balanced PvE and PvP.",
      version: "2.3.4",
      installNotes: "Subscribe to the Steam Workshop collection.",
      order: 3
    },
    {
      name: "Hurtworld Saints Reborn",
      slug: "hurtworld-saints-reborn",
      game: "Hurtworld",
      description: "Custom plugins and configurations for our Hurtworld community server.",
      version: "1.1.0",
      order: 4
    },
    {
      name: "Reign of Kings: Saints Era",
      slug: "rok-saints-era",
      game: "Reign of Kings",
      description: "Nostalgic Reign of Kings server mods focusing on castle building and roleplay elements.",
      version: "1.0.5",
      order: 5
    }
  ];

  for (const mp of modpacksToSeed) {
    await prisma.modpack.upsert({
      where: { slug: mp.slug },
      update: { description: mp.description },
      create: mp,
    });
  }
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
      text: "Ah, another Operative arrives in Saints Village. The wilds are dangerous today.",
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
