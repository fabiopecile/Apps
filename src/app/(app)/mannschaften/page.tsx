import { listTeams } from "@/data/catalog";
import { getSession, canEdit } from "@/lib/session";
import { TeamsManager } from "@/components/teams/TeamsManager";

export default async function MannschaftenPage() {
  const [teams, session] = await Promise.all([listTeams(), getSession()]);
  return <TeamsManager teams={teams} canEdit={canEdit(session?.role)} />;
}
