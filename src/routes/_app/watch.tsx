import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Film } from "lucide-react";
import { addEarning } from "@/lib/earn";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/watch")({ component: Watch });

const MOVIES = [
  { title: "The Halving", genre: "Documentary · 12 min", rate: 10, hue: "from-orange-500/30 to-amber-700/20" },
  { title: "Lightning Run", genre: "Action Short · 8 min", rate: 12, hue: "from-violet-600/30 to-fuchsia-700/20" },
  { title: "Cypherpunk Dawn", genre: "Drama · 15 min", rate: 10, hue: "from-emerald-600/30 to-cyan-700/20" },
  { title: "Block 21M", genre: "Sci-Fi · 18 min", rate: 14, hue: "from-rose-600/30 to-orange-700/20" },
];

function Watch() {
  const { refreshProfile } = useAuth();
  const [playing, setPlaying] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing === null) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing]);

  useEffect(() => {
    if (playing !== null && seconds > 0 && seconds % 30 === 0) {
      const reward = MOVIES[playing].rate;
      addEarning("watch", reward, { movie: MOVIES[playing].title }).then(() => {
        refreshProfile();
        toast.success(`+${reward} sats`, { duration: 1200 });
      }).catch(() => {});
    }
  }, [seconds, playing, refreshProfile]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Film className="h-5 w-5 text-primary" /> Watch & Earn</h1>
        <p className="text-xs text-muted-foreground">Sats every 30 seconds watched</p>
      </div>
      {MOVIES.map((m, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
          <div className={`aspect-video bg-gradient-to-br ${m.hue} relative flex items-center justify-center`}>
            <button
              onClick={() => { setPlaying(playing === i ? null : i); setSeconds(0); }}
              className="h-16 w-16 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-glow hover:scale-105 transition"
            >
              {playing === i ? <Pause className="h-7 w-7 text-primary-foreground" /> : <Play className="h-7 w-7 text-primary-foreground ml-1" />}
            </button>
            {playing === i && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                <span className="bg-black/50 backdrop-blur px-2 py-1 rounded-md font-mono">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</span>
                <span className="bg-primary/90 text-primary-foreground px-2 py-1 rounded-md font-semibold">+{m.rate}/30s</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="font-semibold">{m.title}</div>
            <div className="text-xs text-muted-foreground">{m.genre}</div>
          </div>
        </div>
      ))}
    </div>
  );
}