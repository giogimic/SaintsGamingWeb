"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const displayedError = error || (urlError ? (
    urlError === "OAuthAccountNotLinked" ? "Email already in use with a different provider." :
    urlError === "AccessDenied" ? "Access was denied." :
    urlError === "Configuration" ? "There is a problem with the server configuration." :
    "An error occurred during authentication."
  ) : null);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const parsedData = loginSchema.parse(formData);
      
      const res = await signIn("credentials", {
        redirect: false,
        identifier: parsedData.identifier,
        password: parsedData.password,
        callbackUrl: "/home",
      });

      if (res?.error) {
        if (res.error === "CredentialsSignin") {
          setError("Invalid username or password. Please check your spelling and try again.");
        } else if (res.error === "Banned") {
          setError("Your account has been banned. Please contact support.");
        } else {
          // If NextAuth passes a specific error string, show it. Otherwise use a generic fallback.
          setError(res.error || "Authentication failed. Please try again later.");
        }
      } else if (res?.url && res.url.includes("error=")) {
        // NextAuth v5 client fetch follows redirects to error pages silently
        const url = new URL(res.url);
        const errorParam = url.searchParams.get("error");
        
        if (errorParam === "AccessDenied") {
          setError("Access Denied: Security token expired. The page will reload in 2 seconds to fix this.");
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setError(errorParam || "Authentication failed. Please try again.");
        }
      } else if (res?.url) {
        // If there's a URL and no error, navigation was successful.
        // Force a hard navigation to avoid Next.js caching issues with cookies
        window.location.href = "/home";
      } else {
        window.location.href = "/home";
      }
    } catch (err) {
      if (err instanceof ZodError) {
        setError(err.issues[0].message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordLogin = () => {
    signIn("discord", { callbackUrl: "/home" });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card/50 border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
        <CardDescription>
          Enter your username or email and password to login
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="identifier">Username or Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Username or admin@example.com"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>
              {displayedError && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <p>{displayedError}</p>
                </div>
              )}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <Button variant="outline" type="button" onClick={handleDiscordLogin} disabled={isLoading}>
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="discord"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 512"
            >
              <path
                fill="currentColor"
                d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.276c3.545-2.859,8.544-6.393,12.089-9.252a1.849,1.849,0,0,0-.113-3.148c-14.123-5.228-28.847-11.517-43.18-18.423a1.821,1.821,0,0,1-.059-3.084c2.193-1.636,4.4-3.284,6.58-4.954a1.85,1.85,0,0,1,1.923-.195,315.6,315.6,0,0,0,103.7,21.5,317.065,317.065,0,0,0,103.738-21.5,1.843,1.843,0,0,1,1.923.195c2.18,1.67,4.387,3.318,6.58,4.954a1.821,1.821,0,0,1-.059,3.084,332.228,332.228,0,0,1-43.18,18.423,1.85,1.85,0,0,0-.113,3.148c3.545,2.859,8.544,6.393,12.089,9.252a1.884,1.884,0,0,0,2.063.276,487.351,487.351,0,0,0,146.825-74.189,2.02,2.02,0,0,0,.764-1.375C624.161,283.435,595.6,173.8,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"
              ></path>
            </svg>
            Discord
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
