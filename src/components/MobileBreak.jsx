import { motion } from "motion/react";
import { Clock, Eye, Activity, Footprints } from "lucide-react";

export function MobileBreak() {
  return (
    <div className="mx-auto bg-black/60 backdrop-blur-sm overflow-hidden rounded-[40px] border border-neutral-200 dark:border-white/10 shadow-2xl flex flex-col items-center justify-center p-5" style={{ width: 390, minHeight: 780 }}>
      <div className="w-full rounded-3xl bg-white dark:bg-surface-dark p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-linear-to-br from-warning/20 to-warning/5 border border-warning/30 flex items-center justify-center text-warning"
          >
            <Clock size={30} />
          </motion.div>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600 }} className="text-neutral-900 dark:text-white mt-4">
            Time for a Break
          </h3>
          <p className="text-neutral-500 mt-2" style={{ fontSize: 13, lineHeight: 1.55 }}>
            You've worked <span className="text-neutral-700 dark:text-neutral-200" style={{ fontWeight: 600 }}>52 min</span>. A short break can lift focus by up to <span className="text-accent" style={{ fontWeight: 600 }}>30%</span>.
          </p>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            { i: <Eye size={18} />, t: "2-min Eye Rest", d: "Look 20 ft away" },
            { i: <Activity size={18} />, t: "5-min Stretch", d: "Neck, shoulders, wrists" },
            { i: <Footprints size={18} />, t: "10-min Walk", d: "Step away from desk" },
          ].map((o, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-neutral-200 dark:border-white/10 hover:border-accent/40 active:bg-accent/5 active:scale-[0.99] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/15 text-primary dark:text-accent flex items-center justify-center shrink-0">
                {o.i}
              </div>
              <div className="flex-1">
                <div className="text-neutral-900 dark:text-white" style={{ fontSize: 13.5, fontWeight: 600 }}>{o.t}</div>
                <div className="text-neutral-500" style={{ fontSize: 11.5 }}>{o.d}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <button className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active active:scale-[0.98] text-white transition" style={{ fontSize: 14, fontWeight: 600 }}>
            Start Break Now
          </button>
          <button className="w-full py-3 rounded-2xl border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-[0.98] transition" style={{ fontSize: 14, fontWeight: 500 }}>
            Remind Me in 5 min
          </button>
        </div>
      </div>
    </div>
  );
}
