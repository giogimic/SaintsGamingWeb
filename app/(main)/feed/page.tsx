import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function FeedRedirectPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile/inbox");
  }
  redirect("/profile/inbox");
}
