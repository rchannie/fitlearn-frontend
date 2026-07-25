import { motion } from "motion/react";
import { Keyboard, MousePointer, MousePointerClick, Activity as ActivityIcon, Coffee, Pause, Zap, Moon } from "lucide-react";
import { Card, StatusPill } from "./shared";
import { useWorkSession } from "../context/WorkSessionProvider";
import { useT } from "../i18n/LanguageProvider";

/**
 * ActivityMonitor — halaman pengganti "Mata & Gestur".
 *
 * Menampilkan aktivitas input NYATA selama mode kerja:
 *   - jumlah tuts keyboard yang diketik
 *   - jumlah gerakan mouse + klik
 *   - kecepatan ketik (ketik/menit) & rasio aktif
 *   - status fokus saat ini (normal / sibuk / menjauh / idle)
 *
 * Logikanya ada di useActivityMonitor (via WorkSessionProvider); halaman ini
 * murni panel pemantauan. Saran istirahat & "masih fokus?" muncul otomatis
 * sebagai modal/notifikasi global.
 */

const STATUS_META = {
  idle:   { Icon: Pause, key: "activity.statusIdle",   tone: "inactive", ring: "text-neutral-400" },
  normal: { Icon: ActivityIcon, key: "activity.statusNormal", tone: "normal",   ring: "text-accent" },
  busy:   { Icon: Zap, key: "activity.statusBusy",     tone: "warning",  ring: "text-warning" },
  away:   { Icon: Moon, key: "activity.statusAway",     tone: "alert",    ring: "text-danger" },
};

function StatTile({ icon, label, value, sub }) {
  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3">
      <div className="w-10 h-10 rounded-xl bg-accent/10 text-primary dark:text-accent flex items-center justify-center">
        {icon}
      </div>
      <div className="mt-3 text-neutral-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600 }}>
        {value}
      </div>
      <div className="text-neutral-700 dark:text-neutral-200 font-semibold text-sm mt-0.5">{label}</div>
      {sub && <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

export function ActivityMonitor() {
  const { t } = useT();
  const { active, activity } = useWorkSession();

  const s = activity || { keystrokes: 0, mouseMoves: 0, clicks: 0, keysPerMin: 0, activeRatio: 0, status: "idle", lastInputAgo: 0 };
  const meta = STATUS_META[active ? s.status : "idle"] || STATUS_META.idle;
  const StatusIcon = meta.Icon;
  const activePct = Math.round((s.activeRatio || 0) * 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(20px,4vw,28px)", fontWeight: 600 }} className="text-neutral-900 dark:text-white">
            {t("activity.title")}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1" style={{ fontSize: 14 }}>
            {active ? t("activity.subActive") : t("activity.subIdle")}
          </p>
        </div>
        <StatusPill status={active ? "normal" : "inactive"} label={active ? t("activity.sessionOn") : t("activity.sessionOff")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">

        {/* Status fokus saat ini */}
        <Card className="p-5 xl:col-span-1">
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600 }} className="text-neutral-900 dark:text-white">
            {t("activity.focusStatus")}
          </h3>
          <div className="mt-4 flex flex-col items-center text-center">
            <motion.div
              animate={active ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 2.4, repeat: Infinity }}
              className={`w-24 h-24 rounded-3xl bg-accent/10 border border-accent/25 grid place-items-center ${meta.ring}`}
            >
              <StatusIcon size={44} />
            </motion.div>
            <div className="mt-4 text-neutral-900 dark:text-white font-semibold text-lg">
              {t(meta.key)}
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1 max-w-[16rem]">
              {active ? t(`${meta.key}Hint`) : t("activity.statusIdleHint")}
            </p>
            {active && (
              <div className="mt-3 text-neutral-400 dark:text-neutral-500 text-xs">
                {s.lastInputAgo > 1
                  ? t("activity.lastInput", { sec: s.lastInputAgo })
                  : t("activity.lastInputNow")}
              </div>
            )}
          </div>
        </Card>

        {/* Hitungan input */}
        <Card className="p-5 xl:col-span-2">
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600 }} className="text-neutral-900 dark:text-white mb-4">
            {t("activity.inputCounts")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile icon={<Keyboard size={20} />}            label={t("activity.keystrokes")} value={s.keystrokes.toLocaleString()} sub={t("activity.keysPerMin", { n: s.keysPerMin })} />
            <StatTile icon={<MousePointer size={20} />}        label={t("activity.mouseMoves")} value={s.mouseMoves.toLocaleString()} />
            <StatTile icon={<MousePointerClick size={20} />}   label={t("activity.clicks")}     value={s.clicks.toLocaleString()} />
          </div>

          {/* Rasio aktif */}
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-neutral-500 dark:text-neutral-400">{t("activity.activeRatio")}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-neutral-800 dark:text-white font-semibold">{activePct}%</span>
            </div>
            <div className="h-2 rounded-full bg-accent/15 overflow-hidden">
              <motion.div
                className={`h-full ${activePct > 70 ? "bg-warning" : "bg-accent"}`}
                animate={{ width: `${activePct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-2">{t("activity.activeRatioHint")}</p>
          </div>
        </Card>
      </div>

      {/* Cara kerja */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Coffee size={16} className="text-accent" />
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{t("activity.howTitle")}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 bg-warning/8 border border-warning/25">
            <div className="flex items-center gap-2 text-warning font-semibold text-sm"><Zap size={15} /> {t("activity.ruleBusyTitle")}</div>
            <p className="text-neutral-600 dark:text-neutral-300 text-xs mt-1.5 leading-relaxed">{t("activity.ruleBusyBody")}</p>
          </div>
          <div className="rounded-2xl p-4 bg-accent/8 border border-accent/25">
            <div className="flex items-center gap-2 text-primary dark:text-accent font-semibold text-sm"><Moon size={15} /> {t("activity.ruleIdleTitle")}</div>
            <p className="text-neutral-600 dark:text-neutral-300 text-xs mt-1.5 leading-relaxed">{t("activity.ruleIdleBody")}</p>
          </div>
        </div>
        {!active && (
          <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-4">{t("activity.startHint")}</p>
        )}
      </Card>
    </div>
  );
}

export default ActivityMonitor;
