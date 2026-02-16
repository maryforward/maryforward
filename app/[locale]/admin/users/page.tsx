import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isApproved: true,
      createdAt: true,
    },
  });
}

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("admin.users");
  const users = await getAllUsers();

  const getRoleBadge = (role: string, isApproved: boolean) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            {t("roles.admin")}
          </span>
        );
      case "CLINICIAN":
        return isApproved ? (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            {t("roles.clinician")}
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            {t("roles.pendingClinician")}
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-400">
            {t("roles.patient")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("description")}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.name")}</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.email")}</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.role")}</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.joined")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-sm text-slate-200">{user.name || "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{user.email}</td>
                <td className="px-4 py-3">{getRoleBadge(user.role, user.isApproved)}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
