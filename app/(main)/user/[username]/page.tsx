import { getPublicProfile } from "@/app/actions/users";
import { notFound } from "next/navigation";
import Image from "next/image";
import { User as UserIcon, Calendar, Gamepad2, Shield } from "lucide-react";
import { ProfileActions } from "./profile-actions";
import { ProfileMediaShowcase } from "./profile-media-showcase";
import { auth } from "@/auth";
import { Metadata } from "next";

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
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Profile Card */}
      <div className="sg-glass rounded-xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-xl border border-border/50">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        
        <div className="w-32 h-32 rounded-full bg-muted border-4 border-background flex items-center justify-center overflow-hidden shadow-lg relative shrink-0">
          {profile.image ? (
            <Image src={profile.image} alt={profile.username} fill className="object-cover" />
          ) : (
            <UserIcon className="w-16 h-16 text-muted-foreground opacity-50" />
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sg-text-gradient">{profile.username}</h1>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {!isSelf && session?.user && (
            <ProfileActions 
              targetId={profile.id} 
              targetUsername={profile.username}
              targetImage={profile.image}
              initialFriendship={profile.friendship} 
            />
          )}
        </div>
      </div>

      {/* Media Showcase */}
      <ProfileMediaShowcase 
        videoUrl={profile.youtubeVideoUrl} 
        musicUrl={profile.youtubeMusicUrl} 
        images={profile.profileImages} 
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

        {/* Stats Placeholder / Badges */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Activity
          </h2>
          <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">More statistics and badges coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
