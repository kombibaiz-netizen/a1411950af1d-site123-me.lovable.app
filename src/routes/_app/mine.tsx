import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pickaxe, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addEarning } from "@/lib/earn";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mine")({ component: Mine });

function Mine() {
  const { refreshProfile } = useAuth();
  const [active, setActive] = useState(true);
  const [autoClaim, setAutoClaim] = useState(true);
  const [hashRate, setHashRate] = useState(0);
  const [pending, setPending] = useState(0);
  const [boost, setBoost] = useState(1);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-start mining session on mount + restore any prior pending
  useEffect(() => {
    const saved = Number(localStorage.getItem("mine_pending") || "0");
    if (saved > 0) setPending(saved);
    toast.success("Mining session auto-started", { id: "auto-mine", duration: 1500 });
  }, []);

  // Persist pending so the session feels continuous across reloads
  useEffect(() => {
    localStorage.setItem("mine_pending", String(pending));
  }, [pending]);

  useEffect(() => {
    if (!active) {
      if (tick.current) clearInterval(tick.current);
      setHashRate(0);
      return;
    }
    tick.current = setInterval(() => {
      setHashRate(80 + Math.random() * 40);
      setPending((p) => +(p + 0.3 * boost).toFixed(2));
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [active, boost]);

  const claim = async () => {
    const amount = Math.floor(pending);
    if (amount < 1) {
      toast.error("Mine more first");
      return false;
    }
    try {
      await addEarning("mining", amount, { boost });
      setPending(0);
      refreshProfile();
      toast.success(`+${amount} sats claimed!`);
      return true;
    } catch { toast.error("Failed"); }
    return false;
  };

  // Auto-claim when pending crosses a threshold
  useEffect(() => {
    if (!autoClaim) return;
    if (pending >= 25) { claim(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, autoClaim]);

  const activateBoost = () => {
    setBoost(3);
    toast.success("3× boost active for 60s");
    setTimeout(() => setBoost(1), 60000);
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Pickaxe className="h-5 w-5 text-primary" /> Idle Mining</h1>
        <p className="text-xs text-muted-foreground">Simulated rewards from a shared pool</p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-8 text-center shadow-card relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-primary opacity-0 transition ${active ? "opacity-10" : ""}`} />
        <div className="relative">
          <button
            onClick={() => setActive(!active)}
            className={`mx-auto h-32 w-32 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow ${active ? "animate-pulse-glow" : ""}`}
          >
            <Pickaxe className="h-14 w-14 text-primary-foreground" />
          </button>
          <div className="mt-6 text-3xl font-bold tabular-nums">{pending.toFixed(2)} <span className="text-primary text-base">sats</span></div>
          <div className="text-xs text-muted-foreground mt-1">
            {active ? `Mining at ${hashRate.toFixed(0)} H/s${boost>1?` · ${boost}× boost`:""}` : "Tap pickaxe to start"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={claim} disabled={pending < 1} className="bg-gradient-primary text-primary-foreground font-semibold">Claim</Button>
        <Button onClick={activateBoost} variant="secondary" disabled={boost > 1}>
          <Zap className="h-4 w-4 mr-1" /> 3× Boost
        </Button>
      </div>

      <button
        onClick={() => setAutoClaim((v) => !v)}
        className={`w-full rounded-2xl p-3 text-sm font-medium border transition ${autoClaim ? "bg-primary/10 border-primary text-primary" : "bg-card border-border"}`}
      >
        {autoClaim ? "Auto-claim ON · sends every 25 sats" : "Enable auto-claim"}
      </button>

      <div className="rounded-2xl bg-card border border-border p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Note:</strong> This is a gamified reward system, not actual SHA-256 mining. Sats come from the platform's reward pool.
      </div>
    </div>
  );
}