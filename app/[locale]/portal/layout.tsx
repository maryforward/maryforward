import { PortalSidebar } from "@/components/portal/PortalSidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <PortalSidebar />
      <main className="flex-1 overflow-auto">
        <div className="containerX py-8">{children}</div>
      </main>
    </div>
  );
}
