import { motion } from "motion/react";

/* ══════════════════════════════════════════════════════════════════
   Komponen UI gamifikasi FitLearn — dipakai di Dashboard (dan halaman
   lain nanti). Semua playful: sudut membulat besar, warna cerah, XP bar,
   streak api, badge, dan kartu quest. Tanpa maskot — cukup emoji + warna.
   ══════════════════════════════════════════════════════════════════ */

const FONT_DISPLAY = "'Baloo 2', 'Sora', sans-serif";

/** Panel besar untuk hero gamifikasi — gradient ceria. */
export function HeroPanel({ children, className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-7 text-white ${className}`}
      style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #5B4BE6 45%, #8E7BFF 100%)" }}
    >
      {/* Bola dekoratif */}
      <div className="pointer-events-none absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-accent/30 blur-2xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Bar XP dengan level badge & progress ke level berikutnya. */
export function LevelBar({ level, title, intoLevel, span, toNext, progress, labels }) {
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 shrink-0">
            <span className="text-[10px] uppercase tracking-wide text-white/70 leading-none">{labels.level}</span>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{level}</span>
          </div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700 }} className="leading-tight">{title}</div>
            <div className="text-white/70 text-xs mt-0.5">{labels.toNext.replace("{n}", toNext)}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600 }}>{intoLevel}/{span}</div>
          <div className="text-white/60 text-[11px]">XP</div>
        </div>
      </div>
      <div className="h-3.5 rounded-full bg-white/20 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #FFD36E 0%, #FF9E45 100%)" }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/** Kartu streak "api" — makin panjang makin ramai. */
export function StreakCard({ current, best, activeToday, labels }) {
  const hot = current > 0;
  return (
    <div className="rounded-3xl p-5 bg-white dark:bg-surface-dark border border-neutral-200 dark:border-white/8 shadow-sm">
      <div className="flex items-center gap-3">
        <motion.div
          animate={hot ? { scale: [1, 1.12, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${hot ? "bg-accent/15" : "bg-neutral-100 dark:bg-white/5 grayscale opacity-60"}`}
        >
          🔥
        </motion.div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700 }} className="text-neutral-900 dark:text-white leading-none">{current}</span>
            <span className="text-neutral-500 dark:text-neutral-400 text-sm">{labels.days}</span>
          </div>
          <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">{labels.streak}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-neutral-400 dark:text-neutral-500">{labels.best}: <b className="text-neutral-700 dark:text-neutral-200">{best}</b></span>
        {!activeToday && current === 0 && (
          <span className="text-accent font-medium">{labels.startToday}</span>
        )}
        {activeToday && <span className="text-accent font-medium">✓ {labels.doneToday}</span>}
      </div>
    </div>
  );
}

/** Kartu statistik besar bergaya "game stat" — emoji + angka gede. */
export function StatCard({ emoji, label, value, unit, tone = "primary", hint }) {
  const tones = {
    primary: "from-primary/12 to-primary/5 text-primary dark:text-white ring-primary/20",
    accent: "from-accent/15 to-accent/5 text-accent ring-accent/25",
    fun: "from-fun/15 to-fun/5 text-fun ring-fun/25",
    warning: "from-warning/15 to-warning/5 text-warning ring-warning/25",
    danger: "from-danger/15 to-danger/5 text-danger ring-danger/25",
    muted: "from-neutral-200/50 to-neutral-100/30 dark:from-white/8 dark:to-white/3 text-neutral-400 ring-neutral-200/50 dark:ring-white/10",
  };
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`rounded-3xl p-4 sm:p-5 bg-linear-to-br ${tones[tone]} ring-1 border border-transparent`}
    >
      <div className="text-3xl leading-none mb-2">{emoji}</div>
      <div className="flex items-baseline gap-1">
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(24px,6vw,32px)", fontWeight: 700 }} className="text-neutral-900 dark:text-white leading-none">
          {value}
        </span>
        {unit && <span className="text-neutral-400 text-sm">{unit}</span>}
      </div>
      <div className="text-neutral-600 dark:text-neutral-300 text-sm font-medium mt-1">{label}</div>
      {hint && <div className="text-neutral-400 dark:text-neutral-500 text-xs mt-0.5">{hint}</div>}
    </motion.div>
  );
}

/** Satu baris quest harian dengan progress bar & centang saat selesai. */
export function QuestRow({ emoji, title, current, target, unit, progress, done, labels }) {
  const shown = unit === "hours" ? `${current}/${target} ${labels.unitHours}` : `${current}/${target}`;
  return (
    <div className={`rounded-2xl p-3.5 border transition-colors ${done ? "bg-accent/8 border-accent/30" : "bg-neutral-50 dark:bg-white/3 border-neutral-200 dark:border-white/8"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${done ? "bg-accent/20" : "bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10"}`}>
          {done ? "✅" : emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-800 dark:text-neutral-100 text-sm font-semibold truncate">{title}</span>
            <span className="text-neutral-500 dark:text-neutral-400 text-xs shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{shown}</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden mt-1.5">
            <motion.div
              className={`h-full rounded-full ${done ? "bg-accent" : "bg-primary"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Rak badge — koleksi pencapaian, terkunci abu-abu. */
export function BadgeShelf({ badges, nameOf }) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {badges.map((b) => (
        <motion.div
          key={b.id}
          whileHover={b.unlocked ? { scale: 1.08, rotate: -4 } : {}}
          title={nameOf(b.id)}
          className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border text-center px-1
            ${b.unlocked
              ? "bg-accent/10 border-accent/25"
              : "bg-neutral-100 dark:bg-white/3 border-neutral-200 dark:border-white/8 grayscale opacity-45"}`}
        >
          <span className="text-2xl leading-none">{b.emoji}</span>
          <span className={`text-[9px] leading-tight ${b.unlocked ? "text-neutral-600 dark:text-neutral-300" : "text-neutral-400"}`}>
            {nameOf(b.id)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/** Judul seksi bergaya playful dengan emoji. */
export function SectionTitle({ emoji, children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {emoji && <span className="text-xl">{emoji}</span>}
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700 }} className="text-neutral-900 dark:text-white">{children}</h3>
      </div>
      {action}
    </div>
  );
}
