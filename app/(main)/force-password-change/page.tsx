import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ForcePasswordChangeForm from "./form";

export const metadata = {
  title: "Setup Account - Saints Gaming",
  description: "Please change your default password.",
};

export default async function ForcePasswordChangePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // If they somehow landed here but don't need to change password, send them home
  if (!session.user.forcePasswordChange) {
    redirect("/home");
  }

  return (
    <div className="container mx-auto flex h-[calc(100vh-200px)] w-full flex-col justify-center space-y-6 sm:w-[450px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Saints Gaming
        </h1>
        <p className="text-sm text-muted-foreground">
          You are using a default setup account. For security reasons, you must change your password before proceeding.
        </p>
      </div>
      <ForcePasswordChangeForm />
    </div>
  );
}
