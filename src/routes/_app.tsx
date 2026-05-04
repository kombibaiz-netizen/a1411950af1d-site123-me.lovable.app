import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { TopBar } from "@/components/app/TopBar";
import { BottomNav } from "@/components/app/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AppLayout,
});

function AppLayout() {
  const { loading } = useAuth();
  if (loading) return null;
  return (
    <div className="min-h-screen pb-20">
      <TopBar />
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}