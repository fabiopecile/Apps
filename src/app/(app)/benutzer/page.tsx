import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listUsersAction } from "@/actions/users";
import { UsersManager } from "@/components/users/UsersManager";

export default async function BenutzerPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const result = await listUsersAction();
  if (!result.success) redirect("/dashboard");

  return <UsersManager users={result.data} currentUserId={session.id} />;
}
