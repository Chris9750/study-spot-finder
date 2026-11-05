import { notFound, redirect } from "next/navigation";
import SpotForm from "@/components/SpotForm";
import { query } from "@/lib/db";
import type { Hours } from "@/lib/hours";
import { currentUser } from "@/lib/session";
import { idParam } from "@/lib/validate";

export const dynamic = "force-dynamic";

export default async function EditSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const id = idParam((await params).id);
  if (!id) notFound();
  if (!(await currentUser())) redirect(`/signin?next=/spots/${id}/edit`);

  const [s] = await query<{
    name: string; building: string | null; description: string | null; lat: number; lng: number;
    hours: Hours | null; bookable: boolean; booking_url: string | null; food_nearby: boolean; accessible: boolean;
  }>(
    `SELECT name, building, description, lat, lng, hours, bookable, booking_url, food_nearby, accessible
     FROM spots WHERE id = $1`,
    [id],
  );
  if (!s) notFound();

  return (
    <SpotForm
      mode="edit"
      spotId={id}
      initial={{
        ...s,
        building: s.building ?? "",
        description: s.description ?? "",
        booking_url: s.booking_url ?? "",
      }}
    />
  );
}
