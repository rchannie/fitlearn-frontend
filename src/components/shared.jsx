import { motion } from "motion/react";

const statusColors = {
  normal:   { ring: "stroke-accent",          text: "text-primary dark:text-accent",  bg: "bg-accent/10",          border: "border-accent/25" },
  warning:  { ring: "stroke-warning",         text: "text-warning",                   bg: "bg-warning/10",         border: "border-warning/25" },
  alert:    { ring: "stroke-danger",          text: "text-danger",                    bg: "bg-danger/10",          border: "border-danger/25" },
  inactive: { ring: "stroke-neutral-300 dark:stroke-neutral-600", text: "text-neutral-400", bg: "bg-neutral-100 dark:bg-white/5", border: "border-neutral-200 dark:border-white/10" },
};

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl bg-white dark:bg-surface-dark border border-neutral-200 dark:border-white/8 shadow-sm dark:shadow-none ${className}`}>
      {children}
    </div>
  );
}

export function HoverCard({ children, className = "" }) {
  return (
    <div className={`rounded-3xl bg-white dark:bg-surface-dark border border-neutral-200 dark:border-white/8 shadow-sm dark:shadow-none hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all cursor-pointer ${className}`}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, unit, delta, status = "normal", icon }) {
  const c = statusColors[status];
  return (
    <HoverCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <div className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm truncate">{label}</div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-neutral-900 dark:text-white font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(20px,5vw,28px)" }}>
              {value}
            </span>
            {unit && <span className="text-neutral-400 text-sm">{unit}</span>}
          </div>
          {delta && <div className={`${c.text} text-xs`}>{delta}</div>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
        )}
      </div>
    </HoverCard>
  );
}

export function GaugeRing({ value, max = 100, size = 140, label, unit, status = "normal" }) {
  const stroke = size < 100 ? 8 : 12;
  const radius = (size - stroke) / 2;
  const circ   = 2 * Math.PI * radius;
  // value null/NaN = belum/tidak terdeteksi → tampilkan "--", ring kosong.
  const missing = value == null || Number.isNaN(value);
  const pct    = missing ? 0 : Math.min(value / max, 1);
  const c      = missing ? statusColors.normal : statusColors[status];
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} className="stroke-neutral-200 dark:stroke-white/10" fill="none" />
        <motion.circle cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} strokeLinecap="round" fill="none"
          className={c.ring}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-semibold leading-none ${missing ? "text-neutral-300 dark:text-white/30" : "text-neutral-900 dark:text-white"}`} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size * 0.22 }}>
          {missing ? "--" : value}
          {unit && !missing && <span className="text-neutral-400" style={{ fontSize: size * 0.11 }}> {unit}</span>}
        </span>
        {label && <span className="text-neutral-400 mt-0.5" style={{ fontSize: 11 }}>{label}</span>}
      </div>
    </div>
  );
}

export function PrimaryButton({ children, onClick, className = "" }) {
  return (
    <button onClick={onClick}
      className={`px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${className}`}
      style={{ fontSize: 14 }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "" }) {
  return (
    <button onClick={onClick}
      className={`px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-white/15 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/8 hover:border-neutral-400 dark:hover:border-white/25 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${className}`}
      style={{ fontSize: 14 }}
    >
      {children}
    </button>
  );
}

export function Toggle({ on, onChange, disabled }) {
  return (
    <button disabled={disabled} onClick={() => onChange?.(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
        ${disabled ? "opacity-40 cursor-not-allowed bg-neutral-200 dark:bg-white/10"
                   : on ? "bg-accent" : "bg-neutral-300 dark:bg-white/15"}`}
    >
      <motion.span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ left: 0 }}
      />
    </button>
  );
}

export function Avatar({ name = "Raditya Santosa", status = "normal" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const dot = status === "normal" ? "bg-accent" : status === "warning" ? "bg-warning" : status === "alert" ? "bg-danger" : "bg-neutral-400";
  return (
    <div className="relative">
      <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-semibold">
        {initials}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-surface-dark ${dot}`} />
    </div>
  );
}

export function TimelineItem({ time, text, type = "info" }) {
  const dot = type === "info" ? "bg-accent" : type === "warning" ? "bg-warning" : "bg-danger";
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center">
        <span className={`w-2 h-2 rounded-full ${dot} mt-1.5 shrink-0`} />
        <span className="flex-1 w-px bg-neutral-200 dark:bg-white/8 my-1" />
      </div>
      <div className="flex-1 pb-2 min-w-0">
        <div className="text-neutral-400 text-xs font-mono">{time}</div>
        <div className="text-neutral-700 dark:text-neutral-200 text-sm mt-0.5 leading-snug">{text}</div>
      </div>
    </div>
  );
}

export function StatusPill({ status, label }) {
  const c = statusColors[status];
  const dot = status === "normal" ? "bg-accent" : status === "warning" ? "bg-warning" : status === "alert" ? "bg-danger" : "bg-neutral-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      {label}
    </span>
  );
}

/** Header halaman student-friendly: ikon dalam chip gradient + judul Baloo + subjudul. */
export function PageHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #5B4BE6 55%, #8E7BFF 100%)" }}>
            {icon}
          </div>
        )}
        <div>
          <h1 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: "clamp(20px,4vw,28px)", fontWeight: 700 }} className="text-neutral-900 dark:text-white leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-neutral-500 dark:text-neutral-400 mt-0.5" style={{ fontSize: 14 }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Logo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" stroke="#5B4BE6" strokeWidth="2" />
        <circle cx="16" cy="16" r="4" fill="#FF9E45" />
        <path d="M3 20 L9 20 L11 14 L14 24 L17 12 L20 22 L23 20 L29 20" stroke="#FF9E45" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-neutral-900 dark:text-white tracking-tight font-bold" style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 19 }}>
        FitLearn
      </span>
    </div>
  );
}
