import { getPublicProfile } from "@/app/actions/users";
import { notFound } from "next/navigation";
import Image from "next/image";
import { User as UserIcon, Calendar, Gamepad2, Crown, BadgeCheck, ShieldCheck } from "lucide-react";
import { ProfileActions } from "./profile-actions";
import { ProfileMediaShowcase } from "./profile-media-showcase";
import { AchievementShowcase } from "@/components/achievements/achievement-showcase";
import { ActivityStats } from "@/components/profile/activity-stats";
import { auth } from "@/auth";
import { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata(props: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const params = await props.params;
  const username = decodeURIComponent(params.username);
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: "User Not Found" };
  }

  return {
    title: `${profile.username}'s Profile`,
    description: `Check out ${profile.username}'s profile on Saints Gaming. Joined ${new Date(profile.createdAt).toLocaleDateString()}.`,
    openGraph: {
      title: `${profile.username}'s Profile | Saints Gaming`,
      description: `View ${profile.username}'s profile, forum activity, and Steam wishlist on Saints Gaming.`,
      images: profile.image ? [{ url: profile.image }] : undefined,
    }
  };
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

  return (
    <div className="w-full pb-12 animate-in fade-in duration-500">
      
      {/* Edge-to-Edge Header Profile Banner */}
      <div className="w-full bg-card/40 backdrop-blur-md border-b border-white/5 relative overflow-hidden flex flex-col items-center justify-center pt-24 pb-12 shadow-2xl mb-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/80"></div>
        
        {/* Subtle background glow behind avatar */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="w-40 h-40 rounded-full bg-muted border-4 border-background/50 flex items-center justify-center overflow-hidden shadow-2xl relative shrink-0 z-10 transition-transform hover:scale-105 duration-500">
          {profile.image ? (
            <Image src={profile.image} alt={profile.username} fill className="object-cover" />
          ) : (
            <UserIcon className="w-20 h-20 text-muted-foreground opacity-50" />
          )}
        </div>

        <div className="text-center space-y-4 mt-6 z-10">
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-5xl font-extrabold tracking-tight sg-text-gradient drop-shadow-sm">{profile.username}</h1>
              <div className="flex items-center gap-1 mt-1">
                {profile.isFounder && (
                  <span title="Founder"><Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" /></span>
                )}
                {profile.isVIP && (
                  <span title="VIP"><BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-500" /></span>
                )}
                {profile.isTrusted && (
                  <span title="Trusted User"><ShieldCheck className="w-6 h-6 text-green-500 fill-green-500" /></span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm shadow-sm border border-white/5">
                <Calendar className="w-4 h-4 text-primary" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {!isSelf && session?.user && (
            <div className="pt-2">
              <ProfileActions 
                targetId={profile.id} 
                targetUsername={profile.username}
                targetImage={profile.image}
                initialFriendship={profile.friendship} 
              />
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-12 space-y-12">
        {/* Achievements */}
        <AchievementShowcase achievements={profile.achievements} />

        {/* Media Showcase */}
        <ProfileMediaShowcase 
          videoUrl={profile.youtubeVideoUrl} 
          musicUrl={profile.youtubeMusicUrl} 
          images={profile.profileImages} 
        />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        {/* Saints Gaming Lobby Operatives */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              The Lobby
            </h2>
            {isSelf && (
              <Link href="/lobby" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-semibold text-sm shadow-md transition-all hover:scale-105">
                Enter The Lobby
              </Link>
            )}
          </div>
          
          {profile.gameCharacters && profile.gameCharacters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {profile.gameCharacters.map((char) => (
                <div key={char.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-primary/50 transition-colors">
                  <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center shrink-0 border border-white/5">
                    {/* Placeholder for Character Sprite */}
                    <Image src={`/assets/npcs/${char.spriteId}.png`} alt={char.spriteId} width={32} height={32} className="pixelated" unoptimized onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{char.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{char.classId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
              <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No characters created yet.</p>
            </div>
          )}
        </div>

        {/* Steam Wishlist (if any) */}
        {profile.steamWishlist.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              Steam Wishlist
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.steamWishlist.map((game) => (
                <a 
                  key={game.appId} 
                  href={`https://store.steampowered.com/app/${game.appId}`} 
                  target="_blank"
                  rel="noreferrer"
                  className="group relative rounded-xl overflow-hidden border border-border/50 bg-card hover:border-primary/50 transition-all hover:shadow-lg"
                >
                  <div className="aspect-[460/215] relative bg-muted">
                    {game.image ? (
                      <Image src={game.image} alt={game.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">No Image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate" title={game.name}>{game.name}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              Gaming
            </h2>
            <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
              <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">This user hasn&apos;t linked any Steam games to their wishlist yet.</p>
            </div>
          </div>
        )}

        {/* Activity & Stats */}
        <ActivityStats profile={profile as any} />
        </div>
      </div>
    </div>
  );
}
