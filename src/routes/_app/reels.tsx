import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Music2, Play, Zap } from "lucide-react";
import { addEarning } from "@/lib/earn";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reels")({ component: Reels });

const REELS = [
  { user: "@satoshi", caption: "When the halving hits 🟧⚡", song: "Orange Pill — Lo-fi remix", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg" },
  { user: "@nodeops", caption: "Routing 21 sats around the world ⚡", song: "Lightning Run — Synthwave", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg" },
  { user: "@hodlqueen", caption: "POV: you stacked through the bear 💎", song: "Diamond Hands — Trap", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg" },
  { user: "@cypherpunk", caption: "Privacy = freedom 🔐", song: "Cypher — Dark ambient", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg" },
  { user: "@minermike", caption: "ASIC ASMR 🎧", song: "White Noise FM", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg" },
  { user: "@orangepilled", caption: "Tipped my barista in sats ☕⚡", song: "Coffee Bean — Jazz", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg" },
];

function Reels() {
  const { refreshProfile } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [earned, setEarned] = useState(0);
  const [muted, setMuted] = useState(true);
  const watchTime = useRef<Record<number, number>>({});
  const rewarded = useRef<Set<number>>(new Set());
  const [likes, setLikes] = useState<Record<number, boolean>>({});

  // Observe which reel is active
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const idx = Number((e.target as HTMLElement).dataset.idx);
        const v = videoRefs.current[idx];
        if (!v) return;
        if (e.isIntersecting && e.intersectionRatio > 0.7) {
          setActive(idx);
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: [0, 0.7, 1] });
    containerRef.current?.querySelectorAll("[data-idx]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Track watch time on the active video and reward at 5s
  useEffect(() => {
    const v = videoRefs.current[active];
    if (!v) return;
    const tick = () => {
      watchTime.current[active] = (watchTime.current[active] ?? 0) + 0.5;
      if (watchTime.current[active] >= 5 && !rewarded.current.has(active)) {
        rewarded.current.add(active);
        const reward = 5 + Math.floor(Math.random() * 6);
        addEarning("reels", reward, { reel: active }).then(() => {
          setEarned((e) => e + reward);
          refreshProfile();
          toast.success(`+${reward} sats`, { duration: 1200, id: `r-${active}` });
        }).catch(() => {});
      }
    };
    const i = setInterval(() => { if (!v.paused) tick(); }, 500);
    return () => clearInterval(i);
  }, [active, refreshProfile]);

  const togglePlay = (i: number) => {
    const v = videoRefs.current[i];
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const like = (i: number) => setLikes((p) => ({ ...p, [i]: !p[i] }));

  return (
    <div className="-mx-0">
      {/* HUD */}
      <div className="fixed top-14 inset-x-0 z-30 flex items-center justify-between px-4 max-w-lg mx-auto pointer-events-none">
        <div className="text-sm font-bold text-white drop-shadow-lg">Reels</div>
        <div className="text-xs font-mono text-white bg-primary/80 backdrop-blur px-3 py-1.5 rounded-full pointer-events-auto shadow-glow flex items-center gap-1">
          <Zap className="h-3 w-3" /> +{earned} sats
        </div>
      </div>

      <div
        ref={containerRef}
        className="snap-y snap-mandatory overflow-y-scroll bg-black"
        style={{ height: "calc(100dvh - 5rem)" }}
      >
        {REELS.map((r, i) => (
          <section
            key={i}
            data-idx={i}
            className="snap-start relative w-full bg-black flex items-center justify-center overflow-hidden"
            style={{ height: "calc(100dvh - 5rem)" }}
          >
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              src={r.src}
              poster={r.poster}
              muted={muted}
              loop
              playsInline
              preload="metadata"
              onClick={() => togglePlay(i)}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

            {/* Tap to play indicator */}
            {videoRefs.current[i]?.paused && active === i && (
              <button onClick={() => togglePlay(i)} className="relative z-10 h-20 w-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                <Play className="h-10 w-10 text-white ml-1" fill="white" />
              </button>
            )}

            {/* Right action rail */}
            <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-5 text-white">
              <button onClick={() => like(i)} className="flex flex-col items-center gap-1">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center backdrop-blur ${likes[i] ? "bg-primary" : "bg-white/15"}`}>
                  <Heart className={`h-6 w-6 ${likes[i] ? "fill-white text-white" : "text-white"}`} />
                </div>
                <span className="text-[11px] font-semibold">{(Math.floor(Math.random()*900)+10) + (likes[i] ? 1 : 0)}</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <div className="h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"><MessageCircle className="h-6 w-6" /></div>
                <span className="text-[11px] font-semibold">{Math.floor(Math.random()*200)+5}</span>
              </button>
              <button onClick={() => navigator.share?.({ title: "Watch on SatsEarn", url: window.location.href }).catch(()=>{})} className="flex flex-col items-center gap-1">
                <div className="h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"><Share2 className="h-6 w-6" /></div>
                <span className="text-[11px] font-semibold">Share</span>
              </button>
              <button onClick={() => setMuted((m) => !m)} className="h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-[10px] font-bold">
                {muted ? "MUTE" : "ON"}
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute left-4 right-20 bottom-6 z-10 text-white">
              <div className="font-bold text-sm mb-1">{r.user}</div>
              <div className="text-sm leading-snug mb-2">{r.caption}</div>
              <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                <Music2 className="h-3 w-3" />
                <span className="truncate">{r.song}</span>
              </div>
              {!rewarded.current.has(i) && active === i && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-primary/90 px-2 py-1 rounded-full font-semibold">
                  <Zap className="h-3 w-3" /> Watch 5s to earn
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
