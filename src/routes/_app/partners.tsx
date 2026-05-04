import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Handshake, Building2, Megaphone, Coins, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_app/partners")({ component: Partners });

const TIERS = [
  { id: "advertiser", label: "Advertiser", icon: Megaphone, perk: "Sponsored posts in feed · pay per view" },
  { id: "brand", label: "Brand Partner", icon: Building2, perk: "Branded content + co-marketing" },
  { id: "liquidity", label: "Liquidity Provider", icon: Coins, perk: "Fund the sats reward pool · revenue share" },
];

const schema = z.object({
  company_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(255),
  partnership_type: z.enum(["advertiser","brand","liquidity"]),
  monthly_budget_usd: z.number().int().min(0).max(10_000_000),
  message: z.string().trim().max(1000).optional(),
});

type Application = { id: string; company_name: string; partnership_type: string; status: string; created_at: string };

function Partners() {
  const { user } = useAuth();
  const [type, setType] = useState<"advertiser"|"brand"|"liquidity">("advertiser");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState(user?.email ?? "");
  const [budget, setBudget] = useState("1000");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);

  const load = async () => {
    const { data } = await supabase.from("partners").select("id,company_name,partnership_type,status,created_at").order("created_at", { ascending: false });
    if (data) setApps(data as Application[]);
  };
  useEffect(() => { load(); }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      company_name: company, contact_email: contact, partnership_type: type,
      monthly_budget_usd: parseInt(budget || "0", 10), message: message || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
    if (!user) return toast.error("Sign in first");
    setSubmitting(true);
    const { error } = await supabase.from("partners").insert({ ...parsed.data, user_id: user.id });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted — we'll reach out within 48h");
    setCompany(""); setMessage(""); load();
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-6 shadow-glow">
        <Handshake className="h-7 w-7 mb-2" />
        <h1 className="text-2xl font-bold">Partnership Protocol</h1>
        <p className="text-sm opacity-90 mt-1">Power the sats reward pool. Reach engaged earners. Share revenue.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {TIERS.map(t => (
          <button key={t.id} onClick={() => setType(t.id as typeof type)}
            className={`text-left rounded-2xl border p-4 transition ${type===t.id ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card"}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center"><t.icon className="h-5 w-5 text-primary" /></div>
              <div className="flex-1">
                <div className="font-semibold">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.perk}</div>
              </div>
              {type===t.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="rounded-2xl bg-card border border-border p-5 shadow-card space-y-3">
        <div className="font-semibold">Apply</div>
        <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={company} onChange={e=>setCompany(e.target.value)} maxLength={120} required /></div>
        <div className="space-y-1.5"><Label className="text-xs">Contact email</Label><Input type="email" value={contact} onChange={e=>setContact(e.target.value)} maxLength={255} required /></div>
        <div className="space-y-1.5"><Label className="text-xs">Monthly budget (USD)</Label><Input type="number" min={0} value={budget} onChange={e=>setBudget(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Message</Label><Textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} rows={3} placeholder="Tell us about your goals…" /></div>
        <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-success" /> Reviewed under NDA · KYB required before launch</p>
      </form>

      {apps.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
          <div className="font-semibold mb-3">Your applications</div>
          <div className="space-y-2">
            {apps.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <div className="font-medium">{a.company_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{a.partnership_type}</div>
                </div>
                <span className={`text-[11px] capitalize px-2 py-1 rounded ${a.status==="approved"?"bg-success/10 text-success":a.status==="rejected"?"bg-destructive/10 text-destructive":"bg-primary/10 text-primary"}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
