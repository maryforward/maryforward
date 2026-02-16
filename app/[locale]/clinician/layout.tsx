import { ClinicianSidebar } from "@/components/clinician/ClinicianSidebar";

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <ClinicianSidebar />
      <main className="flex-1 overflow-auto">
        <div className="containerX py-8">{children}</div>
      </main>
    </div>
  );
}
