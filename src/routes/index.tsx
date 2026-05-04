import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bitcoin, Zap, MessageCircle, Film, Pickaxe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Landing,
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
});

function Landing() {
  const { ref } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ref) localStorage.setItem("ref_code", ref);
  }, [ref]);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed" });
  }, [user, loading, navigate]);

  const features = [
    { icon: Zap, title: "Scroll & Earn", desc: "Stack sats per swipe on the feed" },
    { icon: MessageCircle, title: "Chat & Earn", desc: "Daily messaging rewards" },
    { icon: Film, title: "Watch & Earn", desc: "Sats per minute watched" },
    { icon: Pickaxe, title: "Idle Mining", desc: "Passive sats while you sleep" },
  ];

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Bitcoin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">SatsEarn</span>
        </div>
        <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <section className="text-center max-w-3xl mx-auto">
          {ref && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-6">
              <Zap className="h-3.5 w-3.5" /> Invited by <code className="font-mono">{ref}</code> · +500 sats bonus
            </div>
          )}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Earn <span className="text-gradient-primary">Bitcoin</span><br/>doing what you already do.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Stack Satoshi by scrolling, chatting, watching videos, and passive idle mining. Withdraw to Lightning, on-chain BTC, Orange Money, Mobile Money, PayPal or Binance.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold">
                Start earning <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free forever · No card · Withdraw from 1,000 sats</p>
        </section>

        <section className="mt-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-card border border-border p-6 shadow-card hover:border-primary/50 transition">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-base">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 rounded-3xl bg-card border border-border p-8 sm:p-12 text-center shadow-card">
          <h2 className="text-3xl font-bold">Withdraw your way</h2>
          <p className="mt-3 text-muted-foreground">Six payout rails. Processed in ~1 minute.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Bitcoin", "Lightning ⚡", "Orange Money", "Mobile Money", "PayPal", "Binance"].map((m) => (
              <span key={m} className="px-4 py-2 rounded-full bg-secondary text-sm font-medium border border-border">{m}</span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
