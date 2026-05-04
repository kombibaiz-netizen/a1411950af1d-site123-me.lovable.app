import { Bitcoin, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const { profile, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Bitcoin className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Balance</div>
            <div className="font-bold text-base leading-tight tabular-nums">
              {(profile?.sats_balance ?? 0).toLocaleString()} <span className="text-primary text-xs">sats</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}