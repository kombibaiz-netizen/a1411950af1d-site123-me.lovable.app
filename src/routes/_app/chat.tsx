import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addEarning } from "@/lib/earn";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chat")({ component: Chat });

type Msg = { role: "you" | "bot"; text: string };

const REPLIES = [
  "GM ☀️ Did you know stacking 100 sats a day = ~36k sats a year?",
  "Tip: Lightning withdrawals settle the fastest.",
  "Self-custody > exchanges. Always.",
  "Keep grinding — your balance is climbing.",
  "Have you tried the watch tab? Sats per minute.",
];

function Chat() {
  const { refreshProfile } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "Hey! I'm Sato, your earnings buddy. Chat with me to earn sats. 🟧" },
  ]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const sentToday = useRef(0);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMsgs((m) => [...m, { role: "you", text: userMsg }]);
    setText("");

    try {
      if (sentToday.current < 20) {
        await addEarning("chat", 5, { len: userMsg.length });
        sentToday.current++;
        refreshProfile();
      }
    } catch {}

    setTimeout(() => {
      setMsgs((m) => [...m, { role: "bot", text: REPLIES[Math.floor(Math.random()*REPLIES.length)] }]);
    }, 700);
  };

  const dailyBonus = async () => {
    try {
      await addEarning("chat", 100, { type: "daily" });
      refreshProfile();
      toast.success("+100 sats daily check-in!");
    } catch (e) { toast.error("Already claimed"); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
          <div>
            <div className="font-semibold text-sm">Sato</div>
            <div className="text-[11px] text-success">Online · +5 sats per message</div>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={dailyBonus}>Daily +100</Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "you" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${m.role === "you" ? "bg-gradient-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
        <Button type="submit" size="icon" className="bg-gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}