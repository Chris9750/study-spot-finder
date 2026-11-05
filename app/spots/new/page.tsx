import { redirect } from "next/navigation";
import SpotForm from "@/components/SpotForm";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewSpotPage() {
  if (!(await currentUser())) redirect("/signin?next=/spots/new");
  return <SpotForm mode="create" />;
}
