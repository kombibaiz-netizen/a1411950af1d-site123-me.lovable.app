import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bitcoin, Zap, Smartphone, Phone, CreditCard, Wallet as WalletIcon, Copy, Share2, Check, Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { requestWithdrawal } from "@/lib/earn";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/wallet")({ component: Wallet });

const METHODS = [
  { id: "bitcoin", label: "Bitcoin", icon: Bitcoin, placeholder: "bc1q…" },
  { id: "lightning", label: "Lightning", icon: Zap, placeholder: "lnbc… or you@walletofsatoshi.com" },
  { id: "bank", label: "Bank", icon: Landmark, placeholder: "IBAN / Account · SWIFT · Holder name" },
  { id: "orange_money", label: "Orange Money", icon: Phone, placeholder: "+225 07 00 00 00 00" },
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone, placeholder: "+254 7XX XXX XXX" },
  { id: "paypal", label: "PayPal", icon: CreditCard, placeholder: "you@email.com" },
  { id: "binance", label: "Binance", icon: WalletIcon, placeholder: "Binance Pay ID" },
] as const;

type Withdrawal = { id: string; method: string; amount_sats: number; status: string; created_at: string; destination: string };

function Wallet() {
  const { profile, refreshProfile } = useAuth();
  const [method, setMethod] = useState<string>("lightning");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState<string>("1000");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== "undefined" && profile
    ? `${window.location.origin}/?ref=${profile.referral_code}`
    : "";

  const loadHistory = async () => {
    if (!profile) return;
    const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setHistory(data as Withdrawal[]);
  };

  useEffect(() => { loadHistory(); }, [profile?.id]);
  // Poll to refresh withdrawal status (just reload history, no admin RPC)
  useEffect(() => {
    const i = setInterval(() => {
      if (history.some(w => w.status === "pending")) {
        loadHistory().catch(() => {});
      }
    }, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!destination.trim()) return toast.error("Add a destination");
    if (amt < 1000) return toast.error("Minimum 1,000 sats");
    setSubmitting(true);
    try {
      await requestWithdrawal(method, destination.trim(), amt);
      toast.success(`Withdrawal queued — settles in ~1 min`);
      setDestination("");
      refreshProfile();
      loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
    }
    setSubmitting(false);
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Join SatsEarn", text: "Earn Bitcoin with me!", url: inviteUrl }); } catch {}
    } else copyInvite();
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Balance */}
      <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-6 shadow-glow">
        <div className="text-xs uppercase tracking-wider opacity-80">Available balance</div>
        <div className="text-4xl font-bold tabular-nums mt-1">{(profile?.sats_balance ?? 0).toLocaleString()}</div>
        <div className="text-sm opacity-90 mt-1">sats · ≈ ${((profile?.sats_balance ?? 0) * 0.0006).toFixed(2)}</div>
      </div>

      {/* Invite */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold">Invite friends</div>
            <div className="text-xs text-muted-foreground">+1,000 sats per signup · they get +500</div>
          </div>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">{profile?.referral_code}</span>
        </div>
        <div className="flex gap-2">
          <Input value={inviteUrl} readOnly className="text-xs font-mono" />
          <Button variant="secondary" size="icon" onClick={copyInvite}>{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}</Button>
          <Button size="icon" className="bg-gradient-primary text-primary-foreground" onClick={shareInvite}><Share2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Withdraw */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="font-semibold mb-1">Withdraw</div>
        <div className="text-xs text-muted-foreground mb-4">Processed in ~1 minute · min 1,000 sats</div>

        <Tabs value={method} onValueChange={setMethod}>
          <TabsList className="grid grid-cols-4 h-auto bg-secondary/50 p-1 mb-4 gap-1">
            {METHODS.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="flex-col gap-1 py-2 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <m.icon className="h-4 w-4" />
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {METHODS.map((m) => (
            <TabsContent key={m.id} value={m.id} className="mt-0">
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Destination</Label>
                  <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={m.placeholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (sats)</Label>
                  <Input type="number" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
                  {submitting ? "Submitting…" : `Withdraw via ${m.label}`}
                </Button>
              </form>
            </TabsContent>
          ))}
        </Tabs>
        <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/40 p-3 rounded-lg">
          <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <span>End-to-end encrypted · destinations stored hashed · withdrawals signed server-side. Bank transfers settle in 1–3 business days; crypto rails in ~1 minute.</span>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="font-semibold mb-3">Recent withdrawals</div>
        {history.length === 0 && <div className="text-sm text-muted-foreground">No withdrawals yet.</div>}
        <div className="space-y-2">
          {history.map((w) => (
            <div key={w.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
              <div>
                <div className="font-medium capitalize">{w.method.replace("_", " ")}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{w.destination}</div>
              </div>
              <div className="text-right">
                <div className="font-mono">{w.amount_sats.toLocaleString()} sats</div>
                <div className={`text-[11px] capitalize ${w.status === "completed" ? "text-success" : w.status === "failed" ? "text-destructive" : "text-primary"}`}>{w.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}