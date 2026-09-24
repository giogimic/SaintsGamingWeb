import { getPublicProfile } from "@/app/actions/user/users";
import { notFound } from "next/navigation";
import Image from "next/image";
import { User as UserIcon, Calendar, Gamepad2, Crown, BadgeCheck, ShieldCheck, Settings, Heart, Share2, MessageSquare, ListTodo } from "lucide-react";
import { ProfileActions } from "./profile-actions";
import { auth } from "@/auth";
import { Metadata } from "next";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/web/components/ui/tabs";
import { getUserProfileMetadata } from "@/web/lib/seo";
import { ActivityFeed } from "@/web/components/profile/tabs/ActivityFeed";
import { AboutTab } from "@/web/components/profile/tabs/AboutTab";
import { CharactersTab } from "@/web/components/profile/tabs/CharactersTab";
import { GamesTab } from "@/web/components/profile/tabs/GamesTab";
import { GalleryTab } from "@/web/components/profile/tabs/GalleryTab";
import { FriendsTab } from "@/web/components/profile/tabs/FriendsTab";
import { SampTab } from "@/web/components/profile/tabs/SampTab";

export async function generateMetadata(props: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const params = await props.params;
  const username = decodeURIComponent(params.username);
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: "User Not Found | Saints Gaming" };
  }

  return getUserProfileMetadata({
    username: profile.username,
    avatar: profile.image ?? undefined,
  });
}

function getAccentColor(accent: string) {
  switch (accent) {
    case "SUNSET_GOLD": return "250 204 21";
    case "OCEAN_CYAN": return "6 182 212";
    case "VICE_PINK": return "236 72 153";
    case "PALM_GREEN": return "34 197 94";
    case "ELECTRIC_VIOLET": return "139 92 246";
    default: return "250 204 21";
  }
}

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const username = decodeURIComponent(params.username);
  
  const profile = await getPublicProfile(username);
  
  if (!profile) {
    notFound();
  }

  const session = await auth();
  const isSelf = session?.user?.id === profile.id;

  const accentColor = getAccentColor(profile.profileSettings.accent);
  const headerTreatment = profile.profileSettings.headerTreatment;

  return (
    <div className="w-full pb-12 animate-in fade-in duration-500" style={{ "--profile-accent": accentColor } as React.CSSProperties}>
      <Tabs defaultValue="activity" className="w-full">
        {/* Edge-to-Edge Header Profile Banner */}
        <div 
          className="w-full relative overflow-hidden flex flex-col items-center justify-center pt-24 pb-0 mb-8 border-b border-border/50"
          data-profile-treatment={headerTreatment}
        >
          {/* Background treatments */}
          <div className="absolute inset-0 bg-card/40 backdrop-blur-md z-0"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-[rgb(var(--profile-accent))]/80 z-10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[rgb(var(--profile-accent))]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

          {/* Treatment-specific overlays */}
          {headerTreatment === "WAVE_GRID" && (
            <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-20 z-0"></div>
          )}
          {headerTreatment === "NIGHT_DRIVE" && (
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-[rgb(var(--profile-accent))]/5 z-0"></div>
          )}
          
          {/* Scrim for contrast */}
          <div className="absolute inset-0 bg-black/40 z-10"></div>

          <div className="relative z-20 container max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center md:items-end gap-6 pb-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-muted border-4 border-[rgb(var(--profile-accent))]/50 flex items-center justify-center overflow-hidden shadow-2xl relative shrink-0 transition-transform hover:scale-105 duration-500">
              {profile.image ? (
                <Image src={profile.image} alt={profile.username} fill className="object-cover" />
              ) : (
                <UserIcon className="w-20 h-20 text-muted-foreground opacity-50" />
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-3 pb-2 w-full">
              <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">{profile.username}</h1>
                    <div className="flex items-center gap-1 mt-1">
                      {profile.isFounder && <span title="Founder"><Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" /></span>}
                      {profile.isVIP && <span title="VIP"><BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-500" /></span>}
                      {profile.isTrusted && <span title="Trusted User"><ShieldCheck className="w-6 h-6 text-green-500 fill-green-500" /></span>}
                    </div>
                  </div>
                  {profile.displayName && (
                    <p className="text-lg text-white/80 font-medium mt-1">@{profile.username}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isSelf && session?.user ? (
                    <ProfileActions 
                      targetId={profile.id} 
                      targetUsername={profile.username}
                      targetImage={profile.image}
                      initialFriendship={profile.friendship} 
                    />
                  ) : isSelf ? (
                    <Link href="/settings" className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-md font-semibold text-sm shadow-md transition-all inline-flex items-center gap-2 border border-white/20">
                      <Settings className="w-4 h-4" />
                      Edit Profile
                    </Link>
                  ) : null}
                </div>
              </div>

              {/* Level Chip and Stats Grid */}
              <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-[rgb(var(--profile-accent))]/30 px-3 py-1.5 rounded-full">
                  <span className="font-bold text-[rgb(var(--profile-accent))] text-sm">Lv {profile.level}</span>
                  <div className="w-24 h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full bg-[rgb(var(--profile-accent))]" style={{ width: `${(profile.xp % 1000) / 10}%` }}></div>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <StatChip icon={<ListTodo className="w-3.5 h-3.5" />} value={profile.stats.posts} label="Posts" />
                  <StatChip icon={<MessageSquare className="w-3.5 h-3.5" />} value={profile.stats.commentsReceived} label="Comments" />
                  <StatChip icon={<Heart className="w-3.5 h-3.5" />} value={profile.stats.likesReceived} label="Likes" />
                  <StatChip icon={<Share2 className="w-3.5 h-3.5" />} value={profile.stats.sharesReceived} label="Shares" />
                  <StatChip icon={<Gamepad2 className="w-3.5 h-3.5" />} value={profile.stats.forumContributions} label="Forum" />
                </div>
              </div>
              
            </div>
          </div>

          {/* Tab Rail placed inside the header bottom */}
          <div className="relative z-20 w-full bg-black/20 border-t border-white/10 backdrop-blur-md overflow-x-auto no-scrollbar">
            <div className="container max-w-5xl mx-auto px-4 sm:px-6">
              <TabsList className="bg-transparent border-0 h-12 p-0 justify-start space-x-1 sm:space-x-4 inline-flex min-w-max">
                <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[rgb(var(--profile-accent))] data-[state=active]:text-white rounded-none px-4 h-full text-white/60 hover:text-white/90">Activity</TabsTrigger>
                <TabsTrigger value="about" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[rgb(var(--profile-accent))] data-[state=active]:text-white rounded-none px-4 h-full text-white/60 hover:text-white/90">About</TabsTrigger>
                
                {profile.gameCharacters.length > 0 && (
                  <TabsTrigger value="characters" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[rgb(var(--profile-accent))] data-[state=active]:text-white rounded-none px-4 h-full text-white/60 hover:text-white/90">Characters</TabsTrigger>
                )}
                
                {profile.sampSessions && profile.sampSessions.length > 0 && (
                  <TabsTrigger value="samp" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[rgb(var(--profile-accent))] data-[state=active]:text-white rounded-none px-4 h-full text-white/60 hover:text-white/90">SA-MP</TabsTrigger>
                )}
                
                {/* Friends Tab conditionally rendered */}
                {profile.profileSettings.friendsVisibility !== "HIDDEN" && (
                  <TabsTrigger value="friends" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[rgb(var(--profile-accent))] data-[state=active]:text-white rounded-none px-4 h-full text-white/60 hover:text-white/90">Friends</TabsTrigger>
                )}
                
                {profile.steamWishlist.length > 0 && (
                  <TabsTrigger value="games" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[rgb(var(--profile-accent))] data-[state=active]:text-white rounded-none px-4 h-full text-white/60 hover:text-white/90">Games</TabsTrigger>
                )}
                
                {profile.profileImages.length > 0 && (
                  <TabsTrigger value="gallery" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[rgb(var(--profile-accent))] data-[state=active]:text-white rounded-none px-4 h-full text-white/60 hover:text-white/90">Gallery</TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>
        </div>
        
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <TabsContent value="activity">
            <ActivityFeed username={profile.username} showMilestones={profile.profileSettings.showMilestones} />
          </TabsContent>
          <TabsContent value="about">
            <AboutTab profile={profile} />
          </TabsContent>
          {profile.gameCharacters.length > 0 && (
            <TabsContent value="characters">
              <CharactersTab characters={profile.gameCharacters} isSelf={isSelf} profileId={profile.id} />
            </TabsContent>
          )}
          {profile.sampSessions && profile.sampSessions.length > 0 && (
            <TabsContent value="samp">
              <SampTab sessions={profile.sampSessions} />
            </TabsContent>
          )}
          {profile.profileSettings.friendsVisibility !== "HIDDEN" && (
            <TabsContent value="friends">
              <FriendsTab userId={profile.id} />
            </TabsContent>
          )}
          {profile.steamWishlist.length > 0 && (
            <TabsContent value="games">
              <GamesTab wishlist={profile.steamWishlist} />
            </TabsContent>
          )}
          {profile.profileImages.length > 0 && (
            <TabsContent value="gallery">
              <GalleryTab images={profile.profileImages} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode, value: number, label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/5 px-2.5 py-1 rounded-md">
      <span className="text-[rgb(var(--profile-accent))]">{icon}</span>
      <span className="font-semibold text-white text-sm">{value}</span>
      <span className="text-white/60 text-xs uppercase font-medium">{label}</span>
    </div>
  );
}
