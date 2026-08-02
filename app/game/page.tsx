import { redirect } from "next/navigation";

/**
 * Legacy `/game` was a separate flat-canvas Tuxemon prototype.
 * The real Saints overworld (Babylon 2.5D, custom NPCs/creatures, soul-camera HUD)
 * lives at `/lobby`. Keep this route as a redirect so bookmarks don't strand people
 * on the old stub.
 */
export default function GamePage() {
  redirect("/lobby");
}
