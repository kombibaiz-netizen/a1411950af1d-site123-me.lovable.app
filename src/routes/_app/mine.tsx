import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pickaxe, Zap, Cpu, ArrowUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addEarning, spendSats } from "@/lib/earn";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mine")({ component: Mine });

type Rig = {
  id: string;
  name: string;
  hashRate: number; // visual H/s
  rate: number;     // sats per second
  cost: number;     // cost in sats
  emoji: string;
};

const RIGS: Rig[] = [
  { id: "cpu",    name: "Old CPU",         hashRate: 90,    rate: 0.3, cost: 0,      emoji: "💻" },
  { id: "gpu",    name: "Gaming GPU",      hashRate: 450,   rate: 1.0, cost: 2_500,  emoji: "🎮" },
  { id: "asic1",  name: "ASIC S9",         hashRate: 1_400, rate: 2.5, cost: 12_000, emoji: "⚙️" },
  { id: "asic2",  name: "ASIC S19 Pro",    hashRate: 4_200, rate: 6.0, cost: 50_000, emoji: "🛠️" },
  { id: "farm",   name: "Mining Farm",     hashRate: 12_500,rate: 18,  cost: 200_000,emoji: "🏭" },
];

const STORAGE_KEY = "mine_state_v2";
const OFFLINE_CAP_SECONDS = 60 * 60 * 8; // 8h offline cap

type SavedState = { rigId: string; pending: number; lastSeen: number };

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { rigId: "cpu", pending: 0, lastSeen: Date.now() };
}

function Mine() {
  const { profile, refreshProfile } = useAuth();
  const initial = useMemo(loadState, []);
  const [rigId, setRigId] = useState(initial.rigId);
  const [pending, setPending] = useState(initial.pending);
  const [autoClaim, setAutoClaim] = useState(true);
  const [boost, setBoost] = useState(1);
  const [hashJitter, setHashJitter] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenRef = useRef(initial.lastSeen);

  const rig = RIGS.find((r) => r.id === rigId) ?? RIGS[0];
  const balance = profile?.sats_balance ?? 0;

  // Catch-up offline earnings on mount
  useEffect(() => {
    const now = Date.now();
    const elapsed = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, Math.floor((now - lastSeenRef.current) / 1000)));
    if (elapsed > 5) {
      const offline = +(elapsed * rig.rate * 0.5).toFixed(2); // 50% efficiency offline
      if (offline > 0) {
        setPending((p) => +(p + offline).toFixed(2));
        toast.success(`+${offline.toFixed(0)} sats mined while you were away (${Math.floor(elapsed/60)}m)`, { duration: 3000 });
      }
    }
    toast.success(`${rig.emoji} ${rig.name} online — mining in background`, { id: "rig-on", duration: 1500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foreground tick (always running, no on/off)
  useEffect(() => {
    tick.current = setInterval(() => {
      setHashJitter(Math.random() * 0.15);
      setPending((p) => +(p + rig.rate * boost).toFixed(2));
      lastSeenRef.current = Date.now();
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [rig.rate, boost]);

  // Persist state continuously + on unload
  useEffect(() => {
    const save = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rigId, pending, lastSeen: Date.now() }));
    };
    save();
    window.addEventListener("beforeunload", save);
    window.addEventListener("visibilitychange", save);
    return () => {
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("visibilitychange", save);
    };
  }, [rigId, pending]);

  const claim = async () => {
    const amount = Math.floor(pending);
    if (amount < 1) { toast.error("Mine more first"); return false; }
    try {
      await addEarning("mining", amount, { boost, rig: rig.id });
      setPending((p) => +(p - amount).toFixed(2));
      refreshProfile();
      toast.success(`+${amount} sats claimed!`);
      return true;
    } catch { toast.error("Failed"); return false; }
  };

  // Auto-claim threshold
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

  const buyRig = async (target: Rig) => {
    if (target.cost === 0) { setRigId(target.id); return; }
    if (balance < target.cost) { toast.error(`Need ${target.cost.toLocaleString()} sats`); return; }
    toast.loading("Upgrading rig...", { id: "buy" });
    try {
      await spendSats(target.cost, "rig_upgrade", { rig: target.id });
      setRigId(target.id);
      refreshProfile();
      toast.success(`${target.emoji} ${target.name} purchased!`, { id: "buy" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed", { id: "buy" });
    }
  };

  const currentIdx = RIGS.findIndex((r) => r.id === rig.id);

  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Pickaxe className="h-5 w-5 text-primary" /> Mining Rig</h1>
        <p className="text-xs text-muted-foreground">Runs in background · catches up offline (cap 8h)</p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-8 text-center shadow-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="relative">
          <div className="mx-auto h-32 w-32 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse-glow text-5xl">
            {rig.emoji}
          </div>
          <div className="mt-4 text-sm font-semibold text-primary">{rig.name}</div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{pending.toFixed(2)} <span className="text-primary text-base">sats</span></div>
          <div className="text-xs text-muted-foreground mt-1">
            {(rig.hashRate * (1 + hashJitter)).toFixed(0)} H/s · {(rig.rate * boost).toFixed(1)} sats/s{boost>1?` · ${boost}× boost`:""}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={claim} disabled={pending < 1} className="bg-gradient-primary text-primary-foreground font-semibold">Claim now</Button>
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

      <div>
        <h2 className="text-sm font-bold flex items-center gap-2 mb-2"><Cpu className="h-4 w-4 text-primary" /> Upgrade your computer</h2>
        <div className="space-y-2">
          {RIGS.map((r, i) => {
            const owned = i <= currentIdx;
            const isCurrent = r.id === rig.id;
            const locked = i > currentIdx + 1; // must upgrade in order
            const canAfford = balance >= r.cost;
            return (
              <div
                key={r.id}
                className={`rounded-2xl border p-3 flex items-center gap-3 ${isCurrent ? "border-primary bg-primary/5" : "border-border bg-card"}`}
              >
                <div className="text-3xl">{r.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {r.name}
                    {isCurrent && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.hashRate.toLocaleString()} H/s · {r.rate} sats/s</div>
                </div>
                {owned ? (
                  isCurrent ? (
                    <span className="text-xs text-primary font-medium">In use</span>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setRigId(r.id)}>Use</Button>
                  )
                ) : locked ? (
                  <Button size="sm" variant="ghost" disabled><Lock className="h-3 w-3 mr-1" />Locked</Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={!canAfford}
                    onClick={() => buyRig(r)}
                    className="bg-gradient-primary text-primary-foreground"
                  >
                    <ArrowUp className="h-3 w-3 mr-1" />
                    {r.cost.toLocaleString()}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Background mining:</strong> your rig keeps producing sats while the app is closed (50% efficiency, capped at 8h). Claims are paid from the platform reward pool.
      </div>
    </div>
  );
}
