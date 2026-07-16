import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Saints Gaming account.",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/home");
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-14rem)] px-4 py-12">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to join the conversation</p>
        </div>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
