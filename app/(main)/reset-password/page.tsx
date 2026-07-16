"use client";

import { useActionState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, formAction, isPending] = useActionState(resetPasswordAction, {
    success: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-green-500/10 text-green-500 p-4 rounded-md border border-green-500/20">
          {state.message || "Password successfully reset."} Redirecting to login...
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token || ""} />
      
      {(!token && !state.message) && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/30">
          Invalid or missing reset token.
        </div>
      )}
      
      {state.message && !state.success && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/30">
          {state.message}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className="bg-background/50 border-border/50"
          disabled={isPending || !token}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="bg-background/50 border-border/50"
          disabled={isPending || !token}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !token}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resetting...
          </>
        ) : (
          "Reset Password"
        )}
      </Button>
      
      {!token && (
        <div className="text-center mt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/forgot-password">Request New Token</Link>
          </Button>
        </div>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md bg-card/40 border-border/50 sg-glass">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
