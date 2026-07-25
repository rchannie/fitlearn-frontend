import { motion, AnimatePresence } from "motion/react";
import { Brain, Eye, Activity, AlertTriangle, Coffee, Keyboard, MousePointerClick } from "lucide-react";
import { PrimaryButton, GhostButton } from "./shared";
import { useT } from "../i18n/LanguageProvider";

// Tiap alasan punya ikon + pesan spesifik.
const REASONS = {
  posture:     { key: "focus.reasonPosture",     Icon: Activity },
  eye:         { key: "focus.reasonEye",         Icon: Eye },
  tension:     { key: "focus.reasonTension",     Icon: Brain },
  distraction: { key: "focus.reasonDistraction", Icon: AlertTriangle },
  overactive:  { key: "focus.reasonOveractive",  Icon: Keyboard },
  inactive:    { key: "focus.reasonInactive",    Icon: MousePointerClick },
};

/**
 * FocusModal — muncul otomatis saat WorkSessionProvider mendeteksi
 * pengguna kurang fokus. Tombol: "Lanjut fokus" (tutup) / "Istirahat sebentar".
 */
export function FocusModal({ open, reason, onDismiss, onTakeBreak }) {
  const { t } = useT();
  const r = REASONS[reason] || REASONS.tension;
  const Icon = r.Icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-surface-dark p-7 shadow-2xl border border-white/10 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mx-auto w-16 h-16 rounded-3xl bg-linear-to-br from-accent/20 to-accent/5 border border-accent/30 grid place-items-center text-accent"
            >
              <Icon size={30} />
            </motion.div>

            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 600 }} className="text-neutral-900 dark:text-white mt-5">
              {t("focus.title")}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mt-2 text-sm leading-relaxed">{t(r.key)}</p>
            <p className="text-neutral-400 dark:text-neutral-500 mt-1.5 text-xs leading-relaxed">{t("focus.body")}</p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <PrimaryButton onClick={onDismiss} className="flex-1">{t("focus.keepFocus")}</PrimaryButton>
              <GhostButton onClick={onTakeBreak} className="flex-1">
                <span className="inline-flex items-center justify-center gap-2"><Coffee size={15} /> {t("focus.takeBreak")}</span>
              </GhostButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FocusModal;
