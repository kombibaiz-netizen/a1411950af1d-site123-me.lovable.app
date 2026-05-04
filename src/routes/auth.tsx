import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bitcoin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
});

function AuthPage() {
  const { ref } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [refCode, setRefCode] = useState(ref ?? (typeof window !== "undefined" ? localStorage.getItem("ref_code") ?? "" : ""));

  useEffect(() => {
    if (user) navigate({ to: "/feed" });
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/feed`,
        data: { username: username || email.split("@")[0], referral_code: refCode || null },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    localStorage.removeItem("ref_code");
    toast.success("Account created! You're in.");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
  };

  const handleGoogle = async () => {
    setLoading(true);
    if (refCode) localStorage.setItem("ref_code", refCode);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/feed`,
    });
    if (result.error) { setLoading(false); toast.error(result.error.message ?? "Google sign-in failed"); return; }
    if (result.redirected) return;
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Bitcoin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">SatsEarn</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <Button type="button" onClick={handleGoogle} disabled={loading} variant="outline" className="w-full mb-4 font-medium">
            <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.7 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </Button>
          <div className="relative mb-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div></div>
          <Tabs defaultValue={refCode ? "signup" : "signin"}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-semibold">{loading ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2"><Label>Username</Label><Input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="satoshi" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Invite code <span className="text-muted-foreground text-xs">(optional, +500 sats)</span></Label>
                  <Input value={refCode} onChange={(e)=>setRefCode(e.target.value.toUpperCase())} placeholder="ABCD1234" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-semibold">{loading ? "Creating..." : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="mt-4 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" /> Secured with end-to-end encryption · HIBP password check
          </p>
        </div>
      </div>
    </div>
  );
}