import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { useT } from "../i18n/LanguageProvider";

const steps = [
  { titleKey: "onboarding.step1Title", bodyKey: "onboarding.step1Body", target: { top: "72px", right: "32px", width: "340px" }, arrow: "top" },
  { titleKey: "onboarding.step2Title", bodyKey: "onboarding.step2Body", target: { top: "100px", left: "32px", width: "320px" }, arrow: "top" },
  { titleKey: "onboarding.step3Title", bodyKey: "onboarding.step3Body", target: { top: "300px", left: "32px", width: "calc(100% - 64px)" }, arrow: "top" },
  { titleKey: "onboarding.step4Title", bodyKey: "onboarding.step4Body", target: { top: "440px", left: "32px", width: "calc(100% - 64px)" }, arrow: "top" },
  { titleKey: "onboarding.step5Title", bodyKey: "onboarding.step5Body", target: { bottom: "32px", left: "32px", width: "calc(100% - 64px)" }, arrow: "bottom" },
];

export function Onboarding({ onClose }) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const s = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] pointer-events-auto"
      />
      <motion.div
        key={`tip-${step}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="fixed z-50"
        style={s.target}
      >
        <div className="relative rounded-2xl bg-white dark:bg-surface-dark border border-accent/30 shadow-2xl p-5 max-w-sm">
          <div className="flex items-start justify-between">
            <span className="px-2 py-0.5 rounded-md bg-accent/15 text-primary dark:text-accent" style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {step + 1} / {steps.length}
            </span>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
              <X size={16} />
            </button>
          </div>
          <h4 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 17, fontWeight: 700 }} className="text-neutral-900 dark:text-white mt-3">
            {t(s.titleKey)}
          </h4>
          <p className="text-neutral-500 mt-1.5" style={{ fontSize: 13.5, lineHeight: 1.55 }}>{t(s.bodyKey)}</p>
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-accent" : "w-1.5 bg-neutral-300 dark:bg-white/15"}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-white" style={{ fontSize: 12.5 }}>
                {t("onboarding.skip")}
              </button>
              <button
                onClick={() => (step === steps.length - 1 ? onClose() : setStep(step + 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-white transition"
                style={{ fontSize: 12.5, fontWeight: 600 }}
              >
                {step === steps.length - 1 ? t("onboarding.gotIt") : t("onboarding.next")} {step !== steps.length - 1 && <ArrowRight size={12} />}
              </button>
            </div>
          </div>
          <span className="absolute -top-1.5 left-10 w-3 h-3 rotate-45 bg-white dark:bg-surface-dark border-l border-t border-accent/30" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
