import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, Plus, Zap, Bot, Tv, Gamepad2, Megaphone, Globe2 } from "lucide-react";
import { addEarning } from "@/lib/earn";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/feed")({ component: Feed });

const POSTS = [
  { user: "@satoshi", text: "Bitcoin halving energy. Stack accordingly. 🟧", color: "from-orange-500/20 to-yellow-500/10" },
  { user: "@hodlqueen", text: "Coffee, sunshine, and a little orange coin. ☀️", color: "from-pink-500/20 to-orange-500/10" },
  { user: "@nodeops", text: "Lightning channels rebalanced. Feels good. ⚡", color: "from-purple-500/20 to-blue-500/10" },
  { user: "@minermike", text: "ASIC humming overnight. Sweet white noise.", color: "from-emerald-500/20 to-teal-500/10" },
  { user: "@cypherpunk", text: "Privacy is not a crime. Self-custody is freedom.", color: "from-cyan-500/20 to-blue-500/10" },
  { user: "@orangepilled", text: "Just told my barista about Lightning. She zapped me back.", color: "from-amber-500/20 to-rose-500/10" },
];

const AD_NETWORKS = [
  { id: "admob",       name: "Google AdMob",   icon: Megaphone, payout: 60, cpm: "$8.20", color: "from-blue-500/20 to-emerald-500/10",  badge: "bg-blue-500/15 text-blue-400" },
  { id: "unity",       name: "Unity Ads",      icon: Gamepad2,  payout: 75, cpm: "$11.40", color: "from-zinc-500/20 to-slate-500/10",   badge: "bg-zinc-500/15 text-zinc-300" },
  { id: "ironsource",  name: "ironSource",     icon: Tv,        payout: 55, cpm: "$7.10",  color: "from-purple-500/20 to-fuchsia-500/10", badge: "bg-purple-500/15 text-purple-400" },
  { id: "applovin",    name: "AppLovin MAX",   icon: Zap,       payout: 80, cpm: "$12.90", color: "from-amber-500/20 to-orange-500/10", badge: "bg-amber-500/15 text-amber-400" },
  { id: "meta",        name: "Meta Audience",  icon: Globe2,    payout: 65, cpm: "$9.30",  color: "from-sky-500/20 to-indigo-500/10",   badge: "bg-sky-500/15 text-sky-400" },
] as const;

type Network = typeof AD_NETWORKS[number];

function Feed() {
  const { refreshProfile } = useAuth();
  const [earned, setEarned] = useState(0);
  const [auto, setAuto] = useState(false);
  const [autoCount, setAutoCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(AD_NETWORKS.map(n => [n.id, true]))
  );
  const [networkStats, setNetworkStats] = useState<Record<string, { count: number; sats: number }>>(
    () => Object.fromEntries(AD_NETWORKS.map(n => [n.id, { count: 0, sats: 0 }]))
  );
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handler = (e: IntersectionObserverEntry[]) => {
      e.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          if (!seen.current.has(idx)) {
            seen.current.add(idx);
            try {
              const reward = 2 + Math.floor(Math.random() * 4);
              await addEarning("scroll", reward, { post: idx });
              setEarned((e) => e + reward);
              refreshProfile();
            } catch {}
          }
        }
      });
    };
    const obs = new IntersectionObserver(handler, { threshold: 0.6 });
    document.querySelectorAll("[data-idx]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [refreshProfile]);

  const pickNetwork = (): Network | null => {
    const active = AD_NETWORKS.filter(n => enabled[n.id]);
    if (active.length === 0) return null;
    return active[Math.floor(Math.random() * active.length)];
  };

  const watchAd = async (forced?: Network) => {
    const net = forced ?? pickNetwork();
    if (!net) {
      toast.error("Enable at least one ad network");
      return false;
    }
    toast.loading(`Loading ${net.name}…`, { id: "ad" });
    return new Promise<boolean>((resolve) => {
      setTimeout(async () => {
        try {
          await addEarning("scroll", net.payout, { type: "ad", network: net.id });
          setEarned((e) => e + net.payout);
          setNetworkStats((s) => ({
            ...s,
            [net.id]: { count: s[net.id].count + 1, sats: s[net.id].sats + net.payout },
          }));
          refreshProfile();
          toast.success(`+${net.payout} sats · ${net.name}`, { id: "ad" });
          resolve(true);
        } catch {
          toast.error("Failed", { id: "ad" });
          resolve(false);
        }
      }, 1500);
    });
  };

  // Auto-watch sponsored loop: one ad every 30s while enabled
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    const AD_INTERVAL = 30;
    let remaining = 0;

    const runAd = async () => {
      if (cancelled) return;
      const ok = await watchAd();
      if (ok) setAutoCount((c) => c + 1);
      remaining = AD_INTERVAL;
      setCooldown(remaining);
    };

    runAd();
    const i = setInterval(() => {
      if (cancelled) return;
      remaining = Math.max(0, remaining - 1);
      setCooldown(remaining);
      if (remaining === 0) runAd();
    }, 1000);

    return () => { cancelled = true; clearInterval(i); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, enabled]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">For You</h1>
          <p className="text-xs text-muted-foreground">Scroll to earn sats</p>
        </div>
        <div className="text-xs text-primary font-mono bg-primary/10 px-3 py-1.5 rounded-full">
          +{earned} sats this session
        </div>
      </div>

      <div className="space-y-2">
        <button onClick={() => watchAd()} className="w-full rounded-2xl bg-gradient-primary text-primary-foreground p-4 font-semibold flex items-center justify-center gap-2 shadow-glow">
          <Zap className="h-4 w-4" /> Watch sponsored — earn 50 sats
        </button>
        <button
          onClick={() => setAuto((a) => !a)}
          className={`w-full rounded-2xl p-3 font-medium flex items-center justify-between gap-2 border transition ${auto ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground"}`}
        >
          <span className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {auto ? "Auto-watch ON" : "Enable auto-watch agent"}
          </span>
          <span className="text-xs font-mono opacity-80">
            {auto ? (cooldown > 0 ? `next in ${cooldown}s · ${autoCount} ads` : `running · ${autoCount} ads`) : "+50 sats / 30s"}
          </span>
        </button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Ad networks</div>
            <div className="text-[11px] text-muted-foreground">Mediated waterfall · tap to play a specific network</div>
          </div>
          <div className="text-[11px] font-mono text-primary">{AD_NETWORKS.filter(n=>enabled[n.id]).length}/{AD_NETWORKS.length} live</div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {AD_NETWORKS.map((n) => {
            const Icon = n.icon;
            const stat = networkStats[n.id];
            const on = enabled[n.id];
            return (
              <div key={n.id} className={`rounded-xl border p-3 flex items-center gap-3 bg-gradient-to-br ${n.color} ${on ? "border-primary/40" : "border-border opacity-60"}`}>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${n.badge}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{n.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    eCPM {n.cpm} · {n.payout} sats/ad · {stat.count} shown · +{stat.sats} sats
                  </div>
                </div>
                <button
                  onClick={() => watchAd(n)}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground"
                >
                  Play
                </button>
                <button
                  onClick={() => setEnabled((p) => ({ ...p, [n.id]: !p[n.id] }))}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md border ${on ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                >
                  {on ? "ON" : "OFF"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {POSTS.map((p, i) => (
        <article key={i} data-idx={i} className={`rounded-2xl border border-border bg-gradient-to-br ${p.color} bg-card p-5 min-h-[280px] flex flex-col justify-between shadow-card`}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">{p.user[1].toUpperCase()}</div>
              <div className="font-medium text-sm">{p.user}</div>
            </div>
            <p className="text-lg font-medium leading-snug">{p.text}</p>
          </div>
          <div className="flex items-center justify-between mt-4 text-muted-foreground">
            <button className="flex items-center gap-1.5 text-sm"><Heart className="h-4 w-4" /> {Math.floor(Math.random()*900)+10}</button>
            <button className="flex items-center gap-1.5 text-sm"><Plus className="h-4 w-4" /> Follow</button>
            <span className="text-xs text-primary">+sats earned</span>
          </div>
        </article>
      ))}
    </div>
  );
}