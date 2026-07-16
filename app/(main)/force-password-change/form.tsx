"use client";

import { useActionState, useEffect } from "react";
import { forcePasswordChangeAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForcePasswordChangeForm() {
  const [state, formAction, isPending] = useActionState(forcePasswordChangeAction, {
    success: false,
    message: "",
  });

  useEffect(() => {
    if (state?.success) {
      // Small delay to let them see the success message, then reload to update session
      setTimeout(() => {
        window.location.href = "/home";
      }, 1500);
    }
  }, [state?.success]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="Minimum 8 characters"
              required 
              minLength={8}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              placeholder="Confirm your new password"
              required 
              minLength={8}
            />
          </div>

          {state?.message && !state.success && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {state.message}
            </div>
          )}

          {state?.success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded flex items-center gap-2 text-sm text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              {state.message}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending || state?.success}>
            {isPending ? "Updating..." : state?.success ? "Success!" : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
