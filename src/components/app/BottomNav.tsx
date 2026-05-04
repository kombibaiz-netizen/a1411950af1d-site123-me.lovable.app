import { Link, useLocation } from "@tanstack/react-router";
import { Sparkles, MessageCircle, Film, Wallet, Handshake } from "lucide-react";

const items = [
  { to: "/reels", label: "Reels", icon: Film },
  { to: "/feed", label: "Feed", icon: Sparkles },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/partners", label: "Partner", icon: Handshake },
  { to: "/wallet", label: "Wallet", icon: Wallet },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-lg mx-auto grid grid-cols-5">
        {items.map((it) => {
          const active = pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px]">
              <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={active ? "text-primary font-medium" : "text-muted-foreground"}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}