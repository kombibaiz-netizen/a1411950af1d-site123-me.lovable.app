import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, Plus, Zap, Bot } from "lucide-react";
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

function Feed() {
  const { refreshProfile } = useAuth();
  const [earned, setEarned] = useState(0);
  const [auto, setAuto] = useState(false);
  const [autoCount, setAutoCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
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

  const watchAd = async () => {
    toast.loading("Watching sponsored content...", { id: "ad" });
    return new Promise<boolean>((resolve) => {
      setTimeout(async () => {
        try {
          await addEarning("scroll", 50, { type: "ad" });
          setEarned((e) => e + 50);
          refreshProfile();
          toast.success("+50 sats from ad", { id: "ad" });
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
  }, [auto]);

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
        <button onClick={watchAd} className="w-full rounded-2xl bg-gradient-primary text-primary-foreground p-4 font-semibold flex items-center justify-center gap-2 shadow-glow">
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