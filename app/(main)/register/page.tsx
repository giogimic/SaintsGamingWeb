import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a Saints Gaming account.",
};

export default function RegisterPage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-14rem)] px-4 py-12">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Join Saints Gaming</h1>
          <p className="text-muted-foreground">Create an account to participate in the community</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
