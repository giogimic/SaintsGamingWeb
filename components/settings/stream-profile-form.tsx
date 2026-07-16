"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Loader2 } from "lucide-react";

type Profile = any;  

export function StreamProfileForm({ initialProfile }: { initialProfile: Profile | null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [platform, setPlatform] = useState(initialProfile?.platform || "twitch");
  const [channelUrl, setChannelUrl] = useState(initialProfile?.channelUrl || "");
  const [isLive, setIsLive] = useState(initialProfile?.isLive || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/stream/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, channelUrl, isLive }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setSuccess(true);
      router.refresh();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="twitch">Twitch</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="kick">Kick</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="channelUrl">Channel URL</Label>
          <Input 
            id="channelUrl" 
            type="url" 
            placeholder="https://twitch.tv/yourusername"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            required
          />
        </div>

        {initialProfile?.isApproved && (
          <div className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-4 bg-muted/20">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">I am currently live!</Label>
              <p className="text-sm text-muted-foreground">
                Toggle this switch to appear on the front page of the Streams directory. Remember to turn it off when you&apos;re done!
              </p>
            </div>
            <Switch checked={isLive} onCheckedChange={setIsLive} />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="text-sm text-green-500 bg-green-500/10 p-3 rounded-md text-center">
          Profile updated successfully.
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !channelUrl.trim()}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </div>
    </form>
  );
}
