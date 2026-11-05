import Finder from "@/components/Finder";
import { listSpots } from "@/lib/spots";

export const dynamic = "force-dynamic";

export default async function Home() {
  const spots = await listSpots();
  return <Finder initial={spots} />;
}
