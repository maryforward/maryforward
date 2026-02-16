import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { ApprovalActions } from "@/components/admin/ApprovalActions";
import { getTranslations } from "next-intl/server";

async function getPendingClinicians() {
  return prisma.user.findMany({
    where: { role: "CLINICIAN", isApproved: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      specialty: true,
      licenseNumber: true,
      institution: true,
      createdAt: true,
    },
  });
}

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("admin.approvals");
  const pendingClinicians = await getPendingClinicians();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("description")}
        </p>
      </div>

      {pendingClinicians.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-200">{t("empty.title")}</h3>
          <p className="mt-2 text-sm text-slate-400">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingClinicians.map((clinician) => (
            <div
              key={clinician.id}
              className="rounded-xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-50">
                      {clinician.name}
                    </h3>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                      {t("status.pending")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{clinician.email}</p>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-slate-500">{t("fields.specialty")}</dt>
                      <dd className="mt-1 text-sm text-slate-200">
                        {clinician.specialty || t("fields.notProvided")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{t("fields.licenseNumber")}</dt>
                      <dd className="mt-1 text-sm text-slate-200">
                        {clinician.licenseNumber || t("fields.notProvided")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{t("fields.institution")}</dt>
                      <dd className="mt-1 text-sm text-slate-200">
                        {clinician.institution || t("fields.notProvided")}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-4 text-xs text-slate-500">
                    {t("registered", { date: formatDateTime(clinician.createdAt) })}
                  </p>
                </div>

                <ApprovalActions clinicianId={clinician.id} clinicianName={clinician.name || t("thisClinicianFallback")} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
