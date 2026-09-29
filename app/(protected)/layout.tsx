import RequireAuth from "@/components/auth/require-auth";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
    <Sidebar>
      {children}
    </Sidebar>
    </RequireAuth>
  );
}