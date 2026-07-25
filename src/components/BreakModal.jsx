import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Eye, Activity, Footprints, X, CheckCircle2, Play, RotateCcw, Pause } from "lucide-react";
import { PrimaryButton, GhostButton } from "./shared";
import { useT } from "../i18n/LanguageProvider";
import { useBreakSession } from "../context/BreakSessionProvider";
import { useBreakDuration } from "../lib/breakPrefs";

const options = [
  { icon: <Eye size={20} />, titleKey: "breakModal.optEyeTitle", descKey: "breakModal.optEyeDesc" },
  { icon: <Activity size={20} />, titleKey: "breakModal.optStretchTitle", descKey: "breakModal.optStretchDesc" },
  { icon: <Footprints size={20} />, titleKey: "breakModal.optWalkTitle", descKey: "breakModal.optWalkDesc" },
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Pemilih durasi bebas 1–60 menit (dipakai di fase setup & done). */
function DurationStepper({ minutes, value, onChange, label, t }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-neutral-500 dark:text-neutral-400 text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(String(Math.max(1, minutes - 1)))}
          className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 text-lg font-semibold transition"
          aria-label="-1"
        >−</button>
        <div className="flex items-end gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/10">
          <input
            type="number"
            min={1}
            max={60}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 bg-transparent text-center text-neutral-900 dark:text-white focus:outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 600 }}
          />
          <span className="text-neutral-400 text-sm pb-1.5">{t("breakModal.min")}</span>
        </div>
        <button
          onClick={() => onChange(String(Math.min(60, minutes + 1)))}
          className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 text-lg font-semibold transition"
          aria-label="+1"
        >+</button>
      </div>
    </div>
  );
}

/**
 * BreakModal — tampilan alur istirahat. Semua state (timer, fase, durasi)
 * dimiliki BreakSessionProvider; komponen ini hanya merender sesuai fase:
 *
 *   setup   → atur durasi + tombol "Mulai istirahat"
 *   running → hitung mundur berjalan (boyleh ditutup; lanjut di navbar)
 *   done    → "waktu istirahat habis" → kembali kerja / lanjut istirahat
 */
export function BreakModal({ open }) {
  const { t } = useT();
  const [, setSavedMinutes] = useBreakDuration();
  const {
    phase, minutes, secondsLeft,
    chooseMinutes, startTimer, extendBreak, backToWork, cancelBreak, hideModal,
  } = useBreakSession();

  // Buffer string untuk input (boleh kosong saat mengetik). null = pakai nilai
  // `minutes` dari provider sebagai sumber kebenaran.
  const [typed, setTyped] = useState(null);
  const custom = typed ?? String(minutes);
  const total = minutes * 60;
  const pct = total > 0 ? secondsLeft / total : 0;

  // Ubah durasi (input bebas 1–60) → simpan default + set timer setup.
  const applyMinutes = (raw) => {
    setTyped(raw);
    const n = Math.min(60, Math.max(1, Math.round(Number(raw) || 0)));
    if (Number(raw) >= 1) { chooseMinutes(n); setSavedMinutes(n); }
  };

  const done = phase === "done";
  const running = phase === "running";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-surface-dark p-8 shadow-2xl border border-white/10"
          >
            {/* X: saat running → sembunyikan (timer lanjut di navbar); else batalkan */}
            <button
              onClick={running ? hideModal : cancelBreak}
              className="absolute top-5 right-5 w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 flex items-center justify-center text-neutral-500"
            >
              <X size={16} />
            </button>

            {done ? (
              /* ── Layar "waktu istirahat habis" ── */
              <div className="flex flex-col items-center text-center py-4">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="w-20 h-20 rounded-3xl bg-linear-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center text-accent"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h2 style={{ fontFamily: "'Baloo 2', 'Baloo 2', 'Sora', sans-serif", fontSize: 26, fontWeight: 600 }} className="text-neutral-900 dark:text-white mt-5">
                  {t("breakModal.timeUpTitle")}
                </h2>
                <p className="text-neutral-500 mt-2 max-w-sm" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {t("breakModal.timeUpBody")}
                </p>

                {/* Atur durasi untuk "lanjut istirahat" */}
                <div className="mt-5">
                  <DurationStepper minutes={minutes} value={custom} onChange={applyMinutes} label={t("breakModal.extendDuration")} t={t} />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full sm:w-auto">
                  <PrimaryButton onClick={backToWork} className="flex-1 sm:px-8">
                    <span className="inline-flex items-center justify-center gap-2"><Play size={15} /> {t("breakModal.backToWork")}</span>
                  </PrimaryButton>
                  <GhostButton onClick={extendBreak} className="flex-1 sm:px-8">
                    <span className="inline-flex items-center justify-center gap-2"><RotateCcw size={15} /> {t("breakModal.extendBreak", { min: minutes })}</span>
                  </GhostButton>
                </div>
              </div>
            ) : running ? (
              /* ── Timer berjalan ── */
              <div className="flex flex-col items-center text-center py-2">
                <div className="relative w-44 h-44">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" stroke="currentColor" className="text-neutral-200 dark:text-white/10" strokeWidth="8" fill="none" />
                    <motion.circle
                      cx="60" cy="60" r="52" stroke="#FF9E45" strokeWidth="8" fill="none" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - pct) }}
                      transition={{ ease: "linear", duration: 0.9 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 34, fontWeight: 600 }} className="text-neutral-900 dark:text-white tabular-nums">
                      {fmt(secondsLeft)}
                    </span>
                    <span className="text-neutral-400 text-xs mt-0.5">{t("breakModal.remaining")}</span>
                  </div>
                </div>
                <h2 style={{ fontFamily: "'Baloo 2', 'Baloo 2', 'Sora', sans-serif", fontSize: 22, fontWeight: 600 }} className="text-neutral-900 dark:text-white mt-5">
                  {t("breakModal.runningTitle")}
                </h2>
                <p className="text-neutral-500 mt-2 max-w-sm" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {t("breakModal.runningBody")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full sm:w-auto">
                  <GhostButton onClick={hideModal} className="flex-1 sm:px-6">
                    <span className="inline-flex items-center justify-center gap-2"><Pause size={15} /> {t("breakModal.minimize")}</span>
                  </GhostButton>
                  <PrimaryButton onClick={backToWork} className="flex-1 sm:px-6">
                    <span className="inline-flex items-center justify-center gap-2"><Play size={15} /> {t("breakModal.backToWork")}</span>
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              /* ── Setup: pilih durasi + mulai ── */
              <>
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="w-20 h-20 rounded-3xl bg-linear-to-br from-warning/20 to-warning/5 border border-warning/30 flex items-center justify-center text-warning"
                  >
                    <Clock size={40} />
                  </motion.div>
                  <h2 style={{ fontFamily: "'Baloo 2', 'Baloo 2', 'Sora', sans-serif", fontSize: 26, fontWeight: 600 }} className="text-neutral-900 dark:text-white mt-5">
                    {t("breakModal.title")}
                  </h2>
                  <p className="text-neutral-500 mt-2 max-w-sm" style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {t("breakModal.bodyPaused")}
                  </p>
                </div>

                {/* Durasi — input bebas 1–60 menit */}
                <div className="mt-6 flex flex-col items-center gap-2">
                  <DurationStepper minutes={minutes} value={custom} onChange={applyMinutes} label={t("breakModal.setDuration")} t={t} />
                  <span className="text-neutral-400 dark:text-neutral-500 text-xs">≈ {fmt(minutes * 60)} {t("breakModal.minutesShort")}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                  {options.map((o, i) => (
                    <div key={i} className="text-left p-4 rounded-2xl border border-neutral-200 dark:border-white/10">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-accent/10 text-primary dark:text-accent">
                        {o.icon}
                      </div>
                      <div className="text-neutral-900 dark:text-white" style={{ fontSize: 14, fontWeight: 600 }}>{t(o.titleKey)}</div>
                      <div className="text-neutral-500 mt-0.5" style={{ fontSize: 12, lineHeight: 1.5 }}>{t(o.descKey)}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-7">
                  <PrimaryButton onClick={startTimer} className="flex-1">
                    <span className="inline-flex items-center justify-center gap-2"><Play size={15} /> {t("breakModal.startNow")}</span>
                  </PrimaryButton>
                  <GhostButton onClick={backToWork} className="flex-1">{t("breakModal.skipToWork")}</GhostButton>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BreakModal;
