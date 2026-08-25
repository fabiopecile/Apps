import { listLocations } from "@/data/catalog";
import { getSession, canEdit } from "@/lib/session";
import { LocationsManager } from "@/components/locations/LocationsManager";

export default async function StandortePage() {
  const [locations, session] = await Promise.all([listLocations(), getSession()]);
  return <LocationsManager locations={locations} canEdit={canEdit(session?.role)} />;
}
